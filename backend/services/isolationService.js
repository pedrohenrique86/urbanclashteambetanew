const { query } = require("../config/database");
const playerStateService = require("./playerStateService");
const redisClient = require("../config/redisClient");

/**
 * isolationService.js
 * 
 * Lógica para o Setor de Isolamento (Suborno e Resgate).
 */

const BRIBE_MULTIPLIER = 500;
const INSTANT_ESCAPE_TOKENS = 10;
const HELP_ALLY_TOKENS = 10;

async function bribeRuler(userId) {
  const LOCK_KEY = `lock:isolation:${userId}`;
  const hasLock = await redisClient.setNXAsync(LOCK_KEY, "1", 3000);
  if (!hasLock) throw new Error("Operação já em andamento.");

  try {
    const state = await playerStateService.getPlayerState(userId);
    if (!state) throw new Error("Jogador não encontrado.");

  if (state.status !== 'Isolamento') {
    throw new Error("Você não está em isolamento.");
  }

  const level = Number(state.level || 1);
  const bribeCost = level * BRIBE_MULTIPLIER;

  const money = Number(state.money || 0);
  if (money < bribeCost) {
    throw new Error(`Dinheiro insuficiente para suborno. (Custo: $${bribeCost.toLocaleString()})`);
  }

  // Dedução e atualização de estado
  await playerStateService.updatePlayerState(userId, {
    money: -bribeCost,
    status: 'Operacional',
    status_ends_at: null
  });

  return { message: "Suborno aceito. Você foi liberado para o setor operacional." };
  } finally {
    await redisClient.delAsync(LOCK_KEY);
  }
}

async function instantEscape(userId) {
  const LOCK_KEY = `lock:isolation:${userId}`;
  const hasLock = await redisClient.setNXAsync(LOCK_KEY, "1", 3000);
  if (!hasLock) throw new Error("Operação já em andamento.");

  try {
    const state = await playerStateService.getPlayerState(userId);
    if (!state) throw new Error("Jogador não encontrado.");

  if (state.status !== 'Isolamento') {
    throw new Error("Você não está em isolamento.");
  }

  const premiumCoins = Number(state.premium_coins || 0);
  if (premiumCoins < INSTANT_ESCAPE_TOKENS) {
    throw new Error(`Saldo de U-CRYPTON TOKENS insuficiente. (Custo: ${INSTANT_ESCAPE_TOKENS} U-CRYPTON TOKENS)`);
  }

  // Dedução e atualização de estado
  await playerStateService.updatePlayerState(userId, {
    premium_coins: -INSTANT_ESCAPE_TOKENS,
    status: 'Operacional',
    status_ends_at: null
  });

  return { message: "Transação confirmada. Você está operacional novamente." };
  } finally {
    await redisClient.delAsync(LOCK_KEY);
  }
}

async function helpAlly(userId, allyId) {
  const LOCK_KEY = `lock:isolation:${userId}`;
  const hasLock = await redisClient.setNXAsync(LOCK_KEY, "1", 3000);
  if (!hasLock) throw new Error("Operação já em andamento.");

  try {
    const rescuerState = await playerStateService.getPlayerState(userId);
    if (!rescuerState) throw new Error("Jogador não encontrado.");

  if (rescuerState.status !== 'Operacional') {
    throw new Error("Você precisa estar Operacional para tirar aliados do isolamento.");
  }

  const premiumCoins = Number(rescuerState.premium_coins || 0);
  if (premiumCoins < HELP_ALLY_TOKENS) {
    throw new Error(`Saldo de U-CRYPTON TOKENS insuficiente. (Custo: ${HELP_ALLY_TOKENS} U-CRYPTON TOKENS)`);
  }

  const allyState = await playerStateService.getPlayerState(allyId);
  if (!allyState) throw new Error("Aliado não encontrado.");

  if (allyState.status !== 'Isolamento') {
    throw new Error("Este aliado não está em isolamento.");
  }

  if (allyState.faction !== rescuerState.faction) {
    throw new Error("Você só pode ajudar aliados da mesma facção.");
  }

  // 1. Deduz moedas do salvador
  await playerStateService.updatePlayerState(userId, {
    premium_coins: -HELP_ALLY_TOKENS
  });

  // 2. Tira o aliado do isolamento
  await playerStateService.updatePlayerState(allyId, {
    status: 'Operacional',
    status_ends_at: null
  });

    return { message: `Você tirou ${allyState.username} do isolamento! Ele está operacional novamente.` };
  } finally {
    await redisClient.delAsync(LOCK_KEY);
  }
}

async function getAlliesInIsolation(userId) {
  const player = await playerStateService.getPlayerState(userId);
  if (!player) return [];

  const faction = player.faction;
  
  const result = await query(
    `SELECT u.id, u.username, u.country, p.avatar_url, p.level, p.status_ends_at
     FROM user_profiles p
     JOIN users u ON p.user_id = u.id
     WHERE p.faction = ? 
       AND p.status = 'Isolamento'
       AND p.user_id != ?
     ORDER BY p.status_ends_at ASC
     LIMIT 20`,
    [faction, userId]
  );

  return result.rows;
}

module.exports = {
  bribeRuler,
  instantEscape,
  helpAlly,
  getAlliesInIsolation
};
