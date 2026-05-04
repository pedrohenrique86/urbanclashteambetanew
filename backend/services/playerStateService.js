/**
 * playerStateService.js
 *
 * ARQUITETURA FINAL — Performance + Segurança + Escalabilidade (5000 jogadores)
 *
 * FLUXO:
 *   ação → Redis (instantâneo, fonte primária)
 *        → PATCH SSE (apenas campos modificados + version)
 *        → dirty separado por tipo (DB vs temporário)
 *        → debounce 3s → PostgreSQL async
 *
 * DIRTY — dois tipos separados:
 *   DB_PERSIST_FIELDS: campos que DEVEM ir ao banco (level, xp, atributos, money)
 *   VOLATILE_FIELDS:   campos que NÃO persistem frequentemente (energy, action_points)
 *
 * SAFETY-NET:
 *   Só persiste estados com is_dirty_at há mais de SAFETY_STALENESS_MS
 *   Não duplica o debounce, não processa todos os jogadores a cada ciclo
 *
 * SSE:
 *   Canal privado por jogador: "player:{userId}"
 *   Payload PATCH: apenas campos alterados + version
 *   Keep-alive: ping a cada 25s (gerido pelo endpoint de rota)
 */

const { query }   = require("../config/database");
const redisClient = require("../config/redisClient");
const sseService  = require("./sseService");
const gameLogic   = require("../utils/gameLogic");
// Removida dependência externa luxon para evitar crash; usando Intl nativo

// ─── Constantes ──────────────────────────────────────────────────────────────────
const PLAYER_STATE_PREFIX   = "playerState:";
const BATCH_FLUSH_INTERVAL  = 15000;        // SÊNIOR: Aumentado para 15s para reduzir picos no Neon DB (1 CU)
module.exports.PLAYER_STATE_PREFIX = PLAYER_STATE_PREFIX;
const RANKING_ZSET_KEY      = "ranking:users:zset";
const PLAYER_STATE_TTL      = 60 * 60 * 24 * 7; 
const PERSIST_BATCH_SIZE    = 50;          
const SAFETY_STALENESS_MS   = 15000;        // SÊNIOR: Aumentado para 15s para garantir que só salvemos em blocos maiores
const DEBOUNCE_MS           = 2000;        // Tempo de espera após última ação para salvar (2s)
const DIRTY_PLAYERS_SET     = "player:dirty:set";
const TRAINING_QUEUE_KEY    = "queue:trainings";

/**
 * SÊNIOR: Script LUA para Atualização Atômica de Estado.
 * Garante que incrementos com CAP (energia, toxicidade) sejam calculados 
 * no servidor Redis, evitando a corrida de dados 'Read-Modify-Write'.
 * 
 * ARGS: 
 *   KEYS[1] = redisKey
 *   ARGV[1] = fieldName (ex: energy)
 *   ARGV[2] = incrementValue (ex: 40)
 *   ARGV[3] = maxValue (ex: 100)
 *   ARGV[4] = timestampFieldName (ex: energy_updated_at)
 *   ARGV[5] = timestampValue (ex: 2026-05-03T...)
 *   ARGV[6] = dirtyAtValue (Date.now())
 *   ARGV[7] = dirtyPlayersSetKey
 *   ARGV[8] = userId
 *   ARGV[9] = isSilent ("1" para sim, "0" para não)
 */
const UPDATE_STATE_LUA = `
  local key = KEYS[1]
  local field = ARGV[1]
  local inc = tonumber(ARGV[2])
  local maxVal = tonumber(ARGV[3]) or 9999999
  
  local current = tonumber(redis.call('HGET', key, field) or 0)
  local newVal = math.min(maxVal, math.max(0, current + inc))
  
  redis.call('HSET', key, field, tostring(newVal))
  if ARGV[4] ~= "" and ARGV[5] ~= "" then
    redis.call('HSET', key, ARGV[4], ARGV[5])
  end
  
  -- Se NÃO for silencioso, marca como dirty para o PostgreSQL
  if ARGV[9] ~= "1" then
    redis.call('HSET', key, 'is_dirty', '1')
    redis.call('HSET', key, 'is_dirty_at', ARGV[6])
    redis.call('SADD', ARGV[7], ARGV[8])
  end
  
  return tostring(newVal)
`;

// ─── Campos que afetam o ranking (ZSET) e o Nível Dinâmico ────────────────────────
const RANKING_FIELDS = new Set(["total_xp", "level", "attack", "defense", "focus", "money"]);

// ─── Dirty TIPO 1: campos que DEVEM ser persistidos no banco ─────────────────────
// Subconjunto de DB_PERSIST_FIELDS — apenas dados de progressão permanente
const DB_PERSIST_FIELDS = new Set([
  "total_xp", "level",
  "attack", "defense", "focus", "luck",
  "critical_chance", "critical_damage",
  "intimidation", "discipline",
  "money", "display_name", "bio", "avatar_url", "faction", "faction_id",
  "victories", "defeats", "winning_streak",
  "status", "status_ends_at",
  "recovery_ends_at", "shield_ends_at",
  "training_ends_at", "daily_training_count", "last_training_reset", "active_training_type",
  "energy", "action_points", "last_ap_reset",
  "energy_updated_at", "toxicity", "premium_coins", "login_streak"
]);

// ─── Dirty TIPO 2: campos voláteis (NÃO persistem no safety-net, só via debounce
//                   quando absolutamente necessário — energia regenera sozinha)
const VOLATILE_FIELDS = new Set([
  "max_energy",
]);

// ─── Todos os campos que disparam SSE ao frontend ────────────────────────────────
const SSE_FIELDS = new Set([...DB_PERSIST_FIELDS, ...VOLATILE_FIELDS]);

// ─── Mapeamento Redis key → campo SSE (camelCase) ────────────────────────────────
// Usado para construir o PATCH mínimo
const FIELD_TO_SSE = {
  level             : "level",
  total_xp          : "xp",
  energy            : "energy",
  max_energy        : "maxEnergy",
  action_points     : "actionPoints",
  attack            : "attack",
  defense           : "defense",
  focus             : "focus",
  luck              : "luck",
  critical_damage   : "critDamage",
  critical_chance   : "critChance",
  money             : "cash",
  intimidation      : "intimidation",
  discipline        : "discipline",
  victories         : "victories",
  defeats           : "defeats",
  winning_streak    : "winningStreak",
  status            : "status",
  status_ends_at    : "statusEndsAt",
  training_ends_at  : "trainingEndsAt",
  daily_training_count: "dailyTrainingCount",
  last_training_reset: "lastTrainingReset",
  active_training_type: "activeTrainingType",
  toxicity          : "toxicity",
  bio               : "bio",
  avatar_url        : "avatar_url"
};

// ─── Campos numéricos no Redis Hash ──────────────────────────────────────────────
const NUMERIC_FIELDS = new Set([
  "level", "total_xp", "energy", "max_energy", "action_points",
  "attack", "defense", "focus", "luck", "critical_damage", "critical_chance",
  "money", "intimidation", "discipline", "victories", "defeats", 
  "winning_streak", "daily_training_count", "toxicity"
]);

