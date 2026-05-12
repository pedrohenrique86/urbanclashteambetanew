const redisClient = require("../config/redisClient");

/**
 * StatusLogService
 * 
 * Armazena o histórico de mudanças de status do jogador no Redis (Redis-Only).
 * Substitui o antigo log em Banco de Dados Relacional.
 */
class StatusLogService {
  constructor() {
    this.PREFIX = "player:status_logs:";
    this.MAX_ENTRIES = 50;
  }

  /**
   * Registra uma mudança de status.
   */
  async logStatusChange(userId, status) {
    const key = `${this.PREFIX}${userId}`;
    const entry = JSON.stringify({
      status,
      timestamp: new Date().toISOString()
    });

    const pipeline = redisClient.pipeline();
    pipeline.lPush(key, entry);
    pipeline.lTrim(key, 0, this.MAX_ENTRIES - 1);
    pipeline.expire(key, 86400 * 7); // 7 dias de histórico
    await pipeline.exec();
  }

  /**
   * Obtém o histórico de status.
   */
  async getStatusHistory(userId) {
    const key = `${this.PREFIX}${userId}`;
    const logs = await redisClient.lRangeAsync(key, 0, -1);
    return logs.map(l => JSON.parse(l));
  }
}

module.exports = new StatusLogService();
