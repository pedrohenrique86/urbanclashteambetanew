const redisClient = require("../config/redisClient");

/**
 * MarketHistoryService
 * 
 * Armazena o histórico recente de transações da Bolsa Sombria no Redis.
 * Fonte de dados para o "Feed de Mercado" no frontend.
 */
class MarketHistoryService {
  constructor() {
    this.KEY = "market:recent_sales";
    this.MAX_ENTRIES = 50;
  }

  /**
   * Registra uma venda/compra no mercado.
   */
  async logTransaction(userId, username, itemCode, itemName, quantity, price, type = 'buy') {
    const entry = JSON.stringify({
      userId,
      username,
      itemCode,
      itemName,
      quantity,
      price,
      type,
      timestamp: new Date().toISOString()
    });

    const pipeline = redisClient.pipeline();
    pipeline.lPush(this.KEY, entry);
    pipeline.lTrim(this.KEY, 0, this.MAX_ENTRIES - 1);
    pipeline.expire(this.KEY, 86400); // 24h de histórico
    await pipeline.exec();
  }

  /**
   * Obtém o histórico recente.
   */
  async getRecentHistory() {
    const logs = await redisClient.lRangeAsync(this.KEY, 0, -1);
    return logs.map(l => JSON.parse(l));
  }
}

module.exports = new MarketHistoryService();
