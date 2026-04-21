/**
 * playerStateService.js
 *
 * ARQUITETURA:
 *   ação → Redis (instantâneo - fonte primária)
 *         → dirty tracking (somente se XP/nível mudou)
 *         → debounce 3s (agrupa múltiplas ações do mesmo jogador)
 *         → PostgreSQL (persistência assíncrona)
 *
 * RANKING:
 *   - Redis ZSET é a fonte do ranking (ranking:users:zset)
 *   - Score = level * 10000 + xp (permite ordenar por nível, depois XP)
 *   - dirtyRankingPlayers = Set em memória de quem mudou XP/nível
 *   - rankingCacheService usa esse Set para reprocessar apenas quem mudou
 *
 * PROIBIDO:
 *   ❌ Batch longo (10-20 min) para dados do player
 *   ❌ Leitura do banco em tempo real para gameplay
 *   ❌ persist síncrono por ação
 *   ❌ marcar dirty sem mudança real
 */

const { query }    = require("../config/database");
const redisClient  = require("../config/redisClient");
const sseService   = require("./sseService");

// ─── Constantes ─────────────────────────────────────────────────────────────────
const PLAYER_STATE_PREFIX = "playerState:";
const RANKING_ZSET_KEY    = "ranking:users:zset";
const PLAYER_TTL_SECONDS  = 3600 * 6;  // 6 horas de inatividade
const DEBOUNCE_MS         = 3000;       // 3s de debounce antes de persistir no banco
const PERSIST_BATCH_SIZE  = 50;         // max players por ciclo de flush

// Campos cujas mudanças afetam o score do ranking
const RANKING_FIELDS = new Set(["experience_points", "level"]);

// Campos que disparam dirty (persistência) + evento SSE ao frontend
// Inclui TODOS os atributos visíveis na UI do jogador
const DIRTY_FIELDS = new Set([
  "experience_points", "level",
  "energy", "max_energy",
  "attack", "defense", "focus",
  "critical_chance", "critical_damage",
  "intimidation", "discipline",
  "money", "action_points",
  "victories", "defeats", "winning_streak",
]);

// Campos numéricos armazenados como string no Redis Hash
const NUMERIC_FIELDS = new Set([
  "level", "experience_points", "energy", "max_energy",
  "attack", "defense", "focus",
  "critical_chance", "critical_damage",
  "intimidation", "discipline",
  "money", "action_points",
  "victories", "defeats", "winning_streak",
]);

// ─── Estado interno ──────────────────────────────────────────────────────────────
const _debounceTimers   = new Map();  // userId → timer handle
const _memDirtyRanking  = new Set();  // userId → teve mudança de XP/nível

// ─── Helpers privados ────────────────────────────────────────────────────────────

/** Converte hash Redis (strings) de volta para tipos corretos. */
function _parseState(raw) {
  if (!raw) return null;
  const out = { ...raw };
  for (const field of NUMERIC_FIELDS) {
    if (out[field] !== undefined) {
      const n = Number(out[field]);
      if (!isNaN(n)) out[field] = n;
    }
  }
  return out;
}

/** Score do ranking: nível tem prioridade, XP é desempate. */
function _calcRankingScore(state) {
  const level = Number(state.level || 0);
  const xp    = Number(state.experience_points || 0);
  return level * 10_000 + xp;
}

/** Agenda persistência com debounce. Reinicia o timer se chegar nova ação. */
function _scheduleDebounce(userId) {
  const uid = String(userId);
  if (_debounceTimers.has(uid)) clearTimeout(_debounceTimers.get(uid));

  const timer = setTimeout(async () => {
    _debounceTimers.delete(uid);
    await persistPlayerState(uid);
  }, DEBOUNCE_MS);

  if (timer.unref) timer.unref(); // Não impede o processo de encerrar

  _debounceTimers.set(uid, timer);
}

// ─── Ranking dirty tracking (API interna para rankingCacheService) ────────────────
function _markRankingDirty(userId) { _memDirtyRanking.add(String(userId)); }
function _clearRankingDirty()      { _memDirtyRanking.clear(); }
function getDirtyRankingPlayers()  { return new Set(_memDirtyRanking); }

// ─── ZSET helpers (usando wrapper do redisClient) ─────────────────────────────────

/** Adiciona/atualiza o score de ranking de um jogador no ZSET. */
async function _zaddRanking(userId, score) {
  try {
    await redisClient.zAddAsync(RANKING_ZSET_KEY, score, String(userId));
  } catch (err) {
    console.error("[playerState] _zaddRanking falhou:", err.message);
  }
}

