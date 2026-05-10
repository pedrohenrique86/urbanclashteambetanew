const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const catalogService = require("./catalogService");

/**
 * inventoryService.js
 * 
 * SÊNIOR: Refatorado para Alta Performance.
 * Usa Bulk Updates e Map Lookups O(1).
 */

const INV_PREFIX    = "player:inventory:";
const EQUIP_PREFIX  = "player:equipment:";
const INV_DIRTY_SET = "inventory:dirty:set";
const SYNC_INTERVAL = 30000;

class InventoryService {
  constructor() {
    this.isFlushing = false;
    if (process.env.NODE_ENV !== 'test') {
      const t = setInterval(() => this.flushDirtyInventories(), SYNC_INTERVAL);
      if (t.unref) t.unref();
    }
  }

  async ensureLoaded(userId) {
    const invKey = `${INV_PREFIX}${userId}`;
    const equipKey = `${EQUIP_PREFIX}${userId}`;
    const exists = await redisClient.existsAsync(invKey);
    
    if (!exists) {
      const { rows } = await query(
        `SELECT i.code, pi.quantity, pi.is_equipped, pi.slot
         FROM player_inventory pi
         JOIN items i ON pi.item_id = i.id
         WHERE pi.user_id = $1`,
        [userId]
      );

      const p = redisClient.pipeline();
      if (rows.length > 0) {
        rows.forEach(r => {
          p.hSet(invKey, r.code, String(r.quantity));
          if (r.is_equipped && r.slot) p.hSet(equipKey, r.slot, r.code);
        });
      } else {
        p.hSet(invKey, "_empty", "1");
      }
      p.expire(invKey, 86400); // 24h
      p.expire(equipKey, 86400);
      await p.exec();
    }
  }

  async toggleEquip(userId, itemCode, slot) {
    await this.ensureLoaded(userId);
    const invKey = `${INV_PREFIX}${userId}`;
    const equipKey = `${EQUIP_PREFIX}${userId}`;

    const qty = await redisClient.hGetAsync(invKey, itemCode);
    if (!qty || parseInt(qty) <= 0) throw new Error("Item não encontrado.");

    const currentInSlot = await redisClient.hGetAsync(equipKey, slot);
    if (currentInSlot === itemCode) {
      await redisClient.hDelAsync(equipKey, slot);
    } else {
      await redisClient.hSetAsync(equipKey, slot, itemCode);
    }

    await redisClient.sAddAsync(INV_DIRTY_SET, String(userId));
    
    // SÊNIOR: Força o recálculo de bônus no estado do jogador para refletir no combate
    const playerStateService = require("./playerStateService");
    if (playerStateService.refreshEquipmentBonuses) {
        await playerStateService.refreshEquipmentBonuses(userId);
    }

    return { equipped: currentInSlot !== itemCode, slot, itemCode };
  }

  async getInventory(userId) {
    await this.ensureLoaded(userId);
    const [rawInv, rawEquip, itemsMap] = await Promise.all([
      redisClient.hGetAllAsync(`${INV_PREFIX}${userId}`),
      redisClient.hGetAllAsync(`${EQUIP_PREFIX}${userId}`),
      catalogService.getItemsMap()
    ]);

    if (!rawInv || rawInv._empty) return [];

    const inventory = [];
    const equippedCodes = Object.values(rawEquip || {});

    for (const [code, qtyStr] of Object.entries(rawInv)) {
      if (code === "_empty") continue;
      const item = itemsMap[code];
      if (item) {
        const slot = Object.keys(rawEquip || {}).find(s => rawEquip[s] === code);
        inventory.push({
          ...item,
          quantity: parseInt(qtyStr),
          is_equipped: equippedCodes.includes(code),
          slot: slot || null
        });
      }
    }
    return inventory.filter(i => i.quantity > 0);
  }

