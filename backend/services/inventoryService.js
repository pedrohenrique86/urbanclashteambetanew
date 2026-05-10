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
   * Retorna o inventário completo do Redis.
   * SÊNIOR: Zero queries ao PostgreSQL no caminho feliz.
   */
  async getInventory(userId) {
    await this.ensureLoaded(userId);
    const redisKey = `${INV_PREFIX}${userId}`;
    
    const raw = await redisClient.hGetAllAsync(redisKey);
    if (!raw || Object.keys(raw).length === 0 || raw._empty) return [];

    // Tentar pegar o catálogo de itens do Redis (cache global de 1 hora)
    let catalog = await redisClient.getAsync("catalog:items");
    if (!catalog) {
      console.log("[Inventory] 📦 Cache MISS no catálogo. Carregando itens...");
      const { rows } = await query("SELECT id, name, code, type, rarity, base_attack_bonus, base_defense_bonus, base_focus_bonus FROM items");
      catalog = JSON.stringify(rows);
      await redisClient.setAsync("catalog:items", catalog, "EX", 3600);
    }
    
    const items = JSON.parse(catalog);
    const inventory = [];

    for (const [code, qtyStr] of Object.entries(raw)) {
      if (code === "_empty") continue;
      const item = items.find(i => i.code === code);
      if (item) {
        inventory.push({
          ...item,
          quantity: parseInt(qtyStr)
        });
      }
    }

    return inventory.filter(i => i.quantity > 0);
  }

  /**
   * Sincroniza inventários alterados com o PostgreSQL.
   * SÊNIOR: Otimizado para não travar o banco em escala.
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

      // SÊNIOR: Limpa o set antes para não perder alterações que ocorram durante o processamento
      await redisClient.delAsync(INV_DIRTY_SET);

      console.log(`[Inventory] 💾 Sincronizando ${dirtyUserIds.length} inventários...`);
      
      // Para 5k players, processamos em lotes de 50 usuários para não estourar a memória/conexão
      const batchSize = 50;
      for (let i = 0; i < dirtyUserIds.length; i += batchSize) {
        const batch = dirtyUserIds.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (userId) => {
          const redisKey = `${INV_PREFIX}${userId}`;
          const raw = await redisClient.hGetAllAsync(redisKey);
          if (!raw) return;

          // Sincronização por usuário (Transaction rápida)
          // Em um sistema real de 50k, usaríamos UNNEST para bulk total, 
          // mas para 5k, 1 query por user é 1000x melhor que 1 por item.
          const entries = Object.entries(raw).filter(([k]) => k !== "_empty");
          
          if (entries.length === 0) return;

          const values = [];
          const placeholders = entries.map(([code, qty], idx) => {
            values.push(userId, code, parseInt(qty));
            return `($${idx * 3 + 1}, (SELECT id FROM items WHERE code = $${idx * 3 + 2}), $${idx * 3 + 3})`;
          }).join(", ");

          await query(`
            INSERT INTO player_inventory (user_id, item_id, quantity)
            VALUES ${placeholders}
            ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = EXCLUDED.quantity
          `, values);
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
