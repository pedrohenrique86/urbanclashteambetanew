/**
 * contractConstants.js
 * Matriz de Recursos Assimétricos - Ajustada para Limite de 100 NRG
 */

const REWARDS = {
  money: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  xp: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  attr: (chance, min = 1, max = 5) => Math.random() < chance ? Math.floor(Math.random() * (max - min + 1)) + min : 0,
};

/**
 * RENEGADOS (O Planejador)
 * Foco em PA elevado. Energia cresce suavemente até 25% do total.
 */
const HEIST_TYPES = [
  { id: 'bater_carteira', name: 'Bater Carteira', level: 1, costPA: 20, costEnergy: 2, money: [100, 300], xp: [10, 30], attrChance: 1.0, lootChance: 0.05 },
  { id: 'assaltar_padaria', name: 'Assaltar Padaria', level: 5, costPA: 50, costEnergy: 3, money: [800, 2000], xp: [50, 120], attrChance: 1.0, lootChance: 0.10 },
  { id: 'roubar_carro', name: 'Roubar Carro', level: 10, costPA: 100, costEnergy: 5, money: [3000, 7000], xp: [150, 350], attrChance: 1.0, lootChance: 0.15 },
  { id: 'invadir_apartamento', name: 'Invadir Apartamento', level: 15, costPA: 150, costEnergy: 6, money: [8000, 18000], xp: [300, 700], attrChance: 1.0, lootChance: 0.20 },
  { id: 'carga_caminhao', name: 'Carga de Caminhão', level: 20, costPA: 200, costEnergy: 8, money: [20000, 45000], xp: [600, 1300], attrChance: 1.0, lootChance: 0.25 },
  { id: 'assalto_joalheria', name: 'Assalto a Joalheria', level: 30, costPA: 300, costEnergy: 10, money: [5000, 120000], xp: [1200, 2800], attrChance: 1.0, lootChance: 0.30 },
  { id: 'sequestro_relampago', name: 'Sequestro Relâmpago', level: 40, costPA: 450, costEnergy: 12, money: [100000, 250000], xp: [2500, 5500], attrChance: 1.0, lootChance: 0.35 },
  { id: 'roubo_caixa', name: 'Roubo a Caixa Eletrônico', level: 50, costPA: 600, costEnergy: 15, money: [250000, 600000], xp: [5000, 12000], attrChance: 1.0, lootChance: 0.40 },
  { id: 'clonagem_cartoes', name: 'Clonagem de Cartões', level: 60, costPA: 800, costEnergy: 18, money: [500000, 1200000], xp: [10000, 25000], attrChance: 1.0, lootChance: 0.45 },
  { id: 'carro_forte', name: 'Ataque a Carro Forte', level: 75, costPA: 1100, costEnergy: 20, money: [1200000, 3000000], xp: [25000, 55000], attrChance: 1.0, lootChance: 0.50 },
  { id: 'banco_central', name: 'Assalto ao Banco Central', level: 100, costPA: 1600, costEnergy: 22, money: [4000000, 10000000], xp: [60000, 150000], attrChance: 1.0, lootChance: 0.60 },
  { id: 'obras_arte', name: 'Roubo de Obras de Arte', level: 125, costPA: 2200, costEnergy: 23, money: [10000000, 25000000], xp: [150000, 350000], attrChance: 1.0, lootChance: 0.70 },
  { id: 'invasao_mansao', name: 'Invasão de Mansão', level: 150, costPA: 3000, costEnergy: 24, money: [30000000, 80000000], xp: [400000, 900000], attrChance: 1.0, lootChance: 0.80 },
  { id: 'cassino_underworld', name: 'Cassino Underworld', level: 200, costPA: 4500, costEnergy: 25, money: [100000000, 250000000], xp: [1000000, 2500000], attrChance: 1.0, lootChance: 0.90 },
  { id: 'reserva_federal', name: 'Reserva Federal', level: 300, costPA: 8000, costEnergy: 30, money: [400000000, 1000000000], xp: [3000000, 8000000], attrChance: 1.0, lootChance: 1.0 },
];

/**
 * GUARDIÕES (O Operacional)
 * Foco em Custo de Energia elevado (Exaustão). PA cresce suavemente até 30% do Renegado.
 */
