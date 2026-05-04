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
const RANKINGS_USERS_PREFIX   = "ranking:users:";
const RANKINGS_CLANS_PREFIX   = "ranking:clans:";
const RANKINGS_TTL_SECONDS    = 86400;   // 24 horas
const PLAYER_RANKING_LIMIT    = 200;
const CLAN_RANKING_LIMIT      = 26;
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
       c.season_score AS score,
       c.member_count,
       c.created_at, c.updated_at,
       ROW_NUMBER() OVER (ORDER BY c.season_score DESC, c.member_count DESC) AS rank
     FROM clans c
     ORDER BY c.season_score DESC, c.member_count DESC
     LIMIT $1`,
    [CLAN_RANKING_LIMIT],
  );
  return result.rows;
}

// ─── Ranking de Jogadores — baseado em ZSET ────────────────────────────────────

async function fetchUsersFromDB(faction) {
  let queryStr = `
    SELECT 
      p.user_id AS id, p.username, p.display_name, p.avatar_url, 
      p.level, p.total_xp, p.faction, p.victories, p.defeats, 
      p.winning_streak, p.status, p.status_ends_at,
      c.name AS clan_name
    FROM user_profiles p
    LEFT JOIN clan_members cm ON cm.user_id = p.user_id
    LEFT JOIN clans c ON cm.clan_id = c.id
  `;
  const params = [];
  if (faction && faction !== 'all') {
    const canonical = FACTION_ALIAS_MAP[String(faction).toLowerCase().trim()] || faction;
    queryStr += ` WHERE p.faction = $1`;
    params.push(canonical);
  }
  queryStr += ` ORDER BY p.level DESC, p.total_xp DESC LIMIT $${params.length + 1}`;
  params.push(PLAYER_RANKING_LIMIT);

  const result = await query(queryStr, params);
  return result.rows.map((r, i) => {
    const xpStatus = gameLogic.deriveXpStatus(r.total_xp, r.level);
    return {
      ...r,
      total_xp: Number(r.total_xp || 0),
      level: Number(r.level || 1),
      current_xp: xpStatus.currentXp,
      xp_required: xpStatus.xpRequired,
      rank: i + 1
    };
  });
}

/**
 * Atualiza o snapshot de ranking de jogadores no Redis e emite SSE.
 * Chamado a cada 10 minutos. Lê o ZSET uma única vez, hidrata os top-N, e distribui entre os caches das facções.
 */
let usersRefreshPromise = null;
async function refreshUsersRanking() {
  if (usersRefreshPromise) return usersRefreshPromise;
  usersRefreshPromise = (async () => {
    // 1. Pega top-N do ZSET (score descendente)
    // Aumentamos para 800 para garantir que teremos 200 de cada facção mesmo com desbalanço
    const zsetMembers = await playerStateService._zrangeRankingWithScores(0, 799);
    
    // Se o ZSET estiver vazio, usa fallback do banco de dados separadamente para cada facção
    if (!Array.isArray(zsetMembers) || zsetMembers.length === 0) {
      console.log("[ranking] ℹ️ ZSET de ranking está vazio no Redis. Fazendo fallback para o Banco de Dados.");
      
      const factions = ["renegados", "guardioes", "gangsters", "guardas", null]; // null = todos
      for (const faction of factions) {
        const factionKey  = faction || "all";
        const cacheKey    = getUsersCacheKey(factionKey);
        const lockKey     = `lock:refresh:${cacheKey}`;
        
        const acquired = await acquireLock(lockKey);
        if (!acquired) continue;

        try {
          const fallbackData = await fetchUsersFromDB(faction);
          await setCachedData(cacheKey, fallbackData);
          sseService.publish("ranking", `ranking:snapshot:users:${factionKey}`, fallbackData);
          console.log(`[ranking] ✅ Snapshot de jogadores [${factionKey}] atualizado (fallback DB) (${fallbackData.length} entries).`);
        } catch(e) {
          console.error(`[ranking] ❌ Erro ao atualizar ranking fallback [${factionKey}]:`, e.message);
        } finally {
          await releaseLock(lockKey);
        }
      }

      // Dispara a inicialização do ZSET em background para os próximos ciclos
      initializeRankingZSet().catch(err => console.error("[ranking] Erro ao inicializar ZSET no fallback:", err));
      return;
    }

    // 2. Normaliza os dados do Redis
    let entries = [];
    if (typeof zsetMembers[0] === "string") {
      for (let i = 0; i < zsetMembers.length; i += 2) {
        entries.push({ userId: zsetMembers[i], score: Number(zsetMembers[i + 1]) });
      }
    } else if (Array.isArray(zsetMembers) && zsetMembers[0] && typeof zsetMembers[0] === "object") {
      entries = zsetMembers.map((e) => ({ 
        userId: e.value || e.member || e.id, 
        score: Number(e.score) 
      })).filter(e => e.userId);
    }

    console.log(`[ranking] 🔍 Processando ${entries.length} membros globais do ZSET.`);

    // 3. Validação de Existência (Ghost Cleanup) - Batch
    const candidateIds = entries.map((e) => e.userId);
    let validEntries = entries;
    if (candidateIds.length > 0) {
      try {
        const { rows } = await query(`SELECT id FROM users WHERE id IN (${candidateIds.map((_,i) => `$${i+1}`).join(',')})`, candidateIds);
        const existingIds = new Set(rows.map((r) => r.id));
        if (existingIds.size < entries.length) {
          validEntries = entries.filter((e) => existingIds.has(e.userId));
        }
      } catch (dbErr) {
        console.error("[ranking] ❌ Falha na validação de usuários fantasma:", dbErr.message);
      }
    }

    // 4. BATCH HYDRATION: Substitui o loop N+1 pelo carregamento em lote
    const hydratedAll = [];
    const missingIds = [];
    const pipeline = redisClient.pipeline();

    for (const { userId } of validEntries) {
      pipeline.hGetAll(`${playerStateService.PLAYER_STATE_PREFIX}${userId}`);
    }

    const redisResults = await pipeline.exec();

    validEntries.forEach((entry, idx) => {
      // SÊNIOR FIX: v4 format
      const raw = redisResults[idx]; 
      if (raw && Object.keys(raw).length > 0) {
        const state = playerStateService._parseState(raw);
        hydratedAll.push({
          id          : state.user_id || entry.userId,
          username    : state.username    || "",
          country     : state.country     || "",
          display_name: state.display_name || state.username || "",
          avatar_url  : state.avatar_url  || null,
          level       : Number(state.level || 0),
          total_xp    : Number(state.total_xp || 0),
          current_xp  : state.current_xp,
          xp_required : state.xp_required,
          faction     : state.faction     || "",
          victories   : Number(state.victories || 0),
          defeats     : Number(state.defeats || 0),
          winning_streak: Number(state.winning_streak || 0),
          clan_name   : state.clan_name   || null,
          status      : state.status      || 'livre',
          status_ends_at: state.status_ends_at || null,
        });
      } else {
        missingIds.push(entry.userId);
      }
    });

    if (missingIds.length > 0) {
      console.log(`[ranking] 🚰 Cache miss para ${missingIds.length} jogadores. Buscando em lote no DB...`);
      try {
        const { rows } = await query(`
          SELECT p.*, u.username, u.country, c.name AS clan_name
          FROM user_profiles p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN clan_members cm ON cm.user_id = p.user_id
          LEFT JOIN clans c ON cm.clan_id = c.id
          WHERE p.user_id IN (${missingIds.map((_, i) => `$${i+1}`).join(',')})
        `, missingIds);

        for (const row of rows) {
          const xpStatus = gameLogic.deriveXpStatus(Number(row.total_xp), Number(row.level));
          hydratedAll.push({
            id          : row.user_id,
            username    : row.username,
            country     : row.country || "",
            display_name: row.display_name || row.username,
            avatar_url  : row.avatar_url,
            level       : Number(row.level),
            total_xp    : Number(row.total_xp),
            current_xp  : xpStatus.currentXp,
            xp_required : xpStatus.xpRequired,
            faction     : row.faction,
            victories   : Number(row.victories || 0),
            defeats     : Number(row.defeats || 0),
            winning_streak: Number(row.winning_streak || 0),
            clan_name   : row.clan_name,
            status      : row.status || 'livre',
            status_ends_at: row.status_ends_at,
          });
          // Opcional: Background update para o Redis
          playerStateService.loadPlayerState(row.user_id).catch(() => {});
        }
      } catch (err) {
        console.error("[ranking] ❌ Erro no Batch Hydration:", err.message);
      }
    }

    // Ordenação final garantida (nível desc, xp desc)
    hydratedAll.sort((a, b) => b.level - a.level || b.total_xp - a.total_xp);

    // 5. Distribuição por facção e atualização dos caches
    const factions = ["renegados", "guardioes", "gangsters", "guardas", null]; // null = todos
    for (const faction of factions) {
      const factionKey  = faction || "all";
      const cacheKey    = getUsersCacheKey(factionKey);
      const lockKey     = `lock:refresh:${cacheKey}`;

      const acquired = await acquireLock(lockKey);
      if (!acquired) continue;

      try {
        let rows = hydratedAll;
        if (faction) {
          const targetCanonical = FACTION_ALIAS_MAP[String(faction).toLowerCase().trim()] || faction;
          rows = hydratedAll.filter(p => {
             const playerCanonical = FACTION_ALIAS_MAP[String(p.faction || "").toLowerCase().trim()] || p.faction;
             return playerCanonical === targetCanonical;
          });
        }
        
        // Aplica o limite por facção (200 para ranking, slice feito no frontend para Home)
        rows = rows.slice(0, PLAYER_RANKING_LIMIT).map((p, i) => ({ ...p, rank: i + 1 }));

        const entry = await setCachedData(cacheKey, rows);
        sseService.publish("ranking", `ranking:snapshot:users:${factionKey}`, rows);

        console.log(`[ranking] ✅ Snapshot de jogadores [${factionKey}] atualizado (${rows.length} entries).`);
      } catch (err) {
        console.error(`[ranking] ❌ Erro ao atualizar ranking [${factionKey}]:`, err.message);
      } finally {
        await releaseLock(lockKey);
      }
    }
  })();

  try {
    await usersRefreshPromise;
  } finally {
    usersRefreshPromise = null;
  }
}

/**
 * Atualiza o snapshot de ranking de clãs no Redis e emite SSE.
 */
let clansRefreshPromise = null;
async function refreshClansRanking() {
  if (clansRefreshPromise) return clansRefreshPromise;

  clansRefreshPromise = (async () => {
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
  })();

  try {
    await clansRefreshPromise;
  } finally {
    clansRefreshPromise = null;
  }
}

// ─── API de leitura (usada pelos endpoints HTTP) ───────────────────────────────

/**
 * Retorna o snapshot em cache. Se stale, dispara refresh em background.
 * Nunca bloqueia a resposta HTTP — sempre retorna dados disponíveis.
 */
async function ensureFreshRanking(type, faction) {
  if (!redisClient.client.isReady) {
    console.warn(`[ranking] ⚠️ Redis offline. Retornando vazio conforme solicitado.`);
    return { data: [], etag: "empty", timestamp: Date.now() };
  }

  const cacheKey = type === "users" ? getUsersCacheKey(faction || "all") : getClansCacheKey();
  const cached   = await getCachedData(cacheKey);

  const STALE_THRESHOLD = 600; // 10 minutos

  if (cached && cached.timestamp) {
    const ageSeconds = (Date.now() - cached.timestamp) / 1000;

    // Reduzido para 2 minutos para evitar "teimosia" do cache durante o ciclo de 10 min
    if (ageSeconds < 120) return cached;

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
  const finalCache = await getCachedData(cacheKey);
  if (finalCache) return finalCache;

  console.warn(`[ranking] ⚠️ Cache nulo e lock ocupado. Retornando vazio provisoriamente (SSE atualizará em instantes).`);
  return { data: [], etag: "empty", timestamp: Date.now() };
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

  const redisClient = require("../config/redisClient");
  const onlineCount = await redisClient.sCardAsync("online_players_set").catch(() => 0);
  
  if (!onlineCount || onlineCount === 0) {
    console.log(`[ranking] 💤 Servidor vazio (0 online). Pulando ciclo do PostgreSQL para permitir Auto-Suspend do Neon DB.`);
    return;
  }

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

  // Execução imediata foi removida daqui pois o server.js já executa o warmup de forma controlada (await warmupRankings())
  // antes de chamar o startPeriodicRefresh().

  // ✅ FIX: todos os callbacks de timer são wrapped em .catch() para evitar
  // UnhandledPromiseRejection que derruba o processo (causa do falso erro CORS)
  setTimeout(() => {
    warmupRankings().catch(err => console.error("[ranking] Erro no ciclo agendado:", err.message));
    setInterval(
      () => warmupRankings().catch(err => console.error("[ranking] Erro no ciclo periódico:", err.message)),
      INTERVAL_MS
    );
  }, firstDelay);
}

/**
 * Força um alerta de atualização imediata (com debounce de 5 segundos).
 * Usado quando há ganho crítico de nível/XP por workers offline.
 */
let asapRefreshTimeout = null;
function scheduleAsapRefresh() {
  if (asapRefreshTimeout) clearTimeout(asapRefreshTimeout);
  asapRefreshTimeout = setTimeout(() => {
    asapRefreshTimeout = null;
    console.log("[ranking] ⚡ Reconstrução imediata do ranking acionada (Worker Update)...");
    warmupRankings().catch(err => console.error("[ranking] Erro no ASAP Refresh:", err.message));
  }, 5000);
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
      // Score: level * 1.000.000 + total_xp (SSOT)
      const score = Number(row.level || 1) * 1_000_000 + Number(row.total_xp || 0);
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
  scheduleAsapRefresh,
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
