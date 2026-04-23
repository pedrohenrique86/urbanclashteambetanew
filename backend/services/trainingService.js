const playerStateService = require("./playerStateService.js");
const { TRAINING_TYPES, MAX_DAILY_TRAININGS, TRAINING_HUMOR } = require("../utils/trainingConstants.js");

/**
 * trainingService.js
 * 
 * Gerencia a lógica de treinamento do jogador, integrado ao playerStateService (Redis + SSE).
 */

class TrainingService {
  /**
   * Inicia um novo treinamento.
   */
  async startTraining(userId, type) {
    const training = TRAINING_TYPES[type];
    if (!training) throw new Error("Tipo de treinamento inválido.");

    const state = await playerStateService.getPlayerState(userId);
    if (!state) throw new Error("Jogador não encontrado.");

    // 1. Verificações de robustez
    if (state.training_ends_at && new Date(state.training_ends_at) > new Date()) {
      throw new Error("Você já tem um treinamento em andamento.");
    }

    if (state.daily_training_count >= MAX_DAILY_TRAININGS) {
      throw new Error(`Limite diário de ${MAX_DAILY_TRAININGS} treinos atingido.`);
    }

    if (state.action_points < training.costs.actionPoints) {
      throw new Error("Pontos de ação insuficientes.");
    }

    if (state.money < training.costs.money) {
      throw new Error("Dinheiro insuficiente.");
    }

    if (state.energy < training.costs.energy) {
      throw new Error("Energia insuficiente.");
    }

    // 2. Cálculo do término
    const now = new Date();
    const endsAt = new Date(now.getTime() + training.durationMinutes * 60 * 1000);

    // 3. Aplica custos e define estado de treino
    const updates = {
      action_points: -training.costs.actionPoints,
      money: -training.costs.money,
      energy: -training.costs.energy,
      training_ends_at: endsAt.toISOString(),
      active_training_type: type,
    };

    const newState = await playerStateService.updatePlayerState(userId, updates);
    
    return {
      message: TRAINING_HUMOR[Math.floor(Math.random() * TRAINING_HUMOR.length)],
      training: {
        type,
        endsAt: endsAt.toISOString(),
        durationMinutes: training.durationMinutes,
      },
      player: newState,
    };
  }

  /**
   * Finaliza o treinamento e aplica recompensas.
   */
  async completeTraining(userId) {
    const state = await playerStateService.getPlayerState(userId);
    if (!state) throw new Error("Jogador não encontrado.");

    if (!state.training_ends_at || !state.active_training_type) {
      throw new Error("Nenhum treinamento ativo para completar.");
    }

    const endsAt = new Date(state.training_ends_at);
    if (endsAt > new Date()) {
      throw new Error("O treinamento ainda não terminou.");
    }

    const training = TRAINING_TYPES[state.active_training_type];
    if (!training) throw new Error("Configuração de treino não encontrada.");

    // Aplica ganhos
    const updates = {
      attack: training.gains.attack,
      defense: training.gains.defense,
      focus: training.gains.focus,
      total_xp: training.gains.xp,
      daily_training_count: 1, // Incrementa contador
      training_ends_at: "",    // Limpa estado
      active_training_type: "",
    };

    const newState = await playerStateService.updatePlayerState(userId, updates);

    return {
      message: TRAINING_HUMOR[Math.floor(Math.random() * TRAINING_HUMOR.length)],
      gains: training.gains,
      player: newState,
    };
  }
}

module.exports = new TrainingService();
