/**
 * contractConstants.js
 * Configurações de custos, ganhos e tempos para o sistema de Contratos.
 */

const REWARDS = {
  money: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  xp: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  attr: (chance, min = 1, max = 5) => Math.random() < chance ? Math.floor(Math.random() * (max - min + 1)) + min : 0,
};

const HEIST_TYPES = [
  { id: 'bater_carteira', name: 'Bater Carteira', level: 1, costPA: 20, costEnergy: 2, money: [50, 200], xp: [10, 30], attrChance: 0.01, lootChance: 0.05 },
  { id: 'assaltar_padaria', name: 'Assaltar Padaria', level: 5, costPA: 50, costEnergy: 5, money: [500, 1500], xp: [50, 100], attrChance: 0.05, lootChance: 0.10 },
  { id: 'roubar_carro', name: 'Roubar Carro', level: 10, costPA: 100, costEnergy: 10, money: [2000, 5000], xp: [150, 300], attrChance: 0.10, lootChance: 0.15 },
  { id: 'invadir_apartamento', name: 'Invadir Apartamento', level: 15, costPA: 150, costEnergy: 15, money: [5000, 10000], xp: [300, 600], attrChance: 0.15, lootChance: 0.20 },
  { id: 'carga_caminhao', name: 'Carga de Caminhão', level: 20, costPA: 200, costEnergy: 20, money: [10000, 25000], xp: [600, 1200], attrChance: 0.20, lootChance: 0.25 },
  { id: 'assalto_joalheria', name: 'Assalto a Joalheria', level: 30, costPA: 300, costEnergy: 25, money: [30000, 70000], xp: [1200, 2500], attrChance: 0.30, lootChance: 0.35 },
  { id: 'sequestro_relampago', name: 'Sequestro Relâmpago', level: 40, costPA: 400, costEnergy: 30, money: [50000, 120000], xp: [2500, 5000], attrChance: 0.40, lootChance: 0.45 },
  { id: 'roubo_caixa', name: 'Roubo a Caixa Eletrônico', level: 50, costPA: 500, costEnergy: 40, money: [100000, 250000], xp: [5000, 10000], attrChance: 0.50, lootChance: 0.50 },
  { id: 'clonagem_cartoes', name: 'Clonagem de Cartões', level: 60, costPA: 600, costEnergy: 50, money: [200000, 500000], xp: [10000, 20000], attrChance: 0.60, lootChance: 0.55 },
  { id: 'carro_forte', name: 'Ataque a Carro Forte', level: 75, costPA: 800, costEnergy: 65, money: [500000, 1200000], xp: [20000, 40000], attrChance: 0.70, lootChance: 0.60 },
  { id: 'banco_central', name: 'Assalto ao Banco Central', level: 100, costPA: 1200, costEnergy: 75, money: [1500000, 4000000], xp: [50000, 100000], attrChance: 0.80, lootChance: 0.70 },
  { id: 'obras_arte', name: 'Roubo de Obras de Arte', level: 125, costPA: 1500, costEnergy: 80, money: [3000000, 8000000], xp: [100000, 200000], attrChance: 0.85, lootChance: 0.75 },
  { id: 'invasao_mansao', name: 'Invasão de Mansão', level: 150, costPA: 2000, costEnergy: 85, money: [7000000, 15000000], xp: [200000, 400000], attrChance: 0.90, lootChance: 0.80 },
  { id: 'cassino_underworld', name: 'Cassino Underworld', level: 200, costPA: 3000, costEnergy: 95, money: [20000000, 50000000], xp: [500000, 1000000], attrChance: 0.95, lootChance: 0.90 },
  { id: 'reserva_federal', name: 'Reserva Federal', level: 300, costPA: 5000, costEnergy: 100, money: [100000000, 500000000], xp: [1000000, 5000000], attrChance: 1.0, lootChance: 1.0 },
];

const DAILY_SPECIAL = {
  id: 'golpe_mestre',
  name: 'Golpe de Mestre (Especial)',
  level: 50,
  costPA: 1000,
  costEnergy: 100,
  money: [500000, 2000000],
  xp: [50000, 150000],
  attrChance: 1.0,
  lootChance: 1.0,
};

const GUARDIAN_TYPES = [
  { id: 'patrulha_pe', name: 'Patrulha a Pé', level: 1, costPA: 30, costEnergy: 5, salary: [100, 300], merit: [10, 30], interceptChance: 0.01 },
  { id: 'transito', name: 'Controle de Trânsito', level: 10, costPA: 100, costEnergy: 15, salary: [500, 1200], merit: [50, 150], interceptChance: 0.05 },
  { id: 'vigilancia_eletronica', name: 'Vigilância Eletrônica', level: 25, costPA: 250, costEnergy: 30, salary: [1500, 3500], merit: [150, 400], interceptChance: 0.10 },
  { id: 'ronda_ostensiva', name: 'Ronda Ostensiva', level: 50, costPA: 500, costEnergy: 50, salary: [4000, 8000], merit: [400, 1000], interceptChance: 0.20 },
  { id: 'escolta_valores', name: 'Escolta de Valores', level: 100, costPA: 1200, costEnergy: 75, salary: [15000, 40000], merit: [1500, 5000], interceptChance: 0.35 },
  { id: 'investigacao_narcoticos', name: 'Investigação de Narcóticos', level: 200, costPA: 2500, costEnergy: 90, salary: [50000, 120000], merit: [5000, 15000], interceptChance: 0.50 },
  { id: 'operacao_especial', name: 'Operação Especial', level: 400, costPA: 6000, costEnergy: 100, salary: [200000, 500000], merit: [20000, 60000], interceptChance: 0.75 },
];

const SPECIAL_ITEMS_POOL = [
  'cabos_cobre', 'placas_mae_queimadas', 'sucata_placa_video', 'chips_defeituosos',
  'baterias_litio', 'fiacao_fibra_otica', 'pecas_drone', 'modulos_memoria',
  'motores_passo_precisao', 'processadores_basicos', 'biomaterial_bruto',
  'sensores_otica_avancada', 'neuro_chips', 'circuitos_integrados_raros', 'drives_ouro'
];

module.exports = {
  HEIST_TYPES,
  DAILY_SPECIAL,
  GUARDIAN_TYPES,
  SPECIAL_ITEMS_POOL,
  REWARDS
};
