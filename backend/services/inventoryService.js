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
const INV_DIRTY_SET = "inventory:dirty:set";
const SYNC_INTERVAL = 30000; // 30 segundos para inventário (menos crítico que financeiro)

class InventoryService {
  constructor() {
    this.isFlushing = false;
    
    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => this.flushDirtyInventories(), SYNC_INTERVAL);
    }
  }

  /**
   * Garante que o inventário do usuário esteja no Redis.
   */
  async ensureLoaded(userId) {
    const redisKey = `${INV_PREFIX}${userId}`;
    const exists = await redisClient.existsAsync(redisKey);
    
    if (!exists) {
      // Cache miss: carrega do PostgreSQL
      const { rows } = await query(
        `SELECT i.code, pi.quantity 
         FROM player_inventory pi
         JOIN items i ON pi.item_id = i.id
         WHERE pi.user_id = $1`,
        [userId]
      );

      const pipeline = redisClient.pipeline();
      if (rows.length > 0) {
        for (const row of rows) {
          pipeline.hSet(redisKey, row.code, String(row.quantity));
        }
      } else {
        // Marcamos como vazio para evitar futuros cache misses se o player não tem nada
        pipeline.hSet(redisKey, "_empty", "1");
      }
      pipeline.expire(redisKey, 3600); // 1 hora de TTL
      await pipeline.exec();
    }
  }

  /**
   * Adiciona um item ao inventário (Redis-First).
   */
  async addItem(userId, itemCode, quantity = 1) {
    await this.ensureLoaded(userId);
    const redisKey = `${INV_PREFIX}${userId}`;

    const newVal = await redisClient.hIncrByAsync(redisKey, itemCode, quantity);
    
    // Se era um inventário vazio, remove o marcador
    await redisClient.hDelAsync(redisKey, "_empty");
    
    // Marca como dirty para persistência
    await redisClient.sAddAsync(INV_DIRTY_SET, String(userId));
    
    return newVal;
  }

  /**
   * Remove um item do inventário (Redis-First).
   */
  async removeItem(userId, itemCode, quantity = 1) {
    await this.ensureLoaded(userId);
    const redisKey = `${INV_PREFIX}${userId}`;

    const current = await redisClient.hGetAsync(redisKey, itemCode);
    const currentVal = parseInt(current || "0");

    if (currentVal <= quantity) {
      await redisClient.hDelAsync(redisKey, itemCode);
    } else {
      await redisClient.hIncrByAsync(redisKey, itemCode, -quantity);
    }

    // Marca como dirty
    await redisClient.sAddAsync(INV_DIRTY_SET, String(userId));
  }

  /**
   * Retorna o inventário completo (Redis).
   */
  async getInventory(userId) {
    await this.ensureLoaded(userId);
    const redisKey = `${INV_PREFIX}${userId}`;
    
    const raw = await redisClient.hGetAllAsync(redisKey);
    if (!raw) return [];

    // Buscamos os detalhes dos itens (nomes, raridades) do cache global ou DB
    // Para simplificar e manter performance, fazemos um JOIN rápido com a tabela items
    // Mas os valores de QUANTIDADE vêm do REDIS (Fonte da Verdade)
    const { rows: itemDetails } = await query(
      "SELECT name, code, type, rarity FROM items WHERE code IN (SELECT unnest($1::text[]))",
      [Object.keys(raw)]
    );

    return itemDetails.map(item => ({
      ...item,
      quantity: parseInt(raw[item.code] || "0")
    })).filter(i => i.quantity > 0);
  }

  /**
   * Sincroniza inventários alterados com o PostgreSQL.
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

      console.log(`[Inventory] 💾 Sincronizando inventários de ${dirtyUserIds.length} usuários...`);
      await redisClient.delAsync(INV_DIRTY_SET);

      for (const userId of dirtyUserIds) {
        const redisKey = `${INV_PREFIX}${userId}`;
        const raw = await redisClient.hGetAllAsync(redisKey);
        
        if (!raw) continue;

        // Para cada usuário, fazemos uma sincronização atômica:
        // 1. Deletar inventário antigo (opcional, mas mais limpo se fizermos re-insert)
        // SÊNIOR: Usar ON CONFLICT é melhor para performance.
        
        for (const [code, qtyStr] of Object.entries(raw)) {
          if (code === "_empty") continue;
          const quantity = parseInt(qtyStr);
          
          if (quantity <= 0) {
            await query(
              "DELETE FROM player_inventory WHERE user_id = $1 AND item_id = (SELECT id FROM items WHERE code = $2)",
              [userId, code]
            );
          } else {
            await query(
              `INSERT INTO player_inventory (user_id, item_id, quantity)
               VALUES ($1, (SELECT id FROM items WHERE code = $2), $3)
               ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = $3`,
              [userId, code, quantity]
            );
          }
        }
      }

      console.log("[Inventory] ✅ Sincronização concluída.");
    } catch (err) {
      console.error("[Inventory] ❌ Erro na sincronização:", err.message);
    } finally {
      this.isFlushing = false;
    }
  }
}

module.exports = new InventoryService();