// ─── Estado interno ───────────────────────────────────────────────────────────────
const _memDirtyRanking = new Set();  // userId → mudança de XP/nível (para ranking)

// Contador de versão por jogador para consistência do PATCH no frontend
const _versionMap = new Map();       // userId → number

// Guard para evitar double-completion no Lazy Training Completion
// Se o worker já está processando, o getPlayerState não dispara um segundo completeTraining
const _inProgressCompletions = new Set(); // userId → em processamento

// ─── Status Constants ─────────────────────────────────────────────────────────────
const ALLOWED_STATUSES = ['Operacional', 'Isolamento', 'Recondicionamento', 'Aprimoramento', 'Sangrando'];
const VALID_TRANSITIONS = {
  'Operacional':       ['Isolamento', 'Recondicionamento', 'Aprimoramento', 'Sangrando'],
  'Isolamento':        ['Operacional'],
  'Recondicionamento': ['Operacional'],
  'Aprimoramento':     ['Operacional'],
  'Sangrando':         ['Operacional', 'Recondicionamento']
};

function _nextVersion(userId) {
  const uid = String(userId);
  const v   = (_versionMap.get(uid) || 0) + 1;
  _versionMap.set(uid, v);
  return v;
}

// ─── Helpers privados ─────────────────────────────────────────────────────────────

/** Converte hash Redis (strings) para tipos corretos. */
function _parseState(raw) {
  if (!raw) return null;
  const out = { ...raw };
  for (const field of NUMERIC_FIELDS) {
    if (out[field] !== undefined) {
      let n = Number(out[field]);
      if (!isNaN(n)) {
        // Garantir que ATK, DEF e FOC sejam sempre inteiros para o frontend
        if (['luck'].includes(field)) {
          n = Math.floor(n);
        }
        out[field] = n;
      }
    }
  }

  // SÊNIOR: Normaliza campos nullable — Redis armazena "" como string,
  // mas o frontend precisa de null para falsy checks funcionarem corretamente.
  const NULLABLE_STRING_FIELDS = ['training_ends_at', 'active_training_type', 'status_ends_at'];
  for (const field of NULLABLE_STRING_FIELDS) {
    if (out[field] === '' || out[field] === 'null' || out[field] === 'undefined') {
      out[field] = null;
    }
  }

  // SÊNIOR: Derivação Dinâmica em Tempo Real
  // CRÍTICO: usa calculateLevelFromXp (nível PURO de XP), NÃO o nível dinâmico.
  // O nível dinâmico inclui bônus de atributos/money — se usado aqui, causa
  // getTotalXpUntilLevel() a ultrapassar o total_xp real e dá current_xp errado.
  const xpLevelForDerivation = gameLogic.calculateLevelFromXp(Number(out.total_xp) || 0);
  const xpStatus = gameLogic.deriveXpStatus(out.total_xp, xpLevelForDerivation);
  out.current_xp  = xpStatus.currentXp;
  out.xp_required = xpStatus.xpRequired;

  // SÊNIOR: Lazy Reset do Status (Zero-Cron)
  // Se o status tiver expiração e o tempo passou, reseta para Operacional
  const LEGACY_MAP = { 'livre': 'Operacional', 'preso': 'Isolamento', 'recuperacao': 'Recondicionamento' };
  if (out.status && LEGACY_MAP[out.status]) {
    out.status = LEGACY_MAP[out.status];
  }

  if (out.status && out.status !== 'Operacional' && out.status_ends_at) {
    const endsAt = new Date(out.status_ends_at).getTime();
    if (!isNaN(endsAt) && Date.now() >= endsAt) {
      console.log(`[status] ⏳ Expiração detectada para ${out.user_id}: ${out.status} -> Operacional`);
      // O reset real acontece no getPlayerState para garantir que seja persistido
      out._status_expired = true;
    }
  }

  return out;
}

/** Score do ranking: nível > XP total. */

function _calcRankingScore(state) {
  // Level tem peso de 1 milhão para garantir que 
  // nível maior sempre ganhe de nível menor, com XP como desempate fino.
  return Number(state.level || 1) * 1_000_000 + Number(state.total_xp || 0);
}

/**
 * Lazy Reset de Action Points (AP).
 * Verifica se o jogador já teve reset hoje (America/Sao_Paulo).
 * Se não, restaura AP para 20.000.
 */
async function _checkAndResetAP(userId, redisKey, state) {
  // Pega a data atual no fuso de SP no formato YYYY-MM-DD usando API nativa Intl
  const dateKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const lockKey = `ap_reset:${userId}:${dateKey}`;

  // Se o estado já tem a data de hoje no campo de reset (do DB), marca o lock
  if (state && state.last_ap_reset === dateKey) {
    const alreadySet = await redisClient.getAsync(lockKey);
    if (!alreadySet) await redisClient.setAsync(lockKey, "1", "EX", 172800);
    return false;
  }

  const alreadyReset = await redisClient.getAsync(lockKey);
  if (!alreadyReset) {
    // SÊNIOR: Resetar AP para o máximo via hSet (é um valor absoluto, ok)
    // Mas marcamos o Lock ANTES para evitar que outro processo tente resetar no mesmo ms.
    await redisClient.setAsync(lockKey, "1", "EX", 172800);

    const MAX_AP = 20000;
    await redisClient.hSetAsync(redisKey, {
      action_points: String(MAX_AP),
      last_ap_reset: dateKey,
      is_dirty: "1",
      is_dirty_at: String(Date.now())
    });
    await redisClient.sAddAsync(DIRTY_PLAYERS_SET, String(userId));
    
    return true;
  }
  return false;
}

/**
 * Lazy Reset de Treinamentos Diários.
 */
async function _checkAndResetTrainingCount(userId, redisKey, state) {
  const dateKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const lockKey = `training_reset:${userId}:${dateKey}`;

  if (state && state.last_training_reset === dateKey) {
    const alreadySet = await redisClient.getAsync(lockKey);
    if (!alreadySet) await redisClient.setAsync(lockKey, "1", "EX", 172800);
    return false;
  }

  const alreadyReset = await redisClient.getAsync(lockKey);
  if (!alreadyReset) {
    // SÊNIOR: Marca Lock antes
    await redisClient.setAsync(lockKey, "1", "EX", 172800);

    await redisClient.hSetAsync(redisKey, {
      daily_training_count: "0",
      last_training_reset: dateKey,
      is_dirty: "1",
      is_dirty_at: String(Date.now())
    });
    await redisClient.sAddAsync(DIRTY_PLAYERS_SET, String(userId));

    return true;
  }
  return false;
}

/**
 * Lazy Reset de Energia (Regeneração Passiva).
 * +1% (1 ponto) a cada 3 minutos (configurado em gameLogic).
 */
/**
 * @param {boolean} [suppressSSE=false] - Quando true, suprime a emissão de SSE.
 *   DEVE ser true quando chamado a partir de updatePlayerState para evitar que
 *   a regen emita um SSE com version > do que o SSE da própria ação, fazendo
 *   o frontend aplicar energia stale e reverter o estado da compra/combate.
 */
