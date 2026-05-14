/**
 * contractConstants.js
 * Equilíbrio Econômico Final - Sistema de Loot Simbiótico
 */

const REWARDS = {
  money: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  xp: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  attr: (chance, min = 1, max = 5) => Math.random() < chance ? Math.floor(Math.random() * (max - min + 1)) + min : 0,
};

/**
 * RENEGADOS (O Planejador / Alto Risco)
 * Loot Chance ALTA: Eles são a fonte primária de itens no jogo.
 */
const HEIST_TYPES = [
  { id: 'bater_carteira', name: 'Bater Carteira', level: 1, costPA: 20, costEnergy: 2, money: [50, 150], xp: [5, 15], lootChance: 0.10 },
  { id: 'assaltar_padaria', name: 'Assaltar Padaria', level: 25, costPA: 50, costEnergy: 3, money: [400, 1000], xp: [10, 25], lootChance: 0.15 },
  { id: 'roubar_carro', name: 'Roubar Carro', level: 50, costPA: 100, costEnergy: 5, money: [1000, 2500], xp: [20, 45], lootChance: 0.20 },
  { id: 'invadir_apartamento', name: 'Invadir Apartamento', level: 75, costPA: 150, costEnergy: 6, money: [2500, 5000], xp: [30, 60], lootChance: 0.25 },
  { id: 'carga_caminhao', name: 'Carga de Caminhão', level: 99, costPA: 200, costEnergy: 8, money: [4000, 8000], xp: [40, 80], lootChance: 0.30 },
  { id: 'assalto_joalheria', name: 'Assalto a Joalheria', level: 110, costPA: 300, costEnergy: 10, money: [7000, 15000], xp: [50, 100], lootChance: 0.35 },
  { id: 'sequestro_relampago', name: 'Sequestro Relâmpago', level: 135, costPA: 450, costEnergy: 12, money: [12000, 25000], xp: [70, 140], lootChance: 0.40 },
  { id: 'roubo_caixa', name: 'Roubo a Caixa Eletrônico', level: 160, costPA: 600, costEnergy: 15, money: [20000, 45000], xp: [100, 200], lootChance: 0.50 },
  { id: 'clonagem_cartoes', name: 'Clonagem de Cartões', level: 185, costPA: 800, costEnergy: 18, money: [30000, 65000], xp: [150, 300], lootChance: 0.60 },
  { id: 'carro_forte', name: 'Ataque a Carro Forte', level: 220, costPA: 1100, costEnergy: 20, money: [50000, 110000], xp: [200, 400], lootChance: 0.70 },
  { id: 'banco_central', name: 'Assalto ao Banco Central', level: 275, costPA: 1600, costEnergy: 22, money: [80000, 180000], xp: [250, 500], lootChance: 0.80 },
  { id: 'obras_arte', name: 'Roubo de Obras de Arte', level: 325, costPA: 2200, costEnergy: 23, money: [120000, 280000], xp: [350, 700], lootChance: 0.90 },
  { id: 'invasao_mansao', name: 'Invasão de Mansão', level: 400, costPA: 3000, costEnergy: 24, money: [200000, 450000], xp: [500, 1000], lootChance: 0.95 },
  { id: 'cassino_underworld', name: 'Cassino Underworld', level: 450, costPA: 4500, costEnergy: 25, money: [400000, 900000], xp: [800, 1600], lootChance: 1.0 },
  { id: 'reserva_federal', name: 'Reserva Federal', level: 500, costPA: 8000, costEnergy: 30, money: [1000000, 2500000], xp: [1500, 3000], lootChance: 1.0 },
];

/**
 * GUARDIÕES (O Operacional / Estabilidade)
 * Loot Chance BAIXA: O lucro nativo é limitado para compensar a segurança e o bônus de interceptação.
 */
