const playerStateService = require("./playerStateService.js");
const actionLogService = require("./actionLogService.js");
const redisClient = require("../config/redisClient");
const { TRAINING_TYPES, MAX_DAILY_TRAININGS, TRAINING_HUMOR } = require("../utils/trainingConstants.js");
const gameLogic = require("../utils/gameLogic");

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
    return redisClient.withLock(`training:${userId}`, 3000, async () => {
      const training = TRAINING_TYPES[type];
      if (!training) throw new Error("Tipo de treinamento inválido.");

      const state = await playerStateService.getPlayerState(userId);
      if (!state) throw new Error("Jogador não encontrado.");

      if (state.training_ends_at && new Date(state.training_ends_at) > new Date()) {
        throw new Error("Você já tem um treinamento em andamento.");
      }

      if (state.active_training_type && (!state.training_ends_at || new Date(state.training_ends_at) <= new Date())) {
        throw new Error("Você tem recompensas pendentes do último treino. Reivindique-as primeiro.");
      }

      if (state.daily_training_count >= MAX_DAILY_TRAININGS) {
        const lastReset = Number(state.last_training_reset || 0);
        const now = Date.now();
        const cooldownMs = 24 * 60 * 60 * 1000; // 24 horas

        if (lastReset > 0 && now - lastReset >= cooldownMs) {
          // Reset automático após 24h da última conclusão do set de 8
          await playerStateService.updatePlayerState(userId, { 
            daily_training_count: 0,
            last_training_reset: "" // SÊNIOR: Limpa para o próximo ciclo
          });
          state.daily_training_count = 0;
        } else {
          const remainingMs = cooldownMs - (now - lastReset);
          const hours = Math.floor(remainingMs / (60 * 60 * 1000));
          const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          throw new Error(`Limite diário de ${MAX_DAILY_TRAININGS} treinos atingido. Próximo reset em ${hours}h ${minutes}m.`);
        }
      }

      if (state.action_points < training.costs.actionPoints) {
        throw new Error("Pontos de ação insuficientes.");
      }

      const dynamicMoneyCost = gameLogic.calculateTrainingCost(training.costs.money, state.level);
      if (state.money < dynamicMoneyCost) {
        throw new Error(`Dinheiro insuficiente. Custo atual: $${dynamicMoneyCost}`);
      }

      if (state.energy < training.costs.energy) {
        throw new Error("Energia insuficiente.");
      }

      const now = new Date();
      const endsAt = new Date(now.getTime() + training.durationMinutes * 60 * 1000);

      const updates = {
        action_points: -training.costs.actionPoints,
        money: -dynamicMoneyCost,
        energy: -training.costs.energy,
        training_ends_at: endsAt.toISOString(),
        active_training_type: type,
        status: 'Aprimoramento',
        status_ends_at: endsAt.toISOString(),
      };

      const newState = await playerStateService.updatePlayerState(userId, updates);
      playerStateService.scheduleTraining(userId, endsAt.getTime());
      
      return {
        message: TRAINING_HUMOR[Math.floor(Math.random() * TRAINING_HUMOR.length)],
        training: { type, endsAt: endsAt.toISOString(), durationMinutes: training.durationMinutes },
        player: newState,
      };
    });
  }

  async completeTraining(userId) {
    return redisClient.withLock(`training:${userId}`, 3000, async () => {
      const state = await playerStateService.getPlayerState(userId);
      if (!state) throw new Error("Jogador não encontrado.");

      if (!state.training_ends_at || !state.active_training_type) {
        throw new Error("Nenhum treinamento ativo para completar.");
      }

      const endsAt = new Date(state.training_ends_at);
      if (endsAt.getTime() > new Date().getTime() + 5000) {
        throw new Error("O treinamento ainda não terminou.");
      }

      const training = TRAINING_TYPES[state.active_training_type];
      const scaledXp = gameLogic.scaleXpByLevel(training.gains.xp, state.level);

      const updates = {
        attack: training.gains.attack,
        defense: training.gains.defense,
        focus: training.gains.focus,
        critical_chance: training.gains.critical_chance  || 0,
        critical_damage: training.gains.critical_damage  || 0,
        total_xp: scaledXp,
        daily_training_count: 1,
        training_ends_at : "",
        active_training_type: "",
        status: "Operacional",
        status_ends_at: "",
      };

      const oldLevel = Number(state.level || 1);
      const newState = await playerStateService.updatePlayerState(userId, updates);
      const newLevel = Number(newState.level || 1);

      playerStateService.cancelScheduledTraining(userId);

      const isUnlock = oldLevel < 10 && newLevel >= 10;
      const isDailyQuotaFinished = Number(newState.daily_training_count || 0) >= MAX_DAILY_TRAININGS;

      if (isDailyQuotaFinished && !state.last_training_reset) {
         // Marca o início do cooldown de 24h
         await playerStateService.updatePlayerState(userId, { last_training_reset: Date.now().toString() });
      }

      // REGISTRO DE LOG (Privado - Removido do Feed Global conforme pedido)
      await actionLogService.log(userId, "training", "exercise", state.active_training_type, {
        xp_gain: scaledXp,
        stats_gained: {
          atk: training.gains.attack,
          def: training.gains.defense,
          foc: training.gains.focus
        }
      }, false);

      return {
        message: TRAINING_HUMOR[Math.floor(Math.random() * TRAINING_HUMOR.length)],
        gains: { ...training.gains, xp: scaledXp, xp_base: training.gains.xp, level_bonus_pct: Math.round(Number(state.level || 1) * gameLogic.XP_SCALING.LEVEL_FACTOR * 100) },
        player: newState,
        ...(isUnlock ? { unlock_acerto_de_contas: true } : {})
      };
    });
  }
}

module.exports = new TrainingService();

