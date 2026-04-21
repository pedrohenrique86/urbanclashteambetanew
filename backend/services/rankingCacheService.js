/**
 * rankingCacheService.js
 *
 * ARQUITETURA DO RANKING:
 *   - Fonte de dados: Redis ZSET (ranking:users:zset)
 *   - Ciclo fixo de 10 minutos alinhado ao relógio (17:00, 17:10, 17:20...)
 *   - Somente jogadores em dirtyRankingPlayers são reprocessados no ciclo
 *   - Snapshot completo fica em cache Redis (JSON) para leitura por HTTP/SSE
 *   - Banco de dados NÃO é lido para montar o ranking em tempo real
 *
 * FLUXO A CADA 10 MINUTOS:
 *   1. persistDirtyStates (flush Redis → PostgreSQL)
 *   2. refreshRankingFromZSet (monta snapshot a partir do ZSET)
 *   3. Emite SSE com snapshot atualizado
 *   4. Limpa dirtyRankingPlayers
 */

const redisClient  = require("../config/redisClient");
const { query }    = require("../config/database");
const crypto       = require("crypto");
const sseService   = require("./sseService");
const clanStateService  = require("./clanStateService");
const playerStateService = require("./playerStateService");
const { FACTION_ALIAS_MAP } = require("../utils/faction");
const gameLogic = require("../utils/gameLogic");

// ─── Constantes ────────────────────────────────────────────────────────────────
const RANKINGS_USERS_PREFIX   = "rankings:users:";
const RANKINGS_CLANS_PREFIX   = "rankings:clans:";
const RANKINGS_TTL_SECONDS    = 700;   // ~11.7 min — maior que o ciclo
const STANDARD_LIMIT          = 26;
const LOCK_TTL_MS             = 30_000;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function computeETag(data) {
  return `W/"${crypto.createHash("sha1").update(JSON.stringify(data)).digest("hex")}"`;
}

function getUsersCacheKey(faction) {
  return `${RANKINGS_USERS_PREFIX}${faction || "all"}`;
}

function getClansCacheKey() {
  return `${RANKINGS_CLANS_PREFIX}all`;
}

async function getCachedData(cacheKey) {
  const cached = await redisClient.getAsync(cacheKey);
  if (!cached) return null;
  if (typeof cached === "object" && cached !== null) return cached;
  try {
    return JSON.parse(cached);
  } catch {
    await redisClient.delAsync(cacheKey);
    return null;
  }
}

async function setCachedData(cacheKey, data) {
  const etag  = computeETag(data);
  const entry = { data, etag, timestamp: Date.now() };
  await redisClient.setAsync(cacheKey, JSON.stringify(entry), "EX", RANKINGS_TTL_SECONDS);
  return entry;
}

async function acquireLock(lockKey) {
  return !!(await redisClient.setNXAsync(lockKey, "1", LOCK_TTL_MS));
}

async function releaseLock(lockKey) {
  await redisClient.delAsync(lockKey);
}

// ─── Ranking de Clãs (continua lendo do banco — clãs têm baixa frequência) ─────

async function fetchClansFromDB() {
  const result = await query(
    `SELECT
       c.id, c.name, c.faction,
       c.points AS score,
       mc.member_count,
       c.created_at, c.updated_at,
       ROW_NUMBER() OVER (ORDER BY c.points DESC, mc.member_count DESC) AS rank
     FROM clans c
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS member_count
       FROM clan_members cm WHERE cm.clan_id = c.id
     ) mc ON true
     ORDER BY c.points DESC, mc.member_count DESC
     LIMIT $1`,
    [STANDARD_LIMIT],
  );
  return result.rows;
}

// ─── Ranking de Jogadores — baseado em ZSET ────────────────────────────────────

/**
 * Reconstrói o snapshot de ranking de jogadores a partir do ZSET Redis.
 * Lê os top-N membros do ZSET (já ordenados por score desc),
 * depois hidrata os dados de perfil do Redis Hash de cada jogador.
 *
 * NÃO batemos no banco para montar este ranking.
 *
 * @param {string|null} faction  "gangsters" | "guardas" | null (todos)
 * @returns {Promise<Array>}
 */
