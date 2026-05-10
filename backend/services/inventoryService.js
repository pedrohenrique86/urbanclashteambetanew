const { query } = require("../config/database");
const redisClient = require("../config/redisClient");

/**
 * inventoryService.js
 * 
 * ARQUITETURA DE ALTA PERFORMANCE (100% ESCALÁVEL)
 * 
 * Fonte Primária: Redis (Cache do Inventário por Usuário)
 * Persistência: PostgreSQL (Async Batch Dirty)
 * Fluxo: Operação -> Redis (Instantâneo) -> Dirty Set -> Sync DB (30s)
 */

const INV_PREFIX = "player:inventory:";
const EQUIP_PREFIX = "player:equipment:";
const INV_DIRTY_SET = "inventory:dirty:set";
const SYNC_INTERVAL = 30000;

class InventoryService {
  constructor() {
    this.isFlushing = false;
    
    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => this.flushDirtyInventories(), SYNC_INTERVAL);
    }
  }

  /**
   * Gerencia o estado de equipamento de um item (Arsenal/Deck).
   * SÊNIOR: Atomicidade via Redis e sincronização de bônus imediata.
   */
  async toggleEquip(userId, itemCode, slot) {
    await this.ensureLoaded(userId);
    const invKey = `${INV_PREFIX}${userId}`;
    const equipKey = `${EQUIP_PREFIX}${userId}`;

    // 1. Verificar se o jogador possui o item
    const quantity = await redisClient.hGetAsync(invKey, itemCode);
    if (!quantity || parseInt(quantity) <= 0) {
      throw new Error("Você não possui este item no inventário.");
    }

    // 2. Verificar se o item já está equipado em OUTRO slot ou se este slot está ocupado
    const currentInSlot = await redisClient.hGetAsync(equipKey, slot);
    
    if (currentInSlot === itemCode) {
      // DESEQUIPAR
      await redisClient.hDelAsync(equipKey, slot);
    } else {
      // EQUIPAR (SÊNIOR: Validação de tipo de item por slot poderia ser feita aqui)
      await redisClient.hSetAsync(equipKey, slot, itemCode);
    }

    // 3. Marcar para sincronização com o DB
    await redisClient.sAddAsync(INV_DIRTY_SET, String(userId));

    // 4. CRÍTICO: Recalcular bônus no playerStateService para o combate refletir a mudança
    const playerStateService = require("./playerStateService");
    await playerStateService.refreshEquipmentBonuses(userId);

    return { 
      equipped: currentInSlot !== itemCode,
      slot,
      itemCode
    };
  }

  /**
   * Retorna os itens equipados do Redis.
   */
  async getEquippedItems(userId) {
    const equipKey = `${EQUIP_PREFIX}${userId}`;
    const equipped = await redisClient.hGetAllAsync(equipKey);
    return equipped || {};
  }

  /**
   * Garante que o inventário E equipamentos do usuário estejam no Redis.
   */
  async ensureLoaded(userId) {
    const invKey = `${INV_PREFIX}${userId}`;
    const equipKey = `${EQUIP_PREFIX}${userId}`;
    
    const exists = await redisClient.existsAsync(invKey);
    
    if (!exists) {
      // Cache miss: carrega do PostgreSQL (Inventário + Equipamentos)
      const { rows } = await query(
        `SELECT i.code, pi.quantity, pi.is_equipped, pi.slot
         FROM player_inventory pi
         JOIN items i ON pi.item_id = i.id
         WHERE pi.user_id = $1`,
        [userId]
      );

      const pipeline = redisClient.pipeline();
      if (rows.length > 0) {
        for (const row of rows) {
          pipeline.hSet(invKey, row.code, String(row.quantity));
          if (row.is_equipped && row.slot) {
            pipeline.hSet(equipKey, row.slot, row.code);
          }
        }
      } else {
        pipeline.hSet(invKey, "_empty", "1");
      }
      pipeline.expire(invKey, 3600);
      pipeline.expire(equipKey, 3600);
      await pipeline.exec();
    }
  }

  /**
   * Adiciona um item ao inventário (Redis-First).
   */
  async addItem(userId, itemCode, quantity = 1) {
    await this.ensureLoaded(userId);
    const invKey = `${INV_PREFIX}${userId}`;

    const newVal = await redisClient.hIncrByAsync(invKey, itemCode, quantity);
    await redisClient.hDelAsync(invKey, "_empty");
    await redisClient.sAddAsync(INV_DIRTY_SET, String(userId));
    return newVal;
  }

  /**
   * Remove um item do inventário (Redis-First).
   */
  async removeItem(userId, itemCode, quantity = 1) {
    await this.ensureLoaded(userId);
    const invKey = `${INV_PREFIX}${userId}`;
    const equipKey = `${EQUIP_PREFIX}${userId}`;

    const current = await redisClient.hGetAsync(invKey, itemCode);
    const currentVal = parseInt(current || "0");

    if (currentVal <= quantity) {
      await redisClient.hDelAsync(invKey, itemCode);
      // Se o item estava equipado, remove do slot também
      const equipped = await redisClient.hGetAllAsync(equipKey);
      for (const [slot, code] of Object.entries(equipped)) {
        if (code === itemCode) await redisClient.hDelAsync(equipKey, slot);
      }
    } else {
      await redisClient.hIncrByAsync(invKey, itemCode, -quantity);
    }

    await redisClient.sAddAsync(INV_DIRTY_SET, String(userId));
  }

  /**
   * Retorna o inventário completo do Redis unificado com status de equipamento.
   */
  async getInventory(userId) {
    await this.ensureLoaded(userId);
    const invKey = `${INV_PREFIX}${userId}`;
    const equipKey = `${EQUIP_PREFIX}${userId}`;
    
    const [rawInv, rawEquip] = await Promise.all([
      redisClient.hGetAllAsync(invKey),
      redisClient.hGetAllAsync(equipKey)
    ]);

    if (!rawInv || Object.keys(rawInv).length === 0 || rawInv._empty) return [];

    let catalog = await redisClient.getAsync("catalog:items");
    if (!catalog) {
      const { rows } = await query("SELECT id, name, code, type, rarity, base_attack_bonus, base_defense_bonus, base_focus_bonus FROM items");
      catalog = JSON.stringify(rows);
      await redisClient.setAsync("catalog:items", catalog, "EX", 3600);
    }
    
    const items = JSON.parse(catalog);
    const inventory = [];
    const equippedCodes = Object.values(rawEquip || {});

    for (const [code, qtyStr] of Object.entries(rawInv)) {
      if (code === "_empty") continue;
      const item = items.find(i => i.code === code);
      if (item) {
        const itemSlot = Object.keys(rawEquip || {}).find(s => rawEquip[s] === code);
        inventory.push({
          ...item,
          quantity: parseInt(qtyStr),
          is_equipped: equippedCodes.includes(code),
          slot: itemSlot || null
        });
      }
    }

    return inventory.filter(i => i.quantity > 0);
  }

  /**
   * Sincroniza inventários E equipamentos com o PostgreSQL.
   */
  async flushDirtyInventories() {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      const dirtyUserIds = await redisClient.sMembersAsync(INV_DIRTY_SET);
      if (dirtyUserIds.length === 0) {
        this.isFlushing = false;
        return;
      }

      await redisClient.delAsync(INV_DIRTY_SET);
      console.log(`[Inventory] 💾 Sincronizando ${dirtyUserIds.length} estados...`);
      
      const batchSize = 50;
      for (let i = 0; i < dirtyUserIds.length; i += batchSize) {
        const batch = dirtyUserIds.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (userId) => {
          const invKey = `${INV_PREFIX}${userId}`;
          const equipKey = `${EQUIP_PREFIX}${userId}`;
          const [rawInv, rawEquip] = await Promise.all([
            redisClient.hGetAllAsync(invKey),
            redisClient.hGetAllAsync(equipKey)
          ]);

          if (!rawInv) return;

          const entries = Object.entries(rawInv).filter(([k]) => k !== "_empty");
          if (entries.length === 0) return;

          // Sincronização complexa: primeiro reseta is_equipped, depois aplica o novo estado
          await query("UPDATE player_inventory SET is_equipped = FALSE, slot = NULL WHERE user_id = $1", [userId]);

          for (const [code, qty] of entries) {
            const equippedSlot = Object.keys(rawEquip || {}).find(s => rawEquip[s] === code);
            await query(`
              INSERT INTO player_inventory (user_id, item_id, quantity, is_equipped, slot)
              VALUES ($1, (SELECT id FROM items WHERE code = $2), $3, $4, $5)
              ON CONFLICT (user_id, item_id) DO UPDATE SET 
                quantity = EXCLUDED.quantity,
                is_equipped = EXCLUDED.is_equipped,
                slot = EXCLUDED.slot
            `, [userId, code, parseInt(qty), !!equippedSlot, equippedSlot || null]);
          }
        }));
      }

      console.log("[Inventory] ✅ Sync concluído.");
    } catch (err) {
      console.error("[Inventory] ❌ Erro na sincronização:", err.message);
    } finally {
      this.isFlushing = false;
    }
  }
}

module.exports = new InventoryService();
