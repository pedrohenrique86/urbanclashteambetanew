const { query } = require("../config/database");

/**
 * actionLogService.js
 * 
 * Centraliza o registro de auditoria e histórico de atividades do jogador.
 * Projetado para alta performance e escalabilidade.
 */
class ActionLogService {
  /**
   * Registra uma nova ação no banco de dados.
   * 
   * @param {string} userId - UUID do usuário
   * @param {string} actionType - Tipo da ação (combat, training, supply, etc)
   * @param {string} entityType - Entidade afetada (player, item, etc)
   * @param {string} entityId - ID da entidade
   * @param {object} metadata - Dados contextuais adicionais
   * @param {string} ipAddress - Endereço IP (opcional)
   */
  async log(userId, actionType, entityType = null, entityId = null, metadata = {}, ipAddress = null) {
    try {
      // SÊNIOR: Rodamos o insert de forma assíncrona sem dar 'await' no fluxo principal
      // para não bloquear a resposta da ação do jogo (Combat, Training, etc).
      // Isso melhora a percepção de performance do usuário final.
      query(
        `INSERT INTO action_logs (user_id, action_type, entity_type, entity_id, metadata, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, actionType, entityType, entityId, JSON.stringify(metadata), ipAddress]
      ).catch(err => {
        console.error(`[actionLogService] ❌ Falha crítica ao salvar log: ${err.message}`, { userId, actionType });
      });
    } catch (err) {
      // Previne falha total do serviço por erro de log
      console.error(`[actionLogService] ⚠️ Erro ao preparar log: ${err.message}`);
    }
  }

  /**
   * Recupera os logs recentes de um usuário.
   * 
   * @param {string} userId - UUID do usuário
   * @param {number} limit - Máximo de registros (default 50)
   */
  async getRecentLogs(userId, limit = 50) {
    const result = await query(
      `SELECT id, action_type, entity_type, entity_id, metadata, created_at
       FROM action_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
}

module.exports = new ActionLogService();
