const playerStateService = require('./playerStateService');

/**
 * ActionPointsService - RedIRECIONADO para playerStateService
 * 
 * Este serviço foi mantido para compatibilidade com as rotas que ainda o importam,
 * mas toda a lógica agora reside no playerStateService.js (Redis-first).
 */
class ActionPointsService {
  /**
   * Verifica se o usuário precisa de reset (Legado, agora gerido internamente pelo getPlayerState)
   */
  static async needsReset(userId) {
    // playerStateService gerencia isso internamente via _checkAndResetAP
    return false; 
  }
  
  /**
   * Reseta os pontos de ação do usuário para 20.000 (Via Redis)
   */
  static async resetActionPoints(userId) {
    try {
      await playerStateService.updatePlayerState(userId, { action_points: 20000 });
      return true;
    } catch (error) {
      console.error('❌ ActionPointsService.resetActionPoints falhou:', error.message);
      return false;
    }
  }
  
  /**
   * Obtém os pontos de ação atuais do usuário (Via Redis)
   */
  static async getCurrentActionPoints(userId) {
    try {
      const state = await playerStateService.getPlayerState(userId);
      return state ? state.action_points : 0;
    } catch (error) {
      console.error('❌ ActionPointsService.getCurrentActionPoints falhou:', error.message);
      return 0;
    }
  }
  
  /**
   * Consome pontos de ação do usuário (Via Redis)
   */
  static async consumeActionPoints(userId, amount) {
    try {
      const state = await playerStateService.getPlayerState(userId);
      if (!state) return { success: false, remaining: 0, error: 'Usuário não encontrado' };

      if (state.action_points < amount) {
        return {
          success: false,
          remaining: state.action_points,
          error: 'Pontos de ação insuficientes'
        };
      }
      
      const newState = await playerStateService.updatePlayerState(userId, { action_points: -amount });
      
      return {
        success: true,
        remaining: newState ? newState.action_points : 0
      };
    } catch (error) {
      console.error('❌ ActionPointsService.consumeActionPoints falhou:', error.message);
      return {
        success: false,
        remaining: 0,
        error: 'Erro interno do servidor'
      };
    }
  }
  
  /**
   * Reset em massa (Agora gerido pelo mecanismo de Lazy Reset do playerStateService)
   */
  static async massReset() {
    return 0;
  }
}

module.exports = ActionPointsService;