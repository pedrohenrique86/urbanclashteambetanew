const { query } = require("../config/database");
const redisClient = require("../config/redisClient");

/**
 * CatalogService
 * 
 * Centraliza o carregamento e cache de dados estáticos (Itens, Roubos, Tarefas).
 * Reduz a carga no PostgreSQL eliminando queries repetitivas em tabelas que mudam raramente.
 */
class CatalogService {
  constructor() {
    this.CACHE_KEY_ITEMS = "catalog:items";
    this.TTL = 3600; // 1 hora
  }

  /**
   * Obtém todos os itens do catálogo, com cache no Redis.
   */
  async getItems() {
    if (!redisClient.client.isReady) {
      const { rows } = await query("SELECT * FROM items ORDER BY base_price ASC");
      return rows;
    }

    const cached = await redisClient.getAsync(this.CACHE_KEY_ITEMS);
    if (cached) return JSON.parse(cached);

    console.log("[Catalog] 📦 Cache MISS para itens. Carregando do Banco...");
    const { rows } = await query(`
      SELECT 
        id, code, name, description, type, rarity, base_price,
        base_attack_bonus, base_defense_bonus, base_focus_bonus
      FROM items 
      ORDER BY base_price ASC
    `);

    await redisClient.setAsync(this.CACHE_KEY_ITEMS, JSON.stringify(rows), "EX", this.TTL);
    return rows;
  }

  /**
   * Busca um item específico pelo código.
   */
  async getItemByCode(code) {
    const items = await this.getItems();
    return items.find(i => i.code === code) || null;
  }

  /**
   * Invalida o cache (útil após atualizações administrativas).
   */
  async invalidateCache() {
    await redisClient.delAsync(this.CACHE_KEY_ITEMS);
  }
}

module.exports = new CatalogService();