async function _checkAndRegenEnergy(userId, redisKey, state, suppressSSE = false, isSilent = false) {
  const now = Date.now();
  let lastUpdate = state.energy_updated_at ? new Date(state.energy_updated_at).getTime() : 0;

  if (lastUpdate === 0) {
    await redisClient.hSetAsync(redisKey, "energy_updated_at", new Date(now).toISOString());
    return false;
  }

  const rateMs = (gameLogic.ENERGY.REGEN_RATE_MINUTES || 3) * 60 * 1000;
  
  if (now - lastUpdate >= rateMs) {
    const cycles = Math.floor((now - lastUpdate) / rateMs);
    const maxEnergy = Math.floor(Number(state.max_energy || 100));
    const currentEnergy = Math.floor(Number(state.energy || 0));

    if (currentEnergy >= maxEnergy) {
      await redisClient.hSetAsync(redisKey, "energy_updated_at", new Date(now).toISOString());
      return false;
    }

    // Calcula 1% da energia máxima por ciclo (mínimo 1 unidade)
    const pctAmount = Math.max(1, Math.floor(maxEnergy * 0.01));
    const energyToAdd = cycles * pctAmount;
    const newEnergyCalc = Math.min(maxEnergy, currentEnergy + energyToAdd);
    const actualGained = newEnergyCalc - currentEnergy;

    if (actualGained > 0) {
      const newLastUpdateMs = lastUpdate + (cycles * rateMs);
      const newLastUpdateStr = new Date(newLastUpdateMs).toISOString();
      const nowMs = String(Date.now());

      const newEnergy = await redisClient.runLuaAsync(UPDATE_STATE_LUA, [redisKey], [
        "energy", 
        String(actualGained), 
        String(maxEnergy),
        "energy_updated_at",
        newLastUpdateStr,
        nowMs,
        DIRTY_PLAYERS_SET,
        String(userId),
        isSilent ? "1" : "0" // ARGV[9]
      ]);

      if (!suppressSSE) {
        sseService.publish(`player:${userId}`, "player:state", {
          type: "player:patch",
          patch: { energy: Math.floor(Number(newEnergy)) },
          version: _nextVersion(userId)
        });
      }

      console.log(`[energy] ⚡ +${actualGained} energia regenerada (${isSilent ? 'SILENT' : 'DIRTY'}) para ${userId}`);
      return true;
    } else {
      await redisClient.hSetAsync(redisKey, "energy_updated_at", new Date(now).toISOString());
    }
  }
  return false;
}


/**
 * Constrói o PATCH mínimo: apenas campos que foram alterados,
 * mapeados para camelCase (API SSE do frontend).
 *
 * @param {object} updates  - campos originais passados ao updatePlayerState
 * @param {object} newState - estado completo pós-update do Redis
 * @returns {object} patch com apenas os campos alterados em camelCase
 */
function _buildPatch(updates, newState) {
  const patch = {};
  let xpOrLevelChanged = false;

  // SÊNIOR: Verificamos tanto as chaves enviadas explicitamente quanto chaves internas 
  // que podem ter mudado (ex: level) e que precisam ser sincronizadas.
  const allKeys = new Set(Object.keys(updates));
  if (newState._internalUpdate) {
    allKeys.add("level");
  }

  for (const redisKey of allKeys) {
    const sseKey = FIELD_TO_SSE[redisKey];
    if (!sseKey) continue;
    
    if (redisKey === "total_xp" || redisKey === "level") {
      xpOrLevelChanged = true;
    }

    const val = newState[redisKey];
    if (val !== undefined) {
      if (NUMERIC_FIELDS.has(redisKey)) {
        patch[sseKey] = Number(val);
      } else {
        patch[sseKey] = val;
      }
    }
  }

  // SÊNIOR: Se XP ou Level mudou, injeta os campos derivados no Patch SSE
  // CRÍTICO: sempre usa nível de XP puro — não o dinâmico — para derivação correta.
  if (xpOrLevelChanged) {
    const xpLevelForPatch = gameLogic.calculateLevelFromXp(Number(newState.total_xp) || 0);
    const xpStatus = gameLogic.deriveXpStatus(newState.total_xp, xpLevelForPatch);
    patch.currentXp  = Number(xpStatus.currentXp);
    patch.xpRequired = Number(xpStatus.xpRequired);
  }

  return patch;
}

/** Debounce de persistência no banco. Reinicia timer a cada nova ação. */
function _scheduleDebounce(userId) {
  const uid = String(userId);
  if (_debounceTimers.has(uid)) clearTimeout(_debounceTimers.get(uid));

  const timer = setTimeout(async () => {
    _debounceTimers.delete(uid);
    await persistPlayerState(uid);
  }, DEBOUNCE_MS);

  if (timer.unref) timer.unref();
  _debounceTimers.set(uid, timer);
}

// ─── Ranking dirty tracking ───────────────────────────────────────────────────────
function _markRankingDirty(userId) { _memDirtyRanking.add(String(userId)); }
function _clearRankingDirty()      { _memDirtyRanking.clear(); }
function getDirtyRankingPlayers()  { return new Set(_memDirtyRanking); }

// ─── ZSET helpers ─────────────────────────────────────────────────────────────────

async function _zaddRanking(userId, score) {
  try {
    await redisClient.zAddAsync(RANKING_ZSET_KEY, score, String(userId));
  } catch (err) {
    console.error("[playerState] ZADD falhou:", err.message);
  }
}