async function buildRankingFromZSet(faction) {
  // 1. Pega top-N do ZSET (score descendente)
  const zsetMembers = await playerStateService._zrangeRankingWithScores(0, 99);
  // zsetMembers formato local: [{ value: userId, score }, ...]
  // zsetMembers formato Upstash: [userId1, score1, userId2, score2, ...]
  // O wrapper já normaliza — dependendo do ambiente, pode vir de formas diferentes.
  // Vamos normalizar aqui:

  let entries = [];
  if (!Array.isArray(zsetMembers) || zsetMembers.length === 0) {
    return [];
  }

  // Detecta formato Upstash (array plano) vs node-redis (array de objetos)
  if (typeof zsetMembers[0] === "string") {
    // Upstash: [member, score, member, score, ...]
    for (let i = 0; i < zsetMembers.length; i += 2) {
      entries.push({ userId: zsetMembers[i], score: Number(zsetMembers[i + 1]) });
    }
  } else if (zsetMembers[0] && typeof zsetMembers[0] === "object") {
    // node-redis: [{ value, score }]
    entries = zsetMembers.map((e) => ({ userId: e.value || e.member, score: Number(e.score) }));
  }

  // 2. Hidrata perfis do Redis Hash (sem bater no banco)
  const hydratedPlayers = [];
  for (const { userId } of entries) {
    const state = await playerStateService.getPlayerState(userId);
    if (!state) continue;

    // Filtra por facção se necessário
    if (faction) {
      const canonical = FACTION_ALIAS_MAP[String(faction).toLowerCase().trim()] || faction;
      if (state.faction !== canonical) continue;
    }

    const level = Number(state.level || 0);
    const total_xp = Number(state.total_xp || 0);
    const xpStatus = gameLogic.deriveXpStatus(total_xp, level);

    hydratedPlayers.push({
      id          : state.user_id || userId,
      username    : state.username    || "",
      country     : state.country     || "",
      display_name: state.display_name || state.username || "",
      avatar_url  : state.avatar_url  || null,
      level       : level,
      total_xp    : total_xp,
      current_xp  : xpStatus.currentXp,
      xp_required : xpStatus.xpRequired,
      faction     : state.faction     || "",
      victories   : Number(state.victories || 0),
      defeats     : Number(state.defeats || 0),
      winning_streak: Number(state.winning_streak || 0),
      clan_name   : state.clan_name   || null,
    });

    if (hydratedPlayers.length >= STANDARD_LIMIT) break;
  }

  // 3. Adiciona rank numérico
  return hydratedPlayers.map((p, i) => ({ ...p, rank: i + 1 }));
}

/**
 * Atualiza o snapshot de ranking de jogadores no Redis e emite SSE.
 * Chamado a cada 10 minutos.
 */
async function refreshUsersRanking() {
  const factions = ["gangsters", "guardas", null]; // null = todos

  for (const faction of factions) {
    const factionKey  = faction || "all";
    const cacheKey    = getUsersCacheKey(factionKey);
    const lockKey     = `lock:refresh:${cacheKey}`;

    const acquired = await acquireLock(lockKey);
    if (!acquired) continue;

    try {
      const rows  = await buildRankingFromZSet(faction);
      const entry = await setCachedData(cacheKey, rows);

      const eventName = `ranking:snapshot:users:${factionKey}`;
      sseService.publish("ranking", eventName, rows);

      console.log(`[ranking] ✅ Snapshot de jogadores [${factionKey}] atualizado (${rows.length} entries).`);
    } catch (err) {
      console.error(`[ranking] ❌ Erro ao atualizar ranking [${factionKey}]:`, err.message);
    } finally {
      await releaseLock(lockKey);
    }
  }
}

/**
 * Atualiza o snapshot de ranking de clãs no Redis e emite SSE.
 */
async function refreshClansRanking() {
  const cacheKey = getClansCacheKey();
  const lockKey  = `lock:refresh:${cacheKey}`;

  const acquired = await acquireLock(lockKey);
  if (!acquired) return;

  try {
    const rows  = await fetchClansFromDB();
    await setCachedData(cacheKey, rows);
    sseService.publish("ranking", "ranking:snapshot:clans", rows);
    console.log(`[ranking] ✅ Snapshot de clãs atualizado (${rows.length} entries).`);
  } catch (err) {
    console.error("[ranking] ❌ Erro ao atualizar ranking de clãs:", err.message);
  } finally {
    await releaseLock(lockKey);
  }
}

// ─── API de leitura (usada pelos endpoints HTTP) ───────────────────────────────

/**
 * Retorna o snapshot em cache. Se stale, dispara refresh em background.
 * Nunca bloqueia a resposta HTTP — sempre retorna dados disponíveis.
 */
