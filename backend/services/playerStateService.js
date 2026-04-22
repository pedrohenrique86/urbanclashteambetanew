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
const PLAYER_TTL_SECONDS    = 3600 * 6;   // 6h inatividade
const DEBOUNCE_MS           = 3000;        // debounce primário antes do DB
const PERSIST_BATCH_SIZE    = 50;          // máx players por lote no safety-net
const SAFETY_STALENESS_MS   = 12_000;      // safety-net só persiste dirty > 12s

// ─── Campos que afetam o ranking (ZSET) ──────────────────────────────────────────
const RANKING_FIELDS = new Set(["total_xp", "level"]);

// ─── Dirty TIPO 1: campos que DEVEM ser persistidos no banco ─────────────────────
// Subconjunto de DB_PERSIST_FIELDS — apenas dados de progressão permanente
const DB_PERSIST_FIELDS = new Set([
  "total_xp", "level",
  "attack", "defense", "focus",
  "critical_chance", "critical_damage",
  "intimidation", "discipline",
  "money",
  "victories", "defeats", "winning_streak",
  "status", "status_ends_at",
]);

// ─── Dirty TIPO 2: campos voláteis (NÃO persistem no safety-net, só via debounce
//                   quando absolutamente necessário — energia regenera sozinha)
const VOLATILE_FIELDS = new Set([
  "energy", "max_energy",
  "action_points",
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
};

// ─── Campos numéricos no Redis Hash ──────────────────────────────────────────────
const NUMERIC_FIELDS = new Set(Object.keys(FIELD_TO_SSE));

// ─── Estado interno ───────────────────────────────────────────────────────────────
const _debounceTimers  = new Map();  // userId → timer handle
const _memDirtyRanking = new Set();  // userId → mudança de XP/nível (para ranking)

// Contador de versão por jogador para consistência do PATCH no frontend
const _versionMap = new Map();       // userId → number

// ─── Status Constants ─────────────────────────────────────────────────────────────
const ALLOWED_STATUSES = ['Operacional', 'Isolamento', 'Recondicionamento'];
const VALID_TRANSITIONS = {
  'Operacional':     ['Isolamento', 'Recondicionamento'],
  'Isolamento':      ['Operacional'],
  'Recondicionamento': ['Operacional']
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
      const n = Number(out[field]);
      if (!isNaN(n)) out[field] = n;
    }
  }

  // SÊNIOR: Derivação Dinâmica em Tempo Real
  // Nunca salva current_xp ou xp_required no Redis/DB.
  const xpStatus = gameLogic.deriveXpStatus(out.total_xp, out.level);
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
async function _checkAndResetAP(userId, redisKey) {
  // Pega a data atual no fuso de SP no formato YYYY-MM-DD usando API nativa Intl
  const dateKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const lockKey = `ap_reset:${userId}:${dateKey}`;

  const alreadyReset = await redisClient.getAsync(lockKey);
  if (!alreadyReset) {
    // Resetar AP para o máximo
    const MAX_AP = 20000;
    await redisClient.hSetAsync(redisKey, {
      action_points: String(MAX_AP),
      is_dirty: "1",
      is_dirty_at: String(Date.now())
    });

    // Marcar reset do dia com TTL de 48h
    await redisClient.setAsync(lockKey, "1", "EX", 172800);
    
    return true;
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

  for (const redisKey of Object.keys(updates)) {
    const sseKey = FIELD_TO_SSE[redisKey];
    if (!sseKey) continue;
    
    if (redisKey === "total_xp" || redisKey === "level") {
      xpOrLevelChanged = true;
    }

    const val = newState[redisKey];
    if (val !== undefined) patch[sseKey] = Number(val);
  }

  // SÊNIOR: Se XP ou Level mudou, injeta os campos derivados no Patch SSE
  if (xpOrLevelChanged) {
    const xpStatus = gameLogic.deriveXpStatus(newState.total_xp, newState.level);
    patch.currentXp  = xpStatus.currentXp;
    patch.xpRequired = xpStatus.xpRequired;
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
      if (v instanceof Date) {
        acc[k] = !isNaN(v.getTime()) ? v.toISOString().split("T")[0] : "";
      } else if (k === "birth_date" && v) {
        const d = new Date(v);
        acc[k] = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
      } else {
        acc[k] = String(v ?? "");
      }
      return acc;
    }, {});

    stateForRedis.is_dirty       = "0";
    stateForRedis.is_dirty_at    = "";   // timestamp da última vez que ficou dirty

    await redisClient.hSetAsync(redisKey, stateForRedis);
    await redisClient.expireAsync(redisKey, PLAYER_TTL_SECONDS);

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
    // Executa Lazy Reset de AP em background (não bloqueia a leitura)
    _checkAndResetAP(userId, redisKey).catch(e => console.error("[apReset] Falha:", e.message));
    
    const parsed = _parseState(raw);
    
    // SÊNIOR: Executa Lazy Reset de Status se necessário
    if (parsed && parsed._status_expired) {
      delete parsed._status_expired;
      setPlayerStatus(userId, 'Operacional').catch(e => console.error("[statusReset] Falha:", e.message));
      parsed.status = 'Operacional';
      parsed.status_ends_at = null;
    }

    return parsed;
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

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "number") {
        pipeline.hIncrBy(redisKey, key, value);
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
    }

    await pipeline.exec();

    // ── 2. Garante que AP está atualizado (Lazy Reset) ───────────────────────────
    await _checkAndResetAP(userId, redisKey);

    // ── 3. Renova TTL e lê estado ────────────────────────────────────────────────
    await redisClient.expireAsync(redisKey, PLAYER_TTL_SECONDS);
    let newState = await getPlayerState(userId);
    if (!newState) return null;

    // ── 4. Lógica de LEVEL UP Automática (Robustez Sênior) ────────────────────────
    const correctLevel = gameLogic.calculateLevelFromXp(newState.total_xp);
    
    // Suporta múltiplos level-ups (ex: ganha 1000 XP de uma vez)
    if (correctLevel > newState.level) {
      console.log(`[playerState] 🆙 Level UP detectado para ${userId}: ${newState.level} -> ${correctLevel}`);
      
      await redisClient.hSetAsync(redisKey, {
        level: String(correctLevel),
        is_dirty: "1",
        is_dirty_at: String(Date.now())
      });
      
      // Recarrega estado com os campos de XP recalculados para o novo nível
      newState = await getPlayerState(userId); 
      hasCritical = true; 
      hasSSEChange = true; // Garante que o patch via SSE leve o novo level/xp status
    }

    // ── 5. Emite PATCH mínimo via SSE ────────────────────────────────────────────
    if (hasSSEChange) {
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
    // Filtra apenas campos que devem ir ao banco
    const safeFields = Object.entries(playerState).filter(([k, v]) =>
      DB_PERSIST_FIELDS.has(k) && v !== "" && v !== undefined && v !== null,
    );

    if (safeFields.length === 0) {
      await redisClient.hSetAsync(redisKey, "is_dirty", "0");
      return;
    }

    const setClauses = safeFields.map(([k], i) => `${k} = $${i + 1}`);
    const values     = safeFields.map(([, v]) => v);
    values.push(userId);

    await query(
      `UPDATE user_profiles
       SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${safeFields.length + 1}`,
      values,
    );

    await redisClient.hSetAsync(redisKey, { is_dirty: "0", is_dirty_at: "" });
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
    const iterator = redisClient.scanIterator({ MATCH: `${PLAYER_STATE_PREFIX}*`, COUNT: 100 });
    const staleIds = [];

    for await (const key of iterator) {
      const [isDirty, dirtyAt] = await Promise.all([
        redisClient.hGetAsync(key, "is_dirty"),
        redisClient.hGetAsync(key, "is_dirty_at"),
      ]);

      if (isDirty !== "1") continue;

      const uid = key.replace(PLAYER_STATE_PREFIX, "");

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
 * Remove um jogador do Redis completamente (limpeza de ghosts).
 */
async function deletePlayerState(userId) {
  const uid = String(userId);
  const redisKey = `${PLAYER_STATE_PREFIX}${uid}`;
  await Promise.all([
    redisClient.delAsync(redisKey),
    redisClient.zRemAsync(RANKING_ZSET_KEY, uid)
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
    status_ends_at = new Date(Date.now() + (durationSeconds * 1000)).toISOString();
  }

  console.log(`[status] 🔄 Mudando ${userId}: ${currentStatus} -> ${newStatus} (Expira: ${status_ends_at || 'Nunca'})`);

  // 1. Atualiza Redis (Fonte Primária)
  await redisClient.hSetAsync(redisKey, {
    status: newStatus,
    status_ends_at: status_ends_at || "",
    is_dirty: "1",
    is_dirty_at: String(Date.now())
  });

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

module.exports = {
  loadPlayerState,
  getPlayerState,
  updatePlayerState,
  persistPlayerState,
  persistDirtyStates,
  schedulePersistence,
  deletePlayerState,
  setPlayerStatus,
  // Para rankingCacheService
  getDirtyRankingPlayers,
  _clearRankingDirty,
  _zaddRanking,
  _zrangeRankingWithScores,
  _calcRankingScore,
  RANKING_ZSET_KEY,
  PLAYER_STATE_PREFIX,
};