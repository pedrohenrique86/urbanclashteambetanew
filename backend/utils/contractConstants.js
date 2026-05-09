/**
 * contractConstants.js
 * Configurações de custos, ganhos e tempos para o sistema de Contratos.
 */

const HEIST_TYPES = {
  PREPARACAO_ROUBO: {
    id: 'prep_roubo',
    name: 'Preparar Terreno',
    tasks: [
      { id: 'vigiar', name: 'Vigiar Segurança', costPA: 100, costEnergy: 5, successBonus: 15 },
      { id: 'hackear', name: 'Hackear Câmeras', costPA: 150, costEnergy: 10, successBonus: 20 },
      { id: 'rota', name: 'Preparar Rota de Fuga', costPA: 200, costEnergy: 15, successBonus: 25 },
    ],
    baseSuccessChance: 30,
  },
  GRANDE_GOLPE: {
    id: 'grande_golpe',
    name: 'O Grande Golpe',
    costEnergy: 80,
    durationMinutes: 3,
    gains: {
      money: 50000,
      xp: 1000,
      luck: 0.1,
    }
  }
};

const GUARDIAN_TYPES = {
  RONDA: {
    id: 'ronda',
    name: 'Fazer Ronda',
    costPA: 100,
    salary: 500,
    merit: 50,
    alertLevelGain: 10,
  },
  INVESTIGACAO: {
    id: 'investigacao',
    name: 'Investigar Pistas',
    costPA: 300,
    salary: 1200,
    merit: 150,
    alertLevelGain: 25,
  },
  INTERVENCAO: {
    id: 'intervencao',
    name: 'Responder Chamado',
    costEnergy: 50,
    meritBonus: 1000,
  }
};

module.exports = {
  HEIST_TYPES,
  GUARDIAN_TYPES
};
