const { query } = require('../config/database');

/**
 * Serviço para gerenciar pontos de ação dos usuários
 * - Reset diário às 00:00 (meia-noite)
 * - 20.000 pontos por dia, não cumulativos
 */

class ActionPointsService {
  /**
   * Verifica se o usuário precisa de reset dos pontos de ação
   * @param {string} userId - ID do usuário
   * @returns {Promise<boolean>} - true se precisar de reset
   */
  static async needsReset(userId) {
    try {
      const result = await query(
        'SELECT action_points_reset_time FROM user_profiles WHERE user_id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return false;
      }
      
      const lastReset = new Date(result.rows[0].action_points_reset_time);
      const now = new Date();
      
      // Verificar se passou da meia-noite desde o último reset
      const lastMidnight = new Date(now);
      lastMidnight.setHours(0, 0, 0, 0);
      
      return lastReset < lastMidnight;
    } catch (error) {
      console.error('❌ Erro ao verificar reset de pontos de ação:', error.message);
      return false;
    }
  }
  
  /**
   * Reseta os pontos de ação do usuário para 20.000
   * @param {string} userId - ID do usuário
   * @returns {Promise<boolean>} - true se resetou com sucesso
   */
  static async resetActionPoints(userId) {
    try {
      await query(
        `UPDATE user_profiles 
         SET action_points = 20000, action_points_reset_time = CURRENT_TIMESTAMP 
         WHERE user_id = $1`,
        [userId]
      );
      
      console.log(`🔄 Pontos de ação resetados para usuário: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao resetar pontos de ação:', error.message);
      return false;
    }
  }
  
  /**
   * Obtém os pontos de ação atuais do usuário, aplicando reset se necessário
   * @param {string} userId - ID do usuário
   * @returns {Promise<number>} - pontos de ação atuais
   */
  static async getCurrentActionPoints(userId) {
    try {
      // Verificar se precisa de reset
      if (await this.needsReset(userId)) {
        await this.resetActionPoints(userId);
      }
      
      const result = await query(
        'SELECT action_points FROM user_profiles WHERE user_id = $1',
        [userId]
      );
      
      return result.rows.length > 0 ? result.rows[0].action_points : 0;
    } catch (error) {
      console.error('❌ Erro ao obter pontos de ação:', error.message);
      return 0;
    }
  }
  
  /**
   * Consome pontos de ação do usuário
   * @param {string} userId - ID do usuário
   * @param {number} amount - quantidade de pontos a consumir
   * @returns {Promise<{success: boolean, remaining: number}>}
   */
  static async consumeActionPoints(userId, amount) {
    try {
      // Verificar pontos atuais (com reset automático se necessário)
      const currentPoints = await this.getCurrentActionPoints(userId);
      
      if (currentPoints < amount) {
        return {
          success: false,
          remaining: currentPoints,
          error: 'Pontos de ação insuficientes'
        };
      }
      
      // Consumir pontos
      const newAmount = currentPoints - amount;
      await query(
        'UPDATE user_profiles SET action_points = $1 WHERE user_id = $2',
        [newAmount, userId]
      );
      
      console.log(`⚡ ${amount} pontos de ação consumidos. Restam: ${newAmount}`);
      
      return {
        success: true,
        remaining: newAmount
      };
    } catch (error) {
      console.error('❌ Erro ao consumir pontos de ação:', error.message);
      return {
        success: false,
        remaining: 0,
        error: 'Erro interno do servidor'
      };
    }
  }
  
  /**
   * Reset em massa para todos os usuários (executar diariamente às 00:00)
   * @returns {Promise<number>} - número de usuários resetados
   */
  static async massReset() {
    try {
      const result = await query(
        `UPDATE user_profiles 
         SET action_points = 20000, action_points_reset_time = CURRENT_TIMESTAMP 
         WHERE action_points_reset_time < CURRENT_DATE`
      );
      
      console.log(`🔄 Reset em massa: ${result.rowCount} usuários resetados`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Erro no reset em massa:', error.message);
      return 0;
    }
  }
}

module.exports = ActionPointsService;