/**
 * playerStateConstants.js
 * 
 * Centraliza as definições de campos e chaves para evitar inconsistências 
 * entre o cache (Redis) e a persistência (libSQL).
 */

const PLAYER_STATE_PREFIX = "playerState:";
const DIRTY_PLAYERS_SET    = "dirtyPlayers";
const RANKING_ALL          = "ranking:players:all";
const RANKING_RENEGADOS    = "ranking:players:renegados";
const RANKING_GUARDIOES    = "ranking:players:guardioes";
const PERSISTENCE_INTERVAL = 3000; // 3 segundos

/**
 * Campos que devem ser persistidos no Banco de Dados (user_profiles).
 */
const DB_PERSIST_FIELDS = new Set([
  "total_xp", "level",
  "attack", "defense", "focus", "instinct",
  "critical_chance", "critical_damage",
  "intimidation", "discipline",
  "money", "display_name", "bio", "avatar_url", "faction", "faction_id",
  "energy", "energy_updated_at", "action_points",
  "victories", "defeats", "winning_streak",
  "status", "status_ends_at",
  "last_daily_special_at", "last_training_reset", "last_ap_reset"
]);

/**
 * Campos que vivem APENAS no Redis (Alta Volatilidade).
 * Não são enviados para o Banco de Dados para economizar I/O.
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
  "shield_protection",
  "max_energy",
  "recon_reason",
  "recon_phrase",
  "recon_loss_credits",
  "recon_loss_xp",
  "recon_power_result",
  "merit",
  "corruption",
  "toxicity",
  "daily_training_count",
  "premium_coins",
  "login_streak",
  "equipped_chips"
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
  action_points     : "actionPoints",
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
  winning_streak    : "winningStreak",
  daily_training_count: "dailyTrainingCount",
  toxicity          : "toxicity",
  merit             : "merit",
  corruption        : "corruption",
  premium_coins     : "uCrypto",
  is_admin          : "isAdmin",
  display_name      : "displayName",
  pending_training_toast: "pending_training_toast",
  current_training_id: "currentTrainingId",
  training_ends_at  : "trainingEndsAt",
  active_training_type: "activeTrainingType",
  clan_id           : "clanId"
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
  "faction_id", "premium_coins", "login_streak", "energy_updated_at"
]);

const FACTION_ALIAS_MAP = {
  gangsters:  "renegados",
  gangster:   "renegados",
  renegados:  "renegados",
  renegado:   "renegados",
  guardas:    "guardioes",
  guarda:     "guardioes",
  guardioes:  "guardioes",
  guardiao:   "guardioes",
  "guardiões": "guardioes",
  "guardião":  "guardioes",
};

/**
 * Resolve o nome canônico da facção.
 */
function resolveFactionName(input) {
  if (!input) return "renegados";
  return FACTION_ALIAS_MAP[String(input).toLowerCase().trim()] || "renegados";
}

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
  NUMERIC_FIELDS,
  resolveFactionName
};