async function ensureFreshRanking(type, faction) {
  const cacheKey = type === "users" ? getUsersCacheKey(faction || "all") : getClansCacheKey();
  const cached   = await getCachedData(cacheKey);

  const STALE_THRESHOLD = 600; // 10 minutos

  if (cached && cached.timestamp) {
    const ageSeconds = (Date.now() - cached.timestamp) / 1000;

    if (ageSeconds < STALE_THRESHOLD) return cached;

    // Stale — serve o cache e dispara refresh em background
    if (type === "users") {
      refreshUsersRanking().catch((err) =>
        console.error("[ranking] BG refresh users falhou:", err.message),
      );
    } else {
      refreshClansRanking().catch((err) =>
        console.error("[ranking] BG refresh clans falhou:", err.message),
      );
    }

    return cached; // Serve dado stale enquanto atualiza
  }

  // Cache vazio — força refresh síncrono na primeira chamada
  if (type === "users") {
    await refreshUsersRanking();
  } else {
    await refreshClansRanking();
  }

  return await getCachedData(cacheKey);
}

// ─── Ciclo de 10 minutos ────────────────────────────────────────────────────────

/**
 * Ciclo principal de ranking:
 *   1. Flush de estados Redis → PostgreSQL (apenas dirty)
 *   2. Flush de estados de clã (apenas dirty)
 *   3. Refresh dos snapshots de ranking (usuários e clãs)
 *   4. Limpa o set de dirtyRankingPlayers
 */
async function warmupRankings() {
  console.log("[ranking] 🔥 Iniciando ciclo de 10 minutos...");

  // 1 & 2: Persiste estados sujos antes de gerar o ranking
  await Promise.allSettled([
    playerStateService.persistDirtyStates(),
    clanStateService.persistDirtyClanStates(),
  ]);

  // 3: Atualiza snapshots (fonte: ZSET para users, banco para clãs)
  await Promise.allSettled([
    refreshUsersRanking(),
    refreshClansRanking(),
  ]);

  // 4: Limpa dirty tracking de ranking
  playerStateService._clearRankingDirty();

  console.log("[ranking] ✅ Ciclo de 10 minutos concluído.");
}

/**
 * Inicia o ciclo periódico alinhado ao relógio:
 * Próxima execução no múltiplo de 10 minutos mais próximo.
 * Ex: se agora são 17:07 → próxima em 17:10 → depois 17:20, etc.
 */
function startPeriodicRefresh() {
  const INTERVAL_MS = 10 * 60 * 1000;
  const now         = new Date();
  const msUntilNext =
    (10 - (now.getMinutes() % 10)) * 60 * 1000
    - now.getSeconds() * 1000
    - now.getMilliseconds();

  const firstDelay = Math.max(0, msUntilNext);

  console.log(
    `[ranking] ⏱️ Próximo ciclo em ${Math.round(firstDelay / 1000)}s ` +
    `(${new Date(Date.now() + firstDelay).toLocaleTimeString("pt-BR")})`,
  );

  setTimeout(() => {
    warmupRankings();
    setInterval(warmupRankings, INTERVAL_MS);
  }, firstDelay);
}

/**
 * Warmup inicial — popula ZSET com todos os jogadores do banco na primeira carga.
 * Necessário apenas na primeira execução ou após restart.
 */
async function initializeRankingZSet() {
  console.log("[ranking] 🔄 Inicializando ZSET de ranking a partir do banco...");

  try {
    const result = await query(
      `SELECT user_id, level, total_xp, faction
       FROM user_profiles
       WHERE level > 0 OR total_xp > 0
       ORDER BY level DESC, total_xp DESC
       LIMIT 500`,
    );

    for (const row of result.rows) {
      const score = Number(row.level) * 10_000 + Number(row.total_xp);
      await playerStateService._zaddRanking(row.user_id, score);
    }

    console.log(`[ranking] ✅ ZSET inicializado com ${result.rows.length} jogadores.`);
  } catch (err) {
    console.error("[ranking] ❌ Erro ao inicializar ZSET:", err.message);
  }
}

module.exports = {
  ensureFreshRanking,
  warmupRankings,
  startPeriodicRefresh,
  initializeRankingZSet,
  refreshUsersRanking,
  refreshClansRanking,
  // Expõe triggerRefresh como alias legado (compatibilidade com rotas existentes)
  triggerRefresh: async (type, faction) => {
    if (type === "users") {
      await refreshUsersRanking();
    } else {
      await refreshClansRanking();
    }
    const cacheKey = type === "users" ? getUsersCacheKey(faction || "all") : getClansCacheKey();
    return getCachedData(cacheKey);
  },
};
