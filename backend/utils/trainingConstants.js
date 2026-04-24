/**
 * Configurações de Treinamento - Rebalanceadas (Protocolo de Elite v2)
 *
 * IDENTIDADES DE BUILD:
 *   pequeno → Sniper/Precisão: FOC alto + CRIT% acumulado (gains crit_chance)
 *   medio   → Versátil: ATK+DEF equilibrado + CRIT DMG moderado
 *   grande  → Bruiser: ATK máximo + CRIT DMG bruto (pouco CRIT%)
 *
 * NOTA: critical_chance e critical_damage aqui são PONTOS BRUTOS acumulados.
 * A % real de crit é calculada dinamicamente em gameLogic.calcCritChance().
 * Isso permite rebalancear a fórmula sem migração de dados no banco.
 */

const TRAINING_TYPES = {
  pequeno: {
    name: "Treino Técnico",
    description: "Foco em precisão, controle e disciplina. Ideal para refinar o FOC.",
    durationMinutes: 20,
    costs: {
      actionPoints: 100,
      money: 100,
      energy: 15,
    },
    gains: {
      attack: 1,
      defense: 1,
      focus: 3,
      critical_chance: 0.3,
      critical_damage: 0.5,
      xp: 120,
    },
  },
  medio: {
    name: "Simulação Tática",
    description: "Treinamento equilibrado que desenvolve ATK e DEF de forma versátil.",
    durationMinutes: 50,
    costs: {
      actionPoints: 250,
      money: 300,
      energy: 35,
    },
    gains: {
      attack: 5,
      defense: 5,
      focus: 2,
      critical_chance: 0.15,
      critical_damage: 1.0,
      xp: 350,
    },
  },
  grande: {
    name: "Protocolo de Assalto",
    description: "Exercícios de alto impacto para maximizar o poder de ATK bruto.",
    durationMinutes: 100,
    costs: {
      actionPoints: 500,
      money: 800,
      energy: 70,
    },
    gains: {
      attack: 12,
      defense: 4,
      focus: 2,
      critical_chance: 0.05,
      critical_damage: 1.8,
      xp: 800,
    },
  },
};

const MAX_DAILY_TRAININGS = 8;

const TRAINING_HUMOR = [
  "Treino iniciado. Seus músculos reclamaram, mas o sistema aprovou.",
  "Parabéns, você trocou conforto por estatística.",
  "Mais XP, menos dignidade. Excelente progresso.",
  "ATK subiu. O bom senso não acompanhou.",
  "DEF melhorou. Já sua paz interior continua indisponível.",
  "FOC aumentado. Milagre estatístico confirmado.",
  "Treino concluído. Agora você sofre com números melhores.",
  "Seu corpo pediu descanso. Você entregou disciplina artificial.",
  "XP adquirido. Trauma urbano também.",
  "Mais forte, mais rápido, levemente mais quebrado.",
  "A cidade não vai te poupar, mas agora você apanha com mais classe.",
  "Treino pesado concluído. O teclado sobreviveu por pouco.",
  "Status melhorado. Condições emocionais seguem em manutenção.",
];

module.exports = {
  TRAINING_TYPES,
  MAX_DAILY_TRAININGS,
  TRAINING_HUMOR,
};