const GUARDIAN_TYPES = [
  { id: 'patrulha_pe', name: 'Patrulha a Pé', level: 1, costPA: 5, costEnergy: 10, salary: [50, 150], merit: [10, 30], xp: [5, 15], lootChance: 0.02, linkedHeists: ['bater_carteira'] },
  { id: 'seguranca_loja', name: 'Segurança de Loja', level: 25, costPA: 12, costEnergy: 15, salary: [400, 1000], merit: [50, 120], xp: [10, 25], lootChance: 0.04, linkedHeists: ['assaltar_padaria'] },
  { id: 'transito', name: 'Controle de Trânsito', level: 50, costPA: 25, costEnergy: 20, salary: [1000, 2500], merit: [150, 350], xp: [20, 45], lootChance: 0.05, linkedHeists: ['roubar_carro'] },
  { id: 'ronda_condominio', name: 'Ronda em Condomínio', level: 75, costPA: 40, costEnergy: 25, salary: [2500, 5000], merit: [300, 700], xp: [30, 60], lootChance: 0.07, linkedHeists: ['invadir_apartamento'] },
  { id: 'escolta_carga', name: 'Escolta de Carga', level: 99, costPA: 60, costEnergy: 30, salary: [4000, 8000], merit: [600, 1300], xp: [40, 80], lootChance: 0.10, linkedHeists: ['carga_caminhao'] },
  { id: 'vigilancia_joalheria', name: 'Vigilância de Joalheria', level: 110, costPA: 90, costEnergy: 40, salary: [7000, 15000], merit: [1200, 2800], xp: [50, 100], lootChance: 0.12, linkedHeists: ['assalto_joalheria'] },
  { id: 'anti_sequestro', name: 'Unidade Anti-Sequestro', level: 135, costPA: 130, costEnergy: 50, salary: [12000, 25000], merit: [2500, 5500], xp: [70, 140], lootChance: 0.15, linkedHeists: ['sequestro_relampago'] },
  { id: 'seguranca_bancaria', name: 'Segurança Bancária', level: 160, costPA: 180, costEnergy: 60, salary: [20000, 45000], merit: [5000, 12000], xp: [100, 200], lootChance: 0.18, linkedHeists: ['roubo_caixa', 'golpe_mestre'] },
  { id: 'investigacao_ciber', name: 'Investigação Cibernética', level: 185, costPA: 250, costEnergy: 70, salary: [30000, 65000], merit: [10000, 25000], xp: [150, 300], lootChance: 0.20, linkedHeists: ['clonagem_cartoes'] },
  { id: 'escolta_carro_forte', name: 'Escolta de Carro Forte', level: 220, costPA: 350, costEnergy: 75, salary: [50000, 110000], merit: [25000, 55000], xp: [200, 400], lootChance: 0.25, linkedHeists: ['carro_forte'] },
  { id: 'op_banco_central', name: 'Operação Banco Central', level: 275, costPA: 500, costEnergy: 80, salary: [80000, 180000], merit: [60000, 150000], xp: [250, 500], lootChance: 0.30, linkedHeists: ['banco_central'] },
  { id: 'protecao_museus', name: 'Proteção de Museus', level: 325, costPA: 700, costEnergy: 85, salary: [120000, 280000], merit: [150000, 350000], xp: [350, 700], lootChance: 0.35, linkedHeists: ['obras_arte'] },
  { id: 'seguranca_elite', name: 'Segurança de Elite', level: 400, costPA: 1000, costEnergy: 90, salary: [200000, 450000], merit: [400000, 900000], xp: [500, 1000], lootChance: 0.40, linkedHeists: ['invasao_mansao'] },
  { id: 'infiltracao_cassino', name: 'Infiltração em Cassino', level: 450, costPA: 1500, costEnergy: 92, salary: [400000, 900000], merit: [1000000, 2500000], xp: [800, 1600], lootChance: 0.45, linkedHeists: ['cassino_underworld'] },
  { id: 'defesa_federal', name: 'Defesa Reserva Federal', level: 500, costPA: 2500, costEnergy: 95, salary: [1000000, 2500000], merit: [3000000, 8000000], xp: [1500, 3000], lootChance: 0.50, linkedHeists: ['reserva_federal'] },
];

const DAILY_SPECIAL = {
  id: 'golpe_mestre',
  name: 'Golpe de Mestre (Especial)',
  level: 50,
  costPA: 1200,
  costEnergy: 50,
  money: [80000, 180000],
  xp: [400, 800],
  lootChance: 1.0,
};

const SPECIAL_ITEMS_POOL = [
  { code: 'sucata_placa_video', rarity: 'common' },
  { code: 'cabos_cobre', rarity: 'common' },
  { code: 'chips_defeituosos', rarity: 'common' },
  { code: 'pecas_drone', rarity: 'common' },
  { code: 'fiacao_fibra_otica', rarity: 'common' },
  { code: 'baterias_litio', rarity: 'rare' },
  { code: 'modulos_memoria', rarity: 'rare' },
  { code: 'processadores_basicos', rarity: 'rare' },
  { code: 'biomaterial_bruto', rarity: 'rare' },
  { code: 'neuro_chips', rarity: 'rare' },
  { code: 'drives_ouro', rarity: 'rare' },
  { code: 'armazenamento_quantico', rarity: 'rare' },
  { code: 'matriz_criptografica', rarity: 'legendary' },
  { code: 'nucleos_ia', rarity: 'legendary' },
  { code: 'reator_fusao_portatil', rarity: 'legendary' }
];

module.exports = {
  HEIST_TYPES,
  DAILY_SPECIAL,
  GUARDIAN_TYPES,
  SPECIAL_ITEMS_POOL,
  REWARDS
};
