const { query } = require("../config/database");
const redisClient = require("../config/redisClient");

/**
 * CatalogService
 * 
 * Centraliza o carregamento e cache de dados estáticos (Itens, Roubos, Tarefas).
 * Reduz a carga no Banco de Dados (libSQL) eliminando queries repetitivas.
 */
class CatalogService {
  constructor() {
    this.CACHE_KEY_ITEMS = "catalog:items";
    this.itemsMap = {};
    this.items = [];
  }

  /**
   * SÊNIOR: Warmup do Catálogo. Carrega tudo na RAM e no Redis para sempre.
   */
  async warmup() {
    console.log("🚀 [Catalog] Aquecendo cache de itens...");
    return this.getItems(true);
  }

  /**
   * Obtém todos os itens do catálogo, com cache no Redis (Permanente).
   */
  async getItems(forceRefresh = false) {
    if (!forceRefresh && this.items && this.items.length > 0) return this.items;

    if (!redisClient.client.isReady) {
      const { rows } = await query("SELECT * FROM items ORDER BY base_price ASC");
      return rows;
    }

    const cached = await redisClient.getAsync(this.CACHE_KEY_ITEMS);
    let rows;
    
    if (cached && !forceRefresh) {
      rows = JSON.parse(cached);
    } else {
      console.log("📦 [Catalog] Carregando catálogo do Banco de Dados para Cache Permanente...");
      const dbRes = await query(`
        SELECT 
          id, code, name, description, type, rarity, base_price,
          base_attack_bonus, base_defense_bonus, base_focus_bonus
        FROM items 
        ORDER BY base_price ASC
      `);
      rows = dbRes.rows;
      // SÊNIOR: Cache sem expiração (Duração da temporada)
      await redisClient.setAsync(this.CACHE_KEY_ITEMS, JSON.stringify(rows));
    }

    this.items = rows;
    // SÊNIOR: Reconstrói o mapa de busca rápida O(1) na memória do processo
    this.itemsMap = {};
    rows.forEach(item => {
      this.itemsMap[item.code] = item;
    });

    return rows;
  }

  /**
   * SÊNIOR: Retorna um Mapa (Dicionário) de itens para busca instantânea.
   */
  async getItemsMap() {
    if (!this.items || Object.keys(this.itemsMap).length === 0) {
      await this.getItems();
    }
    return this.itemsMap;
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