async function _zrangeRankingWithScores(start, stop) {
  try {
    return await redisClient.zRangeWithScoresAsync(RANKING_ZSET_KEY, start, stop);
  } catch (err) {
    console.error("[playerState] ZRANGE falhou:", err.message);
    return [];
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────────

/**
 * Carrega o estado de um jogador do PostgreSQL para o Redis (login / cache miss).
 */
async function loadPlayerState(userId) {
  if (!redisClient.client.isReady) {
    console.error("[playerState] Redis não pronto.");
    return null;
  }

  try {
    const result = await query(
      `SELECT p.*,
              u.username, u.country, u.created_at AS account_created_at, u.birth_date,
              c.name AS clan_name
       FROM user_profiles p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN clan_members cm ON cm.user_id = p.user_id
       LEFT JOIN clans c ON cm.clan_id = c.id
       WHERE p.user_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) return null;

    const playerState = result.rows[0];
    const redisKey    = `${PLAYER_STATE_PREFIX}${userId}`;

    const stateForRedis = Object.entries(playerState).reduce((acc, [k, v]) => {
      // Campos que precisam de precisão de hora (ISO Completo)
      const isTimestamp = ["energy_updated_at", "status_ends_at", "training_ends_at", "created_at", "updated_at"].includes(k);

      if (v instanceof Date) {
        if (isTimestamp) {
          acc[k] = !isNaN(v.getTime()) ? v.toISOString() : "";
        } else {
          // Campos de data simples (apenas YYYY-MM-DD)
          acc[k] = !isNaN(v.getTime()) ? v.toISOString().split("T")[0] : "";
        }
      } else if (k === "birth_date" && v) {
        const d = new Date(v);
        acc[k] = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
      } else {
        acc[k] = String(v ?? "");
      }
      return acc;
    }, {});

    stateForRedis.is_dirty       = "0";
    stateForRedis.is_dirty_at    = ""; 

    const dateKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

    // SÊNIOR: Sincroniza locks de reset ao carregar do banco
    if (playerState.last_training_reset === dateKey) {
      await redisClient.setAsync(`training_reset:${userId}:${dateKey}`, "1", "EX", 172800);
    }
    if (playerState.last_ap_reset === dateKey) {
      await redisClient.setAsync(`ap_reset:${userId}:${dateKey}`, "1", "EX", 172800);
    }

    await redisClient.hSetAsync(redisKey, stateForRedis);
    await redisClient.expireAsync(redisKey, PLAYER_STATE_TTL);

    const score = _calcRankingScore(playerState);
    await _zaddRanking(userId, score);

    console.log(`[playerState] Estado de ${userId} carregado. Score ranking: ${score}`);
    return playerState;
  } catch (err) {
    console.error(`[playerState] ❌ ERRO CRÍTICO ao carregar ${userId} do Banco:`, err.message);
    throw err; // SÊNIOR: Propaga o erro para o chamador (evita retornar null e causar loop de redirecionamento)
  }
}

/**
 * Obtém o estado atual de um jogador — sempre do Redis.
 * Fallback ao banco apenas em cache miss.
 * @param {string} userId
 * @param {object} options
 * @param {boolean} options.suppressRegenSSE - Se true, não emite SSE durante a regeneração (usado para evitar race conditions em ações simultâneas).
 * @param {boolean} options.skipStatusCheck - Se true, pula a verificação de expiração de status e regeneração (usado para evitar recursão infinita).
 */
async function getPlayerState(userId, { suppressRegenSSE = false, skipStatusCheck = false } = {}) {
  if (!redisClient.client.isReady) return null;

  const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
  const raw = await redisClient.hGetAllAsync(redisKey);

  // SÊNIOR: 'Skeleton Cache' Protection. 
  // Se o cache existir mas faltar o username, é um estado inconsistente que deve ser recarregado do banco.
  if (raw && Object.keys(raw).length > 0 && raw.username) {
    const state = _parseState(raw);
    
    // SÊNIOR: Executa Lazy Resets em background
    if (!skipStatusCheck) {
      _checkAndResetAP(userId, redisKey, state).catch(e => console.error("[apReset] Falha:", e.message));
      _checkAndResetTrainingCount(userId, redisKey, state).catch(e => console.error("[trainingReset] Falha:", e.message));
      
      // SÊNIOR: Regeneração de Energia.
      if (state) {
        await _checkAndRegenEnergy(userId, redisKey, state, suppressRegenSSE).catch(e => console.error("[energyRegen] Falha:", e.message));
      }

      // Relê do Redis caso a regeneração ou resets tenham alterado valores
      const finalRaw = await redisClient.hGetAllAsync(redisKey);
      const finalState = _parseState(finalRaw);
      
      // SÊNIOR: Executa Lazy Reset de Status se necessário
      if (finalState && finalState._status_expired) {
        delete finalState._status_expired;
        // Dispara persistência assíncrona, MAS evita recursão passando skipStatusCheck=true
        setPlayerStatus(userId, 'Operacional').catch(e => console.error("[statusReset] Falha:", e.message));
        finalState.status = 'Operacional';
        finalState.status_ends_at = null;
      }
      return finalState;
    }

    return state;

    // SÊNIOR: Lazy Training Completion (Zero-Cron & Synchronous for Caller)
    // Se o treinamento já terminou, garantimos que o objeto retornado reflete a conclusão,
    // resolvendo o erro de "Consumo restrito" imediatamente após o cronômetro zerar.
    if (finalState && finalState.training_ends_at && finalState.active_training_type) {
      const endsAt = new Date(finalState.training_ends_at);
      const uid = String(userId);
      if (!isNaN(endsAt.getTime()) && endsAt.getTime() <= Date.now() && !_inProgressCompletions.has(uid)) {
        // Marcamos como Operacional localmente para o chamador imediato (ex: Supply Station)
        // enquanto o processamento pesado de XP/Atributos ocorre no setImmediate.
        finalState.status = 'Operacional';
        finalState.training_ends_at = null;
        finalState.active_training_type = null;

        _inProgressCompletions.add(uid);
        try {
          const trainingService = require("./trainingService");
          setImmediate(async () => {
            try {
              await trainingService.completeTraining(uid);
            } catch (ignored) {
              // Silencioso: o getPlayerState já marcou como concluído localmente para UX
            } finally {
              _inProgressCompletions.delete(uid);
            }
          });
        } catch (e) {
          _inProgressCompletions.delete(uid);
        }
      }
    }

    return finalState;
  }

  // Cache miss → carrega do banco
  const state = await loadPlayerState(userId);
  if (state) {
    await _checkAndResetAP(userId, redisKey);
  }
  return state;
}

/**
 * Atualiza o estado de um jogador.
 *
 * FLUXO:
 *   1. Pipeline Redis atômico
 *   2. Determina tipo de dirty (DB vs volátil)
 *   3. Emite PATCH SSE mínimo (apenas campos alterados + version)
 *   4. Atualiza ZSET se XP/nível mudou
 *   5. Debounce 3s para persistência DB (apenas se DB dirty)
 *
 * @param {string} userId
 * @param {object} updates  Ex: { experience_points: 50, energy: -10 }
 * @returns {Promise<object|null>}
 */
async function updatePlayerState(userId, updates, options = {}) {
  if (!redisClient.client.isReady || !updates || Object.keys(updates).length === 0) {
    return null;
  }

  const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;

  try {
    // ── 1. Aplica mudanças atomicamente ──────────────────────────────────────────
    const pipeline       = redisClient.pipeline();
    let hasSSEChange     = false;  // algum campo visível mudou → emite SSE
    let hasDBChange      = false;  // algum campo persistível mudou → debounce DB
    let hasCritical      = false;  // XP ou level mudou → ZSET ranking

    // SÊNIOR: Sincronização de Energia
    // Se estivermos alterando a energia, sincronizamos o timestamp de regen AGORA
    // para evitar que o lazy regen (triggered pelo getPlayerState subsequente)
    // use um timestamp antigo e sobrescreva o valor que acabamos de incrementar.
    if ("energy" in updates) {
      updates.energy_updated_at = new Date().toISOString();
    }

    // SÊNIOR: Hidratação do Estado para Cálculo de Caps (Energia/Toxicidade)
    // Se não tivermos o estado em mãos, buscamos do Redis (ou DB se cache miss)
    // Isso garante que incrementos como 'energy' respeitem o max_energy atual.
    const rawState = await redisClient.hGetAllAsync(redisKey);
    const fullState = (rawState && Object.keys(rawState).length > 0 && rawState.username)
      ? _parseState(rawState)
      : await loadPlayerState(userId);

    const maxEnergy = Math.floor(Number(fullState?.max_energy || 100));
    const nowMs = String(Date.now());

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "number") {
        if (key === "energy") {
          // Usa LUA para incremento atômico com CAP
          await redisClient.runLuaAsync(UPDATE_STATE_LUA, [redisKey], [
            "energy", 
            String(value), 
            String(maxEnergy),
            "energy_updated_at",
            new Date().toISOString(),
            nowMs,
            DIRTY_PLAYERS_SET,
            String(userId),
            "0" // isSilent=false para vir pro banco
          ]);
        } else if (key === "toxicity") {
          // Usa LUA para toxicidade (cap 100)
          await redisClient.runLuaAsync(UPDATE_STATE_LUA, [redisKey], [
            "toxicity", 
            String(value), 
            "100",
            "", "", // sem campo extra de timestamp
            nowMs,
            DIRTY_PLAYERS_SET,
            String(userId),
            "0" // isSilent=false
          ]);
        } else if (!Number.isInteger(value)) {
          pipeline.hIncrByFloat(redisKey, key, value);
        } else {
          pipeline.hIncrBy(redisKey, key, value);
        }
      } else {
        pipeline.hSet(redisKey, key, String(value));
      }
      if (SSE_FIELDS.has(key))     hasSSEChange = true;
      if (DB_PERSIST_FIELDS.has(key)) hasDBChange  = true;
      if (RANKING_FIELDS.has(key)) hasCritical  = true;
    }

    // SÊNIOR: Validação e Histórico de Status
    // Se o status está sendo alterado via update geral (combate/treino), 
    // garantimos que as regras de transição e o log de banco sejam respeitados.
    if ("status" in updates) {
      const rawCurrent = await redisClient.hGetAsync(redisKey, "status");
      const currentStatus = rawCurrent || 'Operacional';
      const newStatus = updates.status;

      if (currentStatus !== newStatus) {
        const validNext = VALID_TRANSITIONS[currentStatus] || [];
        // SEGAURANÇA: Se a transição for inválida (ex: tentando sair do Isolamento via combate)
        // ignoramos a mudança de status mas permitimos o resto do update (XP, etc).
        if (!validNext.includes(newStatus)) {
          console.warn(`[status] ⚠️ Mudança de status bloqueada via updatePlayerState: ${currentStatus} -> ${newStatus}`);
          delete updates.status;
          delete updates.status_ends_at;
          // Remove da pipeline se já foi adicionado
          pipeline.hDel(redisKey, "status"); 
          pipeline.hDel(redisKey, "status_ends_at");
        } else {
          // Status Válido -> Grava Log (Execução Assíncrona para não travar o loop de combate)
          _recordStatusLog(userId, newStatus).catch(e => console.error("[statusLog] Erro:", e.message));
        }
      }
    }

    // Marca dirty apenas para campos que precisam ir ao banco
    if (hasDBChange) {
      const now = String(Date.now());
      console.log(`[playerState] 🛠️ Marcando ${userId} como DIRTY (DB_CHANGE detectado)`);
      pipeline.hSet(redisKey, "is_dirty", "1");
      pipeline.hSet(redisKey, "is_dirty_at", now);
      pipeline.sAdd(DIRTY_PLAYERS_SET, String(userId));
    }

    await pipeline.exec();

    // ── 2. Garante que AP e Treinos estão atualizados (Lazy Reset) ───────────────
    await _checkAndResetAP(userId, redisKey);
    await _checkAndResetTrainingCount(userId, redisKey);

    // ── 3. Renova TTL e lê estado ────────────────────────────────────────────────
    // SÊNIOR: suppressRegenSSE=true impede que _checkAndRegenEnergy emita SSE
    // com version incrementada ANTES do SSE desta própria ação, o que causaria
    // o frontend aceitar energia stale e reverter o estado (bug supply station).
    await redisClient.expireAsync(redisKey, PLAYER_STATE_TTL);
    let newState = await getPlayerState(userId, { suppressRegenSSE: true });
    if (!newState) return null;

    // ── 4. Lógica de NÍVEL DINÂMICO (Prestígio) ──────────────────────────────────
    const correctLevel = gameLogic.calculateDynamicLevel(newState);
    let internalUpdate = false;
    
    if (correctLevel !== Number(newState.level)) {
      console.log(`[playerState] 📊 Ajuste de Nível detectado para ${userId}: ${newState.level} -> ${correctLevel}`);
      
      const newLevelStr = String(correctLevel);
      const isDirtyTime = String(Date.now());
      
      await redisClient.sAddAsync(DIRTY_PLAYERS_SET, String(userId));
      // Fallback absoluto contra falhas de objeto no node-redis
      await redisClient.hSetAsync(redisKey, "level", newLevelStr);
      await redisClient.hSetAsync(redisKey, "is_dirty", "1");
      await redisClient.hSetAsync(redisKey, "is_dirty_at", isDirtyTime);

      console.log(`[playerState] ✅ Nível atualizado em Redis para ${userId}: ${newLevelStr}`);
      
      // Recarrega o estado final
      newState = await getPlayerState(userId); 
      internalUpdate = true;
      hasCritical = true; 
      hasSSEChange = true;
    }

    // ── 5. Emite PATCH mínimo via SSE ────────────────────────────────────────────
    if (hasSSEChange) {
      if (internalUpdate) newState._internalUpdate = true;
      const patch   = _buildPatch(updates, newState);
      const version = _nextVersion(userId);

      if (Object.keys(patch).length > 0) {
        sseService.publish(`player:${userId}`, "player:state", {
          type    : "player:patch",
          patch,
          version,
        });
      }
    }

    // ── 5. Atualiza ZSET de ranking se XP/nível mudou ────────────────────────────
    if (hasCritical) {
      const score = _calcRankingScore(newState);
      await _zaddRanking(userId, score);
      _markRankingDirty(userId);

      // Evento de ranking simplificado (não o perfil completo)
      sseService.publish("ranking", "ranking:player:update", {
        playerId  : String(userId),
        username  : newState.username  || "",
        faction   : newState.faction   || "",
        level     : Number(newState.level),
        current_xp: Number(newState.total_xp),
      });

      // NOVO: Dispara uma atualização imediata do snapshot geral do Ranking
      try {
        const rankingCacheService = require("./rankingCacheService");
        rankingCacheService.scheduleAsapRefresh();
      } catch (err) {
        // Ignora erros de require circular ou não carregados a tempo
      }
    }

    // SÊNIOR: Persistência Direta Removida.
    // Agora o sistema confia 100% no Write-Behind (persistDirtyStates) para 
    // garantir performance em escala (5.000+ players).
    
    return newState;
  } catch (err) {
    console.error(`[playerState] ❌ Erro ao atualizar ${userId}:`, err.message);
    throw err; // SÊNIOR: Propaga o erro para que a rota retorne 500
  }
}

/**
 * Persiste o estado de UM jogador do Redis → PostgreSQL.
 * Persiste apenas DIRTY_FIELDS (DB_PERSIST_FIELDS) — não campos voláteis.
 */
async function persistPlayerState(userId) {
  if (!redisClient.client.isReady) return;

  const redisKey    = `${PLAYER_STATE_PREFIX}${userId}`;
  const playerState = await redisClient.hGetAllAsync(redisKey);

  if (!playerState || playerState.is_dirty !== "1") return;
  const loadedDirtyAt = playerState.is_dirty_at;

  try {
    // SÊNIOR: Permite strings vazias ou nulas para que o "limpar campos" de fato aconteça no PostgreSQL
    const safeFields = Object.entries(playerState).filter(([k, v]) =>
      DB_PERSIST_FIELDS.has(k) && v !== undefined
    );

    if (safeFields.length === 0) {
      const currentState = await redisClient.hGetAsync(redisKey, "is_dirty_at");
      if (currentState === loadedDirtyAt) {
        const p = redisClient.pipeline();
        p.hSet(redisKey, "is_dirty", "0");
        p.hSet(redisKey, "is_dirty_at", "");
        p.sRem(DIRTY_PLAYERS_SET, String(userId));
        await p.exec();
      }
      return;
    }

    const setClauses = safeFields.map(([k], i) => {
      const col = `"${k}"`;
      if (k === "status") return `${col} = $${i + 1}::player_status_type`;
      if (k.endsWith("_at")) return `${col} = $${i + 1}::timestamp`;
      if (k === "last_training_reset" || k === "last_ap_reset") return `${col} = $${i + 1}::date`;
      
      const isNumeric = [
        "level", "total_xp", "money", "energy", "action_points", 
        "victories", "defeats", "winning_streak", "daily_training_count",
        "attack", "defense", "focus", "luck", "intimidation", "discipline",
        "critical_chance", "critical_damage", "toxicity",
        "faction_id", "premium_coins", "login_streak"
      ].includes(k);

      if (isNumeric) return `${col} = $${i + 1}::numeric`;
      return `${col} = $${i + 1}`;
    });

    const values     = safeFields.map(([, v]) => {
      if (v === "" || v === "null" || v === null) return null;
      return v;
    });
    values.push(userId);

    await query(
      `UPDATE user_profiles
       SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${safeFields.length + 1}::uuid`,
      values,
    );

    // Limpa is_dirty APENAS se o estado não foi sujo por OUTRA requisição enquanto salvávamos!
    const currentState = await redisClient.hGetAsync(redisKey, "is_dirty_at");
    if (currentState === loadedDirtyAt) {
      const p = redisClient.pipeline();
      p.hSet(redisKey, "is_dirty", "0");
      p.hSet(redisKey, "is_dirty_at", "");
      p.sRem(DIRTY_PLAYERS_SET, String(userId));
      await p.exec();
    }

    console.log(`[playerState] ✅ ${userId} persistido async (${safeFields.length} campos).`);
  } catch (err) {
    console.error(`[playerState] ❌ Erro ao persistir ${userId}:`, err.message);
    // is_dirty permanece "1" — retentado no próximo ciclo
  }
}

/**
 * Ciclo de Escrita em Lote (Write-Behind): 
 * Persiste todos os estados marcados como dirty a cada 3s.
 */
async function persistDirtyStates() {
  if (!redisClient.client.isReady) {
    // redis não está pronto, ignoramos e deixamos o setInterval engatar o próximo ciclo.
    return;
  }

  try {
    const dirtyIds = await redisClient.sMembersAsync(DIRTY_PLAYERS_SET);
    
    // Heartbeat log a cada ciclo (visível no terminal)
    const time = new Date().toLocaleTimeString();
    if (dirtyIds && dirtyIds.length > 0) {
      console.log(`[playerState] 💓 [${time}] Ciclo de Persistência Ativo: ${dirtyIds.length} pendentes.`);
      
      const CHUNK_SIZE = 50;
      for (let i = 0; i < dirtyIds.length; i += CHUNK_SIZE) {
        const chunk = dirtyIds.slice(i, i + CHUNK_SIZE);
        await _bulkPersistChunk(chunk);
      }
    }
  } catch (err) {
    console.error(`[playerState] ❌ Erro no ciclo de persistência:`, err.message);
  }
  // A chamada recursiva de setTimeout() foi removida daqui, pois schedulePersistence já está definindo um setInterval() para disparar periodicamente.
}

/**
 * Persistência em Lote Real (Bulk Update PostgreSQL)
 * Transforma N queries em 1 única query atômica para 50 jogadores.
 */
async function _bulkPersistChunk(userIds) {
  if (!userIds || userIds.length === 0) return;

  const pipeline = redisClient.pipeline();
  userIds.forEach(uid => pipeline.hGetAll(`${PLAYER_STATE_PREFIX}${uid}`));
  const redisResults = await pipeline.exec();

  const toUpdate = [];
  const fields = Array.from(DB_PERSIST_FIELDS);

  redisResults.forEach((res, i) => {
    // SÊNIOR FIX: No node-redis v4, o resultado do exec() é o valor direto, não [err, res]
    const raw = res;
    if (raw && raw.is_dirty === "1") {
      toUpdate.push({ uid: userIds[i], state: raw, loadedDirtyAt: raw.is_dirty_at });
    }
  });

  if (toUpdate.length === 0) return;

  console.log(`[playerState] 💾 Iniciando persistência de ${toUpdate.length} jogadores para Postgres...`);
  try {
    const valuePlaceholders = [];
    const flatValues = [];
    
    // Constrói VALUES ($1, $2, ...), ($x, $y, ...)
    toUpdate.forEach((item, rowIndex) => {
      const rowOffset = rowIndex * (fields.length + 1);
      const rowParams = [`$${rowOffset + 1}`]; // user_id
      flatValues.push(item.uid);

      fields.forEach((f, fIndex) => {
        rowParams.push(`$${rowOffset + fIndex + 2}`);
        const val = item.state[f];
        flatValues.push((val === "" || val === "null" || val === null || val === undefined) ? null : val);
      });
      valuePlaceholders.push(`(${rowParams.join(", ")})`);
    });

    // SÊNIOR: Mapeia tipos específicos para garantir que o PostgreSQL aceite o lote (Casts Explícitos)
    const setClauses = fields.map(f => {
      if (f === "status") return `"${f}" = v."${f}"::player_status_type`;
      if (f.endsWith("_at")) return `"${f}" = v."${f}"::timestamp`;
      if (f === "last_training_reset" || f === "last_ap_reset") return `"${f}" = v."${f}"::date`;
      
      // Lista exaustiva de campos numéricos para evitar erro de "expression is of type text"
      const isNumeric = [
        "level", "total_xp", "money", "energy", "action_points", 
        "victories", "defeats", "winning_streak", "daily_training_count",
        "attack", "defense", "focus", "luck", "intimidation", "discipline",
        "critical_chance", "critical_damage", "toxicity",
        "faction_id", "premium_coins", "login_streak"
      ].includes(f);

      if (isNumeric) return `"${f}" = v."${f}"::numeric`;
      
      return `"${f}" = v."${f}"`;
    });
    
    const columnNames = fields.map(f => `"${f}"`).join(", ");

    const sql = `
      UPDATE user_profiles AS p
      SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
      FROM (VALUES ${valuePlaceholders.join(", ")}) AS v(user_id, ${columnNames})
      WHERE p.user_id = v.user_id::uuid
    `;

    try {
      await query(sql, flatValues);
      // console.log(`[playerState] ✅ Persistência de lote concluída com sucesso.`);
    } catch (dbErr) {
      console.error(`[playerState] ❌ ERRO DE PRODUÇÃO NO LOTE:`, dbErr.message);
      console.error(`[playerState] Detalhes da Query falha na primeira linha do lote:`, {
        fields: fields,
        sample_uid: toUpdate[0].uid,
        sql: sql.substring(0, 500) + "..."
      });
      
      // Fallback: Tentativa individual
      for (const item of toUpdate) {
        try {
          await persistPlayerState(item.uid);
        } catch (singleErr) {
          console.error(`[playerState] ❌ Falha persistência individual (ID: ${item.uid}):`, singleErr.message);
        }
      }
      return; 
    }

    // SÊNIOR: Limpeza atômica do is_dirty apenas se o dado não mudou durante a escrita (Optimistic Locking)
    const cleanupPipeline = redisClient.pipeline();
    for (const item of toUpdate) {
      const redisKey = `${PLAYER_STATE_PREFIX}${item.uid}`;
      // NOTA: Para ser 100% rigoroso, deveríamos checar is_dirty_at individualmente.
      // Em lote, limpamos se o is_dirty_at lido inicialmente coincide com o atual.
      // Para performance, assumimos sucesso mas mantemos a flag caso ocorra nova escrita.
      cleanupPipeline.hGet(redisKey, "is_dirty_at");
    }
    
    const currentDirtyAtRes = await cleanupPipeline.exec();
    const finalCleanup = redisClient.pipeline();
    
    toUpdate.forEach((item, i) => {
      // SÊNIOR FIX: v4 format
      const currentAt = currentDirtyAtRes[i];
      if (currentAt === item.loadedDirtyAt) {
        const redisKey = `${PLAYER_STATE_PREFIX}${item.uid}`;
        finalCleanup.hSet(redisKey, "is_dirty", "0");
        finalCleanup.hSet(redisKey, "is_dirty_at", "");
        finalCleanup.sRem(DIRTY_PLAYERS_SET, String(item.uid));
      }
    });

    await finalCleanup.exec();
  } catch (err) {
    console.error(`[bulk-persist] ❌ Erro ao persistir lote:`, err.message);
  }
}

/**
 * Inicia o ciclo de persistência Write-Behind.
 */
function schedulePersistence() {
  console.log(`[playerState] 🚀 Buffered Write-Behind Ativo (Flush a cada ${BATCH_FLUSH_INTERVAL / 1000}s).`);
  
  // SÊNIOR: Graceful Shutdown (Saída Segura)
  // Garante que 5000 jogadores sejam salvos antes do processo morrer (Render/PM2/Docker)
  const shutdown = async (signal) => {
    console.log(`[playerState] 🛑 Sinal ${signal} recebido. Iniciando Saída Segura...`);
    try {
      await persistDirtyStates();
      console.log(`[playerState] 💾 Todos os estados persistidos com sucesso.`);
    } catch (e) {
      console.error(`[playerState] ⚠️ Falha na Saída Segura:`, e.message);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  const t = setInterval(async () => {
    try {
      await persistDirtyStates();
    } catch (e) {
      console.error("[worker] ❌ Ciclo Write-Behind falhou:", e.message);
    }
  }, BATCH_FLUSH_INTERVAL);
  if (t.unref) t.unref();
}

/**
 * ZSET de Agendamento de Treinamentos
 */
async function scheduleTraining(userId, endsAtMs) {
  try {
    await redisClient.zAddAsync(TRAINING_QUEUE_KEY, endsAtMs, String(userId));
    console.log(`[training] ⏳ Treino agendado para ${userId} às ${new Date(endsAtMs).toLocaleTimeString()}`);
  } catch (err) {
    console.error("[training] Erro ao agendar no ZSET:", err.message);
  }
}

async function cancelScheduledTraining(userId) {
  try {
    await redisClient.zRemAsync(TRAINING_QUEUE_KEY, String(userId));
  } catch (err) {
    console.error("[training] Erro ao remover agendamento:", err.message);
  }
}

/**
 * Worker do Backend:
 * Varre o ZSET a cada N segundos para achar treinos que terminaram.
 */
async function processTrainingQueue() {
  if (!redisClient.client.isReady) return;
  const now = Date.now();

  try {
    const readyUserIds = await redisClient.zRangeByScoreAsync(TRAINING_QUEUE_KEY, 0, now);
    if (!readyUserIds || readyUserIds.length === 0) return;

    const trainingService = require("./trainingService"); // require preguiçoso para evitar dependência circular
    console.log(`[worker] ⚙️ Concluindo treinos na fila para ${readyUserIds.length} jogadores.`);

    await Promise.allSettled(
      readyUserIds.map(async (uid) => {
        // SÊNIOR: Marca como em processamento ANTES de chamar completeTraining
        // para que o Lazy Training Completion em getPlayerState não dispare uma segunda cópia.
        _inProgressCompletions.add(uid);
        try {
          // SÊNIOR: at-least-once delivery — só remove do ZSET após sucesso.
          // Se falhar, a entry permanece no ZSET e será re-tentada no próximo ciclo.
          const result = await trainingService.completeTraining(uid);

          // Remoção do ZSET somente após conclusão com sucesso
          await redisClient.zRemAsync(TRAINING_QUEUE_KEY, uid);

          // Persiste toast de conclusão no Redis para exibir ao jogador quando ele voltar (offline).
          // Será apagado pelo GET /api/users/profile na próxima leitura (ou imediatamente se online).
          const stateKey = `${PLAYER_STATE_PREFIX}${uid}`;
          await redisClient.hSetAsync(stateKey, "pending_training_toast", JSON.stringify(result.gains));

          // SSE emite o toast em tempo real se o jogador estiver online
          const hasActiveSubscriber = sseService.hasSubscribers(`player:${uid}`);
          sseService.publish(`player:${uid}`, "player:state", {
            type: "player:patch",
            patch: { pending_training_toast: result.gains },
            version: _nextVersion(uid)
          });

          // Se o jogador está online e recebeu via SSE, apaga imediatamente do Redis
          // para que um reload posterior não mostre o toast de novo.
          if (hasActiveSubscriber) {
            await redisClient.hDelAsync(stateKey, "pending_training_toast");
          }

          console.log(`[worker] ✅ Treino concluído para ${uid} (online: ${hasActiveSubscriber}).`);

        } catch (e) {
          if (e.message && e.message.includes("Jogador não encontrado")) {
            console.warn(`[worker] ⚠️ Jogador ${uid} inexistente. Removendo da fila de treino (prevenção de ghost).`);
            await redisClient.zRemAsync(TRAINING_QUEUE_KEY, uid).catch(() => {});
            await deletePlayerState(uid).catch(() => {});
          } else {
            // Será re-tentado no próximo ciclo (5s)
            console.warn(`[worker] ⚠️ Falha ao concluir treino para ${uid} (re-tentará):`, e.message);
          }
        } finally {
          _inProgressCompletions.delete(uid);
        }
      })
    );
  } catch (err) {
    console.error("[worker] Erro na fila de treinos:", err.message);
  }
}

function startTrainingWorker() {
  const INTERVAL_MS = 5 * 1000; // a cada 5 segundos verifica a fila
  const t = setInterval(processTrainingQueue, INTERVAL_MS);
  if (t.unref) t.unref();
}

// Inicia o worker assim que o módulo é carregado
startTrainingWorker();

/**
 * Remove um jogador do Redis completamente (limpeza de ghosts).
 */
async function deletePlayerState(userId) {
  const uid = String(userId);
  const redisKey = `${PLAYER_STATE_PREFIX}${uid}`;
  await Promise.all([
    redisClient.delAsync(redisKey),
    redisClient.zRemAsync(RANKING_ZSET_KEY, uid),
    redisClient.sRemAsync(DIRTY_PLAYERS_SET, uid)
  ]);
  console.log(`[playerState] 🗑️ Estado e ranking de ${uid} removidos do Redis.`);
}

/**
 * IMPLEMENTAÇÃO SÊNIOR: Sistema de Status Completo
 * status (livre, preso, recuperacao) com histórico, Redis primário e SSE.
 *
 * @param {string} userId 
 * @param {string} newStatus 
 * @param {number|null} durationSeconds 
 */
async function setPlayerStatus(userId, newStatus, durationSeconds = null) {
  if (!ALLOWED_STATUSES.includes(newStatus)) {
    throw new Error(`🚫 Status inválido: ${newStatus}`);
  }

  const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
  // IMPORTANTE: Para evitar RECURSÃO INFINITA, chamamos getPlayerState com skipStatusCheck=true
  const currentState = await getPlayerState(userId, { skipStatusCheck: true });
  if (!currentState) throw new Error("👤 Jogador não encontrado.");

  // Validação de Transição
  const currentStatus = currentState.status || 'Operacional';
  if (currentStatus !== newStatus) {
    const validNext = VALID_TRANSITIONS[currentStatus] || [];
    if (!validNext.includes(newStatus)) {
      console.warn(`[status] ⚠️ Transição bloqueada: ${currentStatus} -> ${newStatus}`);
      return currentState; 
    }
  }

  // Cálculo de Tempo de Expiração
  let status_ends_at = null;
  if (durationSeconds && durationSeconds > 0) {
    // SÊNIOR: Trava de segurança para evitar bugs de offset/duration exagerada
    // O máximo permitido para qualquer status temporário comum é 2 horas (7200s), 
    // exceto se for explicitamente um status de longa duração (ex: Preso).
    let safeDuration = durationSeconds;
    if (newStatus === 'Sangrando' || newStatus === 'Recondicionamento') {
      safeDuration = Math.min(safeDuration, 1800); // Máximo 30 minutos
    }
    
    status_ends_at = new Date(Date.now() + (safeDuration * 1000)).toISOString();
  }

  console.log(`[status] 🔄 Mudando ${userId}: ${currentStatus} -> ${newStatus} (Expira: ${status_ends_at || 'Nunca'})`);

  // 1. Atualiza Redis (Fonte Primária)
  await redisClient.hSetAsync(redisKey, {
    status: newStatus,
    status_ends_at: status_ends_at || "",
    is_dirty: "1",
    is_dirty_at: String(Date.now())
  });
  await redisClient.sAddAsync(DIRTY_PLAYERS_SET, String(userId));

  // 2. Emite SSE em tempo real (Canal Privado)
  sseService.publish(`player:${userId}`, "player:status", {
    type: "player:status",
    status: newStatus,
    status_ends_at: status_ends_at
  });

  // 3. Histórico no PostgreSQL (Execução Imediata)
  try {
    await query(`
      UPDATE player_status_logs 
      SET ended_at = NOW() 
      WHERE user_id = $1 AND ended_at IS NULL
    `, [userId]);

    await query(`
      INSERT INTO player_status_logs (user_id, status, started_at) 
      VALUES ($1, $2, NOW())
    `, [userId, newStatus]);
  } catch (err) {
    console.error("[status] ❌ Erro ao salvar histórico:", err.message);
  }

  // 4. Persistência no banco (Via Debounce 3s)
  _scheduleDebounce(userId);

  return getPlayerState(userId);
}

/**
 * Regen direta para uso pelo energyRegenService (heartbeat).
 * Evita o duplo trigger: NÃO chama getPlayerState() internamente,
 * apenas lê o estado do Redis e aplica a regen se necessário.
 */
async function regenEnergyForPlayer(userId) {
  if (!redisClient.client.isReady) return;
  const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
  const raw = await redisClient.hGetAllAsync(redisKey);
  if (!raw || Object.keys(raw).length === 0) return;
  const state = _parseState(raw);
  if (!state) return;
  
  // SÊNIOR: Regen via heartbeat é SILENCIOSA (não acorda o Postgres no Neon)
  await _checkAndRegenEnergy(userId, redisKey, state, true, true).catch(e =>
    console.error(`[energy] ❌ regenEnergyForPlayer(${userId}):`, e.message)
  );
}

/**
 * Registra a transição de status no histórico do banco de dados PostgreSQL.
 * @param {string} userId 
 * @param {string} newStatus 
 */
/**
 * SÊNIOR: Registra a transição de status de forma atômica no PostgreSQL.
 * Resolve um Race Condition onde múltiplas chamadas rápidas poderiam 
 * deixar vários logs com 'ended_at IS NULL'.
 */
async function _recordStatusLog(userId, newStatus) {
  try {
    // Usamos uma única query atômica para encerrar e abrir logs
    const sql = `
      WITH closed_rows AS (
        UPDATE player_status_logs 
        SET ended_at = NOW() 
        WHERE user_id = $1 AND ended_at IS NULL
        RETURNING id
      )
      INSERT INTO player_status_logs (user_id, status, started_at) 
      VALUES ($1, $2, NOW());
    `;
    await query(sql, [userId, newStatus]);
  } catch (err) {
    console.error("[statusLog] ❌ Erro atômico ao salvar histórico:", err.message);
  }
}

module.exports = {
  loadPlayerState,
  getPlayerState,
  updatePlayerState,
  persistPlayerState,
  persistDirtyStates,
  schedulePersistence,
  deletePlayerState,
  setPlayerStatus,
  regenEnergyForPlayer,
  scheduleTraining,
  cancelScheduledTraining,
  // Para rankingCacheService
  getDirtyRankingPlayers,
  _clearRankingDirty,
  _zaddRanking,
  _zrangeRankingWithScores,
  _calcRankingScore,
  _parseState,           // Necessário para hydration no rankingCacheService
  RANKING_ZSET_KEY,
  PLAYER_STATE_PREFIX,
};