const GUARDIAN_TYPES = [
  { id: 'patrulha_pe', name: 'Patrulha a Pé', level: 1, costPA: 5, costEnergy: 10, salary: [100, 300], merit: [10, 30], interceptChance: 0.05, linkedHeists: ['bater_carteira'] },
  { id: 'seguranca_loja', name: 'Segurança de Loja', level: 5, costPA: 12, costEnergy: 15, salary: [800, 2000], merit: [50, 120], interceptChance: 0.08, linkedHeists: ['assaltar_padaria'] },
  { id: 'transito', name: 'Controle de Trânsito', level: 10, costPA: 25, costEnergy: 20, salary: [3000, 7000], merit: [150, 350], interceptChance: 0.10, linkedHeists: ['roubar_carro'] },
  { id: 'ronda_condominio', name: 'Ronda em Condomínio', level: 15, costPA: 40, costEnergy: 25, salary: [8000, 18000], merit: [300, 700], interceptChance: 0.12, linkedHeists: ['invadir_apartamento'] },
  { id: 'escolta_carga', name: 'Escolta de Carga', level: 20, costPA: 60, costEnergy: 30, salary: [20000, 45000], merit: [600, 1300], interceptChance: 0.15, linkedHeists: ['carga_caminhao'] },
  { id: 'vigilancia_joalheria', name: 'Vigilância de Joalheria', level: 30, costPA: 90, costEnergy: 40, salary: [50000, 120000], merit: [1200, 2800], interceptChance: 0.20, linkedHeists: ['assalto_joalheria'] },
  { id: 'anti_sequestro', name: 'Unidade Anti-Sequestro', level: 40, costPA: 130, costEnergy: 50, salary: [100000, 250000], merit: [2500, 5500], interceptChance: 0.25, linkedHeists: ['sequestro_relampago'] },
  { id: 'seguranca_bancaria', name: 'Segurança Bancária', level: 50, costPA: 180, costEnergy: 60, salary: [250000, 600000], merit: [5000, 12000], interceptChance: 0.30, linkedHeists: ['roubo_caixa', 'golpe_mestre'] },
  { id: 'investigacao_ciber', name: 'Investigação Cibernética', level: 60, costPA: 250, costEnergy: 70, salary: [500000, 1200000], merit: [10000, 25000], interceptChance: 0.35, linkedHeists: ['clonagem_cartoes'] },
  { id: 'escolta_carro_forte', name: 'Escolta de Carro Forte', level: 75, costPA: 350, costEnergy: 75, salary: [1200000, 3000000], merit: [25000, 55000], interceptChance: 0.40, linkedHeists: ['carro_forte'] },
  { id: 'op_banco_central', name: 'Operação Banco Central', level: 100, costPA: 500, costEnergy: 80, salary: [4000000, 10000000], merit: [60000, 150000], interceptChance: 0.50, linkedHeists: ['banco_central'] },
  { id: 'protecao_museus', name: 'Proteção de Museus', level: 125, costPA: 700, costEnergy: 85, salary: [10000000, 25000000], merit: [150000, 350000], interceptChance: 0.60, linkedHeists: ['obras_arte'] },
  { id: 'seguranca_elite', name: 'Segurança de Elite', level: 150, costPA: 1000, costEnergy: 90, salary: [30000000, 80000000], merit: [400000, 900000], interceptChance: 0.70, linkedHeists: ['invasao_mansao'] },
  { id: 'infiltracao_cassino', name: 'Infiltração em Cassino', level: 200, costPA: 1500, costEnergy: 92, salary: [100000000, 250000000], merit: [1000000, 2500000], interceptChance: 0.85, linkedHeists: ['cassino_underworld'] },
  { id: 'defesa_federal', name: 'Defesa Reserva Federal', level: 300, costPA: 2500, costEnergy: 95, salary: [400000000, 1000000000], merit: [3000000, 8000000], interceptChance: 1.0, linkedHeists: ['reserva_federal'] },
];

const DAILY_SPECIAL = {
  id: 'golpe_mestre',
  name: 'Golpe de Mestre (Especial)',
  level: 50,
  costPA: 1200,
  costEnergy: 50,
  money: [1000000, 5000000],
  xp: [100000, 300000],
  attrChance: 1.0,
  lootChance: 1.0,
};

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
