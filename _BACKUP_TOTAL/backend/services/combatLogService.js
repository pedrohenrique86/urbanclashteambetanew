const redisClient = require("../config/redisClient");

/**
 * CombatLogService
 * 
 * Armazena relatórios detalhados de combate no Redis.
 * Como são dados volumosos (turnos), usamos um TTL curto (1 hora).
 * O log de ação permanente contém apenas o resumo.
 */
class CombatLogService {
  constructor() {
    this.PREFIX = "combat:report:";
    this.TTL = 3600; // 1 hora de retenção para o replay/detalhes
  }

  /**
   * Salva o relatório detalhado no Redis.
   */
  async saveReport(userId, report) {
    const key = `${this.PREFIX}${userId}`;
    await redisClient.setAsync(key, JSON.stringify({
      ...report,
      timestamp: new Date().toISOString()
    }), "EX", this.TTL);
  }

  /**
   * Obtém o último relatório do jogador.
   */
  async getLastReport(userId) {
    const key = `${this.PREFIX}${userId}`;
    const data = await redisClient.getAsync(key);
    return data ? JSON.parse(data) : null;
  }
}

module.exports = new CombatLogService();
