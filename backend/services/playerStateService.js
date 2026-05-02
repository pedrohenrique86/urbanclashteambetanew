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
module.exports.PLAYER_STATE_PREFIX = PLAYER_STATE_PREFIX;
const RANKING_ZSET_KEY      = "ranking:users:zset";
const PLAYER_STATE_TTL      = 60 * 60 * 24; // 24 horas (otimizado para Oracle VM) inatividade
const DEBOUNCE_MS           = 3000;        // debounce primário antes do DB
const PERSIST_BATCH_SIZE    = 50;          // máx players por lote no safety-net
const SAFETY_STALENESS_MS   = 12_000;      // safety-net só persiste dirty > 12s
const DIRTY_PLAYERS_SET     = "player:dirty:set";
const TRAINING_QUEUE_KEY    = "queue:trainings";

// ─── Campos que afetam o ranking (ZSET) e o Nível Dinâmico ────────────────────────
const RANKING_FIELDS = new Set(["total_xp", "level", "attack", "defense", "focus", "money"]);

// ─── Dirty TIPO 1: campos que DEVEM ser persistidos no banco ─────────────────────
// Subconjunto de DB_PERSIST_FIELDS — apenas dados de progressão permanente
const DB_PERSIST_FIELDS = new Set([
  "total_xp", "level",
  "attack", "defense", "focus", "luck",
  "critical_chance", "critical_damage",
  "intimidation", "discipline",
  "money",
  "victories", "defeats", "winning_streak",
  "status", "status_ends_at",
  "recovery_ends_at", "shield_ends_at",   // campos de PvP — persistidos para sobreviver restart/cache miss
  "training_ends_at", "daily_training_count", "last_training_reset", "active_training_type",
  "energy", "action_points", "last_ap_reset",
  "energy_updated_at", "toxicity"
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
};

// ─── Campos numéricos no Redis Hash ──────────────────────────────────────────────
const NUMERIC_FIELDS = new Set([
  "level", "total_xp", "energy", "max_energy", "action_points",
  "attack", "defense", "focus", "luck", "critical_damage", "critical_chance",
  "money", "intimidation", "discipline", "victories", "defeats", 
  "winning_streak", "daily_training_count", "toxicity"
]);

// ─── Estado interno ───────────────────────────────────────────────────────────────
const _debounceTimers  = new Map();  // userId → timer handle
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
        if (['attack', 'defense', 'focus'].includes(field)) {
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
async function _checkAndRegenEnergy(userId, redisKey, state) {
  const now = Date.now();
  
  // SÊNIOR: Validação de Timestamp. Redis pode retornar "" ou "null".
  let lastUpdate;
  if (!state.energy_updated_at || state.energy_updated_at === "") {
    lastUpdate = now;
    await redisClient.hSetAsync(redisKey, "energy_updated_at", new Date(now).toISOString());
    return false;
  } else {
    lastUpdate = new Date(state.energy_updated_at).getTime();
    // Proteção contra data inválida que trava regeneração
    if (isNaN(lastUpdate)) {
      console.error(`[energy] ⚠️ Data inválida para ${userId}: ${state.energy_updated_at}. Resetando.`);
      lastUpdate = now;
      await redisClient.hSetAsync(redisKey, "energy_updated_at", new Date(now).toISOString());
      return false;
    }
    // CRÍTICO: Proteção contra timestamp no FUTURO (skew de relógio / bug)
    if (lastUpdate > now) {
      const skewSeconds = Math.round((lastUpdate - now) / 1000);
      console.warn(`[energy] ⚠️ Timestamp no FUTURO para ${userId} (skew: +${skewSeconds}s). Resetando para agora.`);
      lastUpdate = now;
      await redisClient.hSetAsync(redisKey, "energy_updated_at", new Date(now).toISOString());
      return false;
    }
  }

  const rateMs = (gameLogic.ENERGY.REGEN_RATE_MINUTES || 3) * 60 * 1000;
  
  if (now - lastUpdate >= rateMs) {
    const cycles = Math.floor((now - lastUpdate) / rateMs);
    const maxEnergy = Math.floor(Number(state.max_energy || 100));
    
    // SÊNIOR: Relê a energia atual DIRETO do Redis antes de calcular a regen
    // para minimizar a janela de race condition com updatePlayerState (comer/combate).
    const currentEnergyStr = await redisClient.hGetAsync(redisKey, "energy");
    const currentEnergy = Math.floor(Number(currentEnergyStr || 0));

    // Se já estiver no máximo, apenas empurra o timestamp para o 'agora'
    if (currentEnergy >= maxEnergy) {
      await redisClient.hSetAsync(redisKey, "energy_updated_at", new Date(now).toISOString());
      return false;
    }

    const energyToAdd = cycles * Math.floor(gameLogic.ENERGY.REGEN_AMOUNT || 1);
    const newEnergy = Math.min(maxEnergy, currentEnergy + energyToAdd);
    const actualGained = newEnergy - currentEnergy;

    if (actualGained > 0) {
      const newLastUpdateMs = lastUpdate + (cycles * rateMs);
      const newLastUpdateStr = new Date(newLastUpdateMs).toISOString();

      // USA PIPELINE para garantir atomicidade entre o set de energia e o timestamp
      const p = redisClient.pipeline();
      p.hSet(redisKey, "energy", String(Math.floor(newEnergy)));
      p.hSet(redisKey, "energy_updated_at", newLastUpdateStr);
      p.hSet(redisKey, "is_dirty", "1");
      p.hSet(redisKey, "is_dirty_at", String(Date.now()));
      p.sAdd(DIRTY_PLAYERS_SET, String(userId));
      await p.exec();

      // Emite SSE para feedback visual imediato
      sseService.publish(`player:${userId}`, "player:state", {
        type: "player:patch",
        patch: { energy: Math.floor(newEnergy) },
        version: _nextVersion(userId)
      });

      console.log(`[energy] ⚡ +${actualGained} energia regenerada para ${userId} (${cycles} ciclos)`);
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
    console.error(`[playerState] Erro ao carregar ${userId}:`, err.message);
    return null;
  }
}

/**
 * Obtém o estado atual de um jogador — sempre do Redis.
 * Fallback ao banco apenas em cache miss.
 */
async function getPlayerState(userId) {
  if (!redisClient.client.isReady) return null;

  const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
  const raw = await redisClient.hGetAllAsync(redisKey);

  if (raw && Object.keys(raw).length > 0) {
    const state = _parseState(raw);
    
    // Executa Lazy Resets em background
    _checkAndResetAP(userId, redisKey, state).catch(e => console.error("[apReset] Falha:", e.message));
    _checkAndResetTrainingCount(userId, redisKey, state).catch(e => console.error("[trainingReset] Falha:", e.message));
    
    // SÊNIOR: Regeneração de Energia
    if (state) {
      await _checkAndRegenEnergy(userId, redisKey, state).catch(e => console.error("[energyRegen] Falha:", e.message));
    }

    // Relê do Redis caso a regeneração ou resets tenham alterado valores
    const finalRaw = await redisClient.hGetAllAsync(redisKey);
    const finalState = _parseState(finalRaw);
    
    // SÊNIOR: Executa Lazy Reset de Status se necessário
    if (finalState && finalState._status_expired) {
      delete finalState._status_expired;
      setPlayerStatus(userId, 'Operacional').catch(e => console.error("[statusReset] Falha:", e.message));
      finalState.status = 'Operacional';
      finalState.status_ends_at = null;
    }

    // SÊNIOR: Lazy Training Completion
    // Se o treinamento já terminou e NÃO está sendo processado pelo worker,
    // completamos agora na leitura (robusto a worker crashes/delays)
    if (finalState && finalState.training_ends_at && finalState.active_training_type) {
      const endsAt = new Date(finalState.training_ends_at);
      const uid = String(userId);
      if (!isNaN(endsAt.getTime()) && endsAt.getTime() <= Date.now() && !_inProgressCompletions.has(uid)) {
        _inProgressCompletions.add(uid);
        try {
          const trainingService = require("./trainingService");
          // Executa assíncrono — SSE/Ranking atualizarão em ms após conclusion.
          setImmediate(async () => {
            try {
              await trainingService.completeTraining(uid);
            } catch (ignored) {}
            finally {
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
async function updatePlayerState(userId, updates) {
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

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "number") {
        if (!Number.isInteger(value)) {
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

    // Marca dirty apenas para campos que precisam ir ao banco
    if (hasDBChange) {
      const now = String(Date.now());
      pipeline.hSet(redisKey, "is_dirty", "1");
      pipeline.hSet(redisKey, "is_dirty_at", now);  // timestamp para o safety-net
      pipeline.sAdd(DIRTY_PLAYERS_SET, String(userId));
    }

    await pipeline.exec();

    // ── 2. Garante que AP e Treinos estão atualizados (Lazy Reset) ───────────────
    await _checkAndResetAP(userId, redisKey);
    await _checkAndResetTrainingCount(userId, redisKey);

    // ── 3. Renova TTL e lê estado ────────────────────────────────────────────────
    await redisClient.expireAsync(redisKey, PLAYER_STATE_TTL);
    let newState = await getPlayerState(userId);
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

    // ── 6. Agenda debounce para DB apenas se campos persistíveis mudaram ─────────
    if (hasDBChange) {
      _scheduleDebounce(userId);
    }

    return newState;
  } catch (err) {
    console.error(`[playerState] Erro ao atualizar ${userId}:`, err.message);
    return null;
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

  try {
    // SÊNIOR: Permite strings vazias ou nulas para que o "limpar campos" de fato aconteça no PostgreSQL
    const safeFields = Object.entries(playerState).filter(([k, v]) =>
      DB_PERSIST_FIELDS.has(k) && v !== undefined
    );

    if (safeFields.length === 0) {
      await redisClient.hSetAsync(redisKey, "is_dirty", "0");
      return;
    }

    const setClauses = safeFields.map(([k], i) => `${k} = $${i + 1}`);
    const values     = safeFields.map(([, v]) => {
      if (v === "" || v === "null" || v === null) return null;
      return v;
    });
    values.push(userId);

    await query(
      `UPDATE user_profiles
       SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${safeFields.length + 1}`,
      values,
    );

    await redisClient.hSetAsync(redisKey, { is_dirty: "0", is_dirty_at: "" });
    await redisClient.sRemAsync(DIRTY_PLAYERS_SET, String(userId));
    console.log(`[playerState] ✅ ${userId} persistido (${safeFields.length} campos).`);
  } catch (err) {
    console.error(`[playerState] ❌ Erro ao persistir ${userId}:`, err.message);
    // is_dirty permanece "1" — retentado no próximo ciclo
  }
}

/**
 * Safety-net: persiste apenas estados dirty há mais de SAFETY_STALENESS_MS.
 * NÃO processa todos os jogadores — verifica o timestamp is_dirty_at.
 * NÃO duplica debounce: ignora entradas com debounce ativo.
 */
async function persistDirtyStates() {
  if (!redisClient.client.isReady) return;

  const now      = Date.now();
  const staleMin = now - SAFETY_STALENESS_MS;

  try {
    const dirtyIds = await redisClient.sMembersAsync(DIRTY_PLAYERS_SET);
    if (!dirtyIds || dirtyIds.length === 0) return;

    const staleIds = [];

    for (const uid of dirtyIds) {
      const key = `${PLAYER_STATE_PREFIX}${uid}`;
      const [isDirty, dirtyAt] = await Promise.all([
        redisClient.hGetAsync(key, "is_dirty"),
        redisClient.hGetAsync(key, "is_dirty_at"),
      ]);

      if (isDirty !== "1") {
        // Limpeza de orfãos no set
        await redisClient.sRemAsync(DIRTY_PLAYERS_SET, uid);
        continue;
      }

      // Pula se ainda há um debounce ativo para este jogador
      if (_debounceTimers.has(uid)) continue;

      // Pula se ficou dirty há menos de SAFETY_STALENESS_MS
      const dirtyAtMs = Number(dirtyAt || 0);
      if (dirtyAtMs > staleMin) continue;

      staleIds.push(uid);
    }

    if (staleIds.length === 0) return;

    console.log(`[playerState] 🔄 Safety-net: ${staleIds.length} estados stale para persistir.`);

    for (let i = 0; i < staleIds.length; i += PERSIST_BATCH_SIZE) {
      const batch = staleIds.slice(i, i + PERSIST_BATCH_SIZE);
      await Promise.allSettled(batch.map((uid) => persistPlayerState(uid)));
    }

    console.log("[playerState] ✅ Safety-net concluído.");
  } catch (err) {
    console.error("[playerState] ❌ Erro no safety-net:", err.message);
  }
}

/**
 * Inicia o safety-net de persistência a cada 2 minutos.
 * O debounce de 3s é o mecanismo primário — este é o fallback para
 * casos onde o debounce não disparou (ex: servidor reiniciou).
 */
function schedulePersistence() {
  const INTERVAL_MS = 2 * 60 * 1000;
  console.log(`[playerState] 🚀 Safety-net ativo (a cada ${INTERVAL_MS / 1000}s, staleness >${SAFETY_STALENESS_MS / 1000}s).`);
  const t = setInterval(persistDirtyStates, INTERVAL_MS);
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
          // NÃO remove do ZSET — será re-tentado no próximo ciclo (5s)
          console.warn(`[worker] ⚠️ Falha ao concluir treino para ${uid} (re-tentará):`, e.message);
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
  const currentState = await getPlayerState(userId);
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
  await _checkAndRegenEnergy(userId, redisKey, state).catch(e =>
    console.error(`[energy] ❌ regenEnergyForPlayer(${userId}):`, e.message)
  );
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