/** Retorna top-N do ZSET por score desc, incluindo o score. */
async function _zrangeRankingWithScores(start, stop) {
  try {
    return await redisClient.zRangeWithScoresAsync(RANKING_ZSET_KEY, start, stop);
  } catch (err) {
    console.error("[playerState] _zrangeRankingWithScores falhou:", err.message);
    return [];
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────────

/**
 * Carrega o estado de um jogador do PostgreSQL para o Redis.
 * Chamado no login ou em cache miss.
 */
async function loadPlayerState(userId) {
  if (!redisClient.client.isReady) {
    console.error("[playerState] Redis não pronto. Não é possível carregar estado.");
    return null;
  }

  try {
    const result = await query(
      `SELECT
         p.*,
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

    // Serializa tudo para string (Redis Hash só aceita strings)
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

    stateForRedis.is_dirty = "0";

    await redisClient.hSetAsync(redisKey, stateForRedis);
    await redisClient.expireAsync(redisKey, PLAYER_TTL_SECONDS);

    // Inicializa/atualiza score no ZSET de ranking
    const score = _calcRankingScore(playerState);
    await _zaddRanking(userId, score);

    console.log(`[playerState] Estado de ${userId} carregado. Score: ${score}`);
    return playerState;
  } catch (err) {
    console.error(`[playerState] Erro ao carregar ${userId}:`, err.message);
    return null;
  }
}

/**
 * Obtém o estado atual de um jogador do Redis (fonte primária).
 * Faz fallback para o banco APENAS em cache miss.
 */
async function getPlayerState(userId) {
  if (!redisClient.client.isReady) return null;

  const raw = await redisClient.hGetAllAsync(`${PLAYER_STATE_PREFIX}${userId}`);

  if (raw && Object.keys(raw).length > 0) {
    return _parseState(raw);
  }

  // Cache miss → carrega do banco (ocorre apenas no primeiro acesso pós-restart)
  return await loadPlayerState(userId);
}

/**
 * Atualiza o estado de um jogador.
 *
 * FLUXO:
 *   1. Pipeline Redis atômico com as mudanças
 *   2. is_dirty=1 SOMENTE se XP ou nível mudou
 *   3. Atualiza ZSET de ranking se XP/nível mudou
 *   4. Emite SSE imediatamente (tempo real)
 *   5. Agenda debounce 3s para persistir no banco
 *
 * @param {string} userId
 * @param {object} updates  Ex: { experience_points: 50, level: 1, energy: -10 }
 * @returns {Promise<object|null>} Novo estado completo
 */
async function updatePlayerState(userId, updates) {
  if (!redisClient.client.isReady || !updates || Object.keys(updates).length === 0) {
    return null;
  }

  const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;

  try {
    // ── 1. Aplica mudanças atomicamente via pipeline ───────────────────────────────────
    const pipeline         = redisClient.pipeline();
    let hasAnyChange       = false;  // qualquer campo relevante
    let hasCriticalChange  = false;  // XP ou nível (ranking)

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "number") {
        pipeline.hIncrBy(redisKey, key, value);
      } else {
        pipeline.hSet(redisKey, key, String(value));
      }
      if (DIRTY_FIELDS.has(key))   hasAnyChange      = true;
      if (RANKING_FIELDS.has(key)) hasCriticalChange = true;
    }

    // Marca dirty para persistência se qualquer campo relevante mudou
    if (hasAnyChange) {
      pipeline.hSet(redisKey, "is_dirty", "1");
    }

    await pipeline.exec();

    // ── 2. Renova TTL (jogador está ativo) ──────────────────────────────────────
    await redisClient.expireAsync(redisKey, PLAYER_TTL_SECONDS);

    // ── 3. Lê estado atualizado do Redis ─────────────────────────────────────────
    const newState = await getPlayerState(userId);
    if (!newState) return null;

    // ── 4. Emite estado COMPLETO via SSE ao frontend (todas as mudanças) ─────────
    if (hasAnyChange) {
      const playerEvent = {
        type       : "player:update",
        playerId   : String(userId),
        data: {
          level         : Number(newState.level),
          xp            : Number(newState.experience_points),
          energy        : Number(newState.energy),
          maxEnergy     : Number(newState.max_energy || 100),
          actionPoints  : Number(newState.action_points),
          attack        : Number(newState.attack),
          defense       : Number(newState.defense),
          focus         : Number(newState.focus),
          critDamage    : Number(newState.critical_damage),
          critChance    : Number(newState.critical_chance),
          cash          : Number(newState.money),
          intimidation  : Number(newState.intimidation),
          discipline    : Number(newState.discipline),
          victories     : Number(newState.victories),
          defeats       : Number(newState.defeats),
          winningStreak : Number(newState.winning_streak),
        },
      };

      // Canal dedicado por jogador: "player:{userId}"
      sseService.publish(`player:${userId}`, "player:state", playerEvent);
    }

    // ── 5. Atualiza ZSET e dirty tracking de ranking se XP/nível mudou ────────
    if (hasCriticalChange) {
      const score = _calcRankingScore(newState);
      await _zaddRanking(userId, score);
      _markRankingDirty(userId);

      // ── 5. Emite SSE ao frontend imediatamente ────────────────────────────
      sseService.publish("ranking", "ranking:player:update", {
        playerId  : String(userId),
        username  : newState.username  || "",
        faction   : newState.faction   || "",
        level     : Number(newState.level),
        current_xp: Number(newState.experience_points),
      });
    }

    // ── 6. Agenda debounce para persistência assíncrona (qualquer mudança dirty) ─
    if (hasAnyChange) {
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
 * Respeita o flag is_dirty — não grava se não houver nada novo.
 */
async function persistPlayerState(userId) {
  if (!redisClient.client.isReady) return;

  const redisKey    = `${PLAYER_STATE_PREFIX}${userId}`;
  const playerState = await redisClient.hGetAllAsync(redisKey);

  if (!playerState || playerState.is_dirty !== "1") return;

  try {
    // Remove campos de controle/meta que não existem em user_profiles
    const {
      id, user_id, is_dirty,
      username, country, account_created_at, birth_date, clan_name,
      ...fieldsToUpdate
    } = playerState;

    // Remove campos vazios
    const safeFields = Object.entries(fieldsToUpdate).filter(
      ([, v]) => v !== "" && v !== undefined && v !== null,
    );

    if (safeFields.length === 0) return;

    const setClauses = safeFields.map(([k], i) => `${k} = $${i + 1}`);
    const values     = safeFields.map(([, v]) => v);
    values.push(userId);

    await query(
      `UPDATE user_profiles
       SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${safeFields.length + 1}`,
      values,
    );

    await redisClient.hSetAsync(redisKey, "is_dirty", "0");
    console.log(`[playerState] ✅ ${userId} persistido no PostgreSQL.`);
  } catch (err) {
    console.error(`[playerState] ❌ Erro ao persistir ${userId}:`, err.message);
    // is_dirty permanece "1" — será retentado no próximo ciclo
  }
}

/**
 * Varre todos os estados dirty no Redis e persiste no PostgreSQL em lotes.
 * Chamado pelo ciclo de 10 minutos do ranking E pelo safety-net de 2 min.
 */
async function persistDirtyStates() {
  if (!redisClient.client.isReady) return;

  console.log("[playerState] 🔄 Iniciando flush de estados dirty...");

  try {
    const iterator  = redisClient.scanIterator({ MATCH: `${PLAYER_STATE_PREFIX}*`, COUNT: 100 });
    const dirtyIds  = [];

    for await (const key of iterator) {
      const isDirty = await redisClient.hGetAsync(key, "is_dirty");
      if (isDirty === "1") {
        dirtyIds.push(key.replace(PLAYER_STATE_PREFIX, ""));
      }
    }

    if (dirtyIds.length === 0) {
      console.log("[playerState] Nenhum estado dirty para persistir.");
      return;
    }

    console.log(`[playerState] ${dirtyIds.length} jogadores dirty para persistir.`);

    for (let i = 0; i < dirtyIds.length; i += PERSIST_BATCH_SIZE) {
      const batch = dirtyIds.slice(i, i + PERSIST_BATCH_SIZE);
      await Promise.allSettled(batch.map((uid) => persistPlayerState(uid)));
    }

    console.log("[playerState] ✅ Flush concluído.");
  } catch (err) {
    console.error("[playerState] ❌ Erro no flush:", err.message);
  }
}

/**
 * Inicia o safety-net de persistência (a cada 2 minutos).
 * O debounce de 3s é o mecanismo primário; este é o fallback de segurança.
 */
function schedulePersistence() {
  const INTERVAL_MS = 2 * 60 * 1000;
  console.log(`[playerState] 🚀 Safety-net de persistência ativo (a cada ${INTERVAL_MS / 1000}s).`);
  const t = setInterval(persistDirtyStates, INTERVAL_MS);
  if (t.unref) t.unref();
}

module.exports = {
  loadPlayerState,
  getPlayerState,
  updatePlayerState,
  persistPlayerState,
  persistDirtyStates,
  schedulePersistence,
  // Para rankingCacheService
  getDirtyRankingPlayers,
  _clearRankingDirty,
  _zaddRanking,
  _zrangeRankingWithScores,
  _calcRankingScore,
  RANKING_ZSET_KEY,
};