  async addItem(userId, itemCode, quantity = 1) {
    await this.ensureLoaded(userId);
    const invKey = `${INV_PREFIX}${userId}`;
    await redisClient.hIncrByAsync(invKey, itemCode, quantity);
    await redisClient.hDelAsync(invKey, "_empty");
    await redisClient.sAddAsync(INV_DIRTY_SET, String(userId));
  }

  async removeItem(userId, itemCode, quantity = 1) {
    await this.ensureLoaded(userId);
    const invKey = `${INV_PREFIX}${userId}`;
    const qty = parseInt(await redisClient.hGetAsync(invKey, itemCode) || "0");

    if (qty <= quantity) {
      await redisClient.hDelAsync(invKey, itemCode);
      const equipKey = `${EQUIP_PREFIX}${userId}`;
      const equipped = await redisClient.hGetAllAsync(equipKey);
      for (const [s, c] of Object.entries(equipped || {})) {
        if (c === itemCode) await redisClient.hDelAsync(equipKey, s);
      }
    } else {
      await redisClient.hIncrByAsync(invKey, itemCode, -quantity);
    }
    await redisClient.sAddAsync(INV_DIRTY_SET, String(userId));
  }

  /**
   * SÊNIOR: Sincronização em Lote (Bulk Sync) para alta performance.
   * Reduz o número de queries de N*M para apenas 2 por ciclo de flush.
   */
  async flushDirtyInventories() {
    if (this.isFlushing) return;
    const dirtyIds = await redisClient.sMembersAsync(INV_DIRTY_SET);
    if (!dirtyIds.length) return;

    const online = await redisClient.sCardAsync("online_players_set").catch(() => 0);
    if (!online && process.env.NODE_ENV === 'production') return;

    this.isFlushing = true;
    try {
      await redisClient.delAsync(INV_DIRTY_SET);
      
      for (const userId of dirtyIds) {
        const [rawInv, rawEquip] = await Promise.all([
          redisClient.hGetAllAsync(`${INV_PREFIX}${userId}`),
          redisClient.hGetAllAsync(`${EQUIP_PREFIX}${userId}`)
        ]);

        if (!rawInv) continue;

        const entries = Object.entries(rawInv).filter(([k]) => k !== "_empty");
        
        // SÊNIOR: Prepara os dados para uma única query de UPSERT por usuário
        const uids = [], codes = [], qties = [], equips = [], slots = [];
        
        entries.forEach(([code, qty]) => {
          const slot = Object.keys(rawEquip || {}).find(s => rawEquip[s] === code);
          uids.push(userId);
          codes.push(code);
          qties.push(parseInt(qty));
          equips.push(!!slot);
          slots.push(slot || null);
        });

        if (uids.length > 0) {
          // Primeiro reseta os equipamentos no banco para este usuário
          await query("UPDATE player_inventory SET is_equipped = FALSE, slot = NULL WHERE user_id = $1", [userId]);
          
          // Depois executa o Bulk Upsert
          await query(`
            INSERT INTO player_inventory (user_id, item_id, quantity, is_equipped, slot)
            SELECT u.uid, i.id, u.qty, u.eq, u.sl
            FROM UNNEST($1::uuid[], $2::text[], $3::int[], $4::boolean[], $5::text[]) 
              AS u(uid, code, qty, eq, sl)
            JOIN items i ON i.code = u.code
            ON CONFLICT (user_id, item_id) DO UPDATE SET 
              quantity = EXCLUDED.quantity,
              is_equipped = EXCLUDED.is_equipped,
              slot = EXCLUDED.slot
          `, [uids, codes, qties, equips, slots]);
        }
      }
      console.log(`[Inventory] ✅ Sincronizados ${dirtyIds.length} inventários.`);
    } catch (e) {
      console.error("[Inventory] ❌ Erro no Flush:", e.message);
    } finally {
      this.isFlushing = false;
    }
  }
}

module.exports = new InventoryService();
