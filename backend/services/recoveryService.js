const { query } = require("../config/database");
const playerStateService = require("./playerStateService");
const redisClient = require("../config/redisClient");

/**
 * recoveryService.js
 * 
 * Lógica para a Base de Recuperação (Antídotos e Resgate de Aliados).
 * Focado em performance (5000 players) e atomicidade via Redis/Postgres.
 */

async function buyAntidote(userId) {
  const state = await playerStateService.getPlayerState(userId);
  if (!state) throw new Error("Jogador não encontrado.");

  if (state.status !== 'Ruptura') {
    throw new Error("Sua unidade não apresenta sinais de ruptura.");
  }

  const premiumCoins = Number(state.premium_coins || 0);
  if (premiumCoins < 1) {
    throw new Error("Saldo de U-CRYPTON TOKENS insuficiente. (Custo: 1 U-CRYPTON TOKENS)");
  }

  // Dedução e atualização de estado
  await playerStateService.updatePlayerState(userId, {
    premium_coins: -1,
    status: 'Operacional',
    status_ends_at: null
  });

  return { message: "Kit de Reparo aplicado com sucesso! Sua integridade foi restaurada." };
}

async function rescueAlly(userId, allyId) {
  const rescuerState = await playerStateService.getPlayerState(userId);
  if (!rescuerState) throw new Error("Jogador não encontrado.");

  if (rescuerState.status !== 'Operacional') {
    throw new Error("Você precisa estar Operacional para resgatar aliados.");
  }

  const premiumCoins = Number(rescuerState.premium_coins || 0);
  if (premiumCoins < 5) {
    throw new Error("Saldo de U-CRYPTON TOKENS insuficiente. (Custo: 5 U-CRYPTON TOKENS)");
  }

  const allyState = await playerStateService.getPlayerState(allyId);
  if (!allyState) throw new Error("Aliado não encontrado.");

  if (allyState.status !== 'Recondicionamento') {
    throw new Error("Este aliado não está em recondicionamento.");
  }

  if (allyState.faction !== rescuerState.faction) {
    throw new Error("Você só pode resgatar aliados da mesma facção.");
  }

  // 1. Deduz moedas do salvador
  await playerStateService.updatePlayerState(userId, {
    premium_coins: -5
  });

  // 2. Tira o aliado do recondicionamento
  await playerStateService.updatePlayerState(allyId, {
    status: 'Operacional',
    status_ends_at: null
  });

  return { message: `Você resgatou ${allyState.username}! Ele está operacional novamente.` };
}

async function reactivateSelf(userId) {
  const state = await playerStateService.getPlayerState(userId);
  if (!state) throw new Error("Jogador não encontrado.");

  if (state.status !== 'Recondicionamento') {
    throw new Error("Sua unidade não está em recondicionamento.");
  }

  const premiumCoins = Number(state.premium_coins || 0);
  if (premiumCoins < 5) {
    throw new Error("Saldo de U-CRYPTON TOKENS insuficiente. (Custo: 5 U-CRYPTON TOKENS)");
  }

  // Dedução e atualização de estado
  await playerStateService.updatePlayerState(userId, {
    premium_coins: -5,
    status: 'Operacional',
    status_ends_at: null
  });

  return { message: "Protocolo de reativação concluído! Você está operacional." };
}

async function getAlliesInReconditioning(userId) {
  const player = await playerStateService.getPlayerState(userId);
  if (!player) return [];

  const faction = player.faction;
  
  // SÊNIOR: Query otimizada para buscar apenas aliados em recondicionamento
  // Limitamos para evitar sobrecarga se houverem muitos
  const result = await query(
    `SELECT u.id, u.username, u.country, p.avatar_url, p.level, p.status_ends_at
     FROM user_profiles p
     JOIN users u ON p.user_id = u.id
     WHERE p.faction = $1 
       AND p.status = 'Recondicionamento'
       AND p.user_id != $2
     ORDER BY p.status_ends_at ASC
     LIMIT 20`,
    [faction, userId]
  );

  return result.rows;
}

module.exports = {
  buyAntidote,
  rescueAlly,
  reactivateSelf,
  getAlliesInReconditioning
};
