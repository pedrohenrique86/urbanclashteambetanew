/**
 * playerStateConstants.js
 * 
 * Centraliza as definições de campos e chaves para evitar inconsistências 
 * entre o cache (Redis) e a persistência (PostgreSQL).
 */

const PLAYER_STATE_PREFIX = "playerState:";
const DIRTY_PLAYERS_SET    = "dirtyPlayers";
const RANKING_ALL          = "ranking:players:all";
const RANKING_RENEGADOS    = "ranking:players:renegados";
const RANKING_GUARDIOES    = "ranking:players:guardioes";
const PERSISTENCE_INTERVAL = 3000; // 3 segundos

/**
 * Campos que devem ser persistidos no PostgreSQL (user_profiles).
 */
const DB_PERSIST_FIELDS = new Set([
  "total_xp", "level",
  "attack", "defense", "focus", "instinct",
  "critical_chance", "critical_damage",
  "intimidation", "discipline",
  "money", "display_name", "bio", "avatar_url", "faction", "faction_id",
  "energy", "max_energy", "action_points",
  "victories", "defeats", "winning_streak",
  "status", "status_ends_at", "recon_reason", "recon_phrase",
  "recon_loss_credits", "recon_loss_xp", "recon_power_result",
  "last_daily_special_at", "last_training_reset", "last_ap_reset",
  "daily_training_count", "toxicity", "premium_coins",
  "login_streak", "merit", "corruption", "equipped_chips"
]);

/**
 * Campos que vivem APENAS no Redis (Alta Volatilidade).
 * Não são enviados para o PostgreSQL para economizar I/O.
 */
const VOLATILE_FIELDS = new Set([
  "is_admin",
  "socket_id",
  "last_active",
  "is_dirty",
  "is_dirty_at",
  "pending_training_toast",
  "current_training_id",
  "training_ends_at",
  "pending_interception",
  "weapon_damage",
  "shield_protection"
]);

/**
 * Mapeamento de nomes internos do Redis para chaves de saída SSE (Frontend).
 * Mantém o contrato com o frontend estável mesmo se mudarmos o Redis.
 */
const FIELD_TO_SSE = {
  total_xp          : "xp",
  level             : "level",
  energy            : "energy",
  max_energy        : "maxEnergy",
  action_points     : "ap",
  attack            : "attack",
  defense           : "defense",
  focus             : "focus",
  instinct          : "instinct",
  critical_damage   : "critDamage",
  critical_chance   : "critChance",
  money             : "cash",
  status            : "status",
  status_ends_at    : "statusEndsAt",
  victories         : "victories",
  defeats           : "defeats",
  winning_streak    : "streak",
  daily_training_count: "dailyTrainings",
  toxicity          : "toxicity",
  merit             : "merit",
  corruption        : "corruption",
  premium_coins     : "ucrypto",
  is_admin          : "isAdmin",
  display_name      : "username",
  pending_training_toast: "trainingToast",
  current_training_id: "trainingId",
  training_ends_at  : "trainingEndsAt"
};

/**
 * Campos que devem ser tratados como números na conversão.
 */
const NUMERIC_FIELDS = new Set([
  "level", "total_xp", "energy", "max_energy", "action_points",
  "attack", "defense", "focus", "instinct", "critical_damage", "critical_chance",
  "money", "intimidation", "discipline", "victories", "defeats", 
  "winning_streak", "daily_training_count", "toxicity",
  "recon_loss_credits", "recon_loss_xp", "merit", "corruption",
  "faction_id", "premium_coins", "login_streak"
]);

module.exports = {
  PLAYER_STATE_PREFIX,
  DIRTY_PLAYERS_SET,
  RANKING_ALL,
  RANKING_RENEGADOS,
  RANKING_GUARDIOES,
  PERSISTENCE_INTERVAL,
  DB_PERSIST_FIELDS,
  VOLATILE_FIELDS,
  FIELD_TO_SSE,
  NUMERIC_FIELDS
};
