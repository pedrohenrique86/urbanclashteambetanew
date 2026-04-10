const redisClient = require("../config/redisClient");
const { query } = require("../config/database");
const crypto = require("crypto");
const sseService = require("./sseService");

const RANKINGS_TTL_SECONDS = 700; // Redis TTL ~11.7 min (maior que o threshold)
const STALE_THRESHOLD_SECONDS = 600; // Stale após 10 min
const LOCK_TTL_MS = 30000; // Lock expira em 30s

const RANKINGS_USERS_PREFIX = "rankings:users:";
const RANKINGS_CLANS_PREFIX = "rankings:clans:";

function computeETag(data) {
  const h = crypto.createHash("sha1");
  h.update(JSON.stringify(data));
  return `W/"${h.digest("hex")}"`;
}

function getUsersCacheKey(faction, limit) {
  return `${RANKINGS_USERS_PREFIX}${faction || "all"}:${limit}`;
}

function getClansCacheKey(limit) {
  return `${RANKINGS_CLANS_PREFIX}${limit}`;
}

async function fetchUsersFromDB(faction, limit) {
  let whereClause = "WHERE u.is_email_confirmed = true AND p.id IS NOT NULL";
  const queryParams = [];
  let limitPlaceholder = "$1";

  if (faction) {
    whereClause += " AND p.faction = $1";
    queryParams.push(faction);
    limitPlaceholder = "$2";
  }

  queryParams.push(limit);

  const result = await query(
    `
    SELECT
      u.id, u.username, u.country,
      p.display_name, p.avatar_url, p.level,
      p.experience_points as current_xp, p.faction, p.victories, p.defeats, p.winning_streak,
      ROW_NUMBER() OVER (ORDER BY p.level DESC, p.experience_points DESC) as rank
    FROM users u
    INNER JOIN user_profiles p ON u.id = p.user_id
    ${whereClause}
    ORDER BY p.level DESC, p.experience_points DESC
    LIMIT ${limitPlaceholder}
  `,
    queryParams,
  );

  return result.rows;
}

async function fetchClansFromDB(limit) {
  const result = await query(
    `
    SELECT
      c.id,
      c.name,
      c.faction,
      c.points as score,
      c.created_at,
      c.updated_at,
      COUNT(cm.id) as member_count,
      ROW_NUMBER() OVER (ORDER BY c.points DESC, COUNT(cm.id) DESC) as rank
    FROM clans c
    LEFT JOIN clan_members cm ON c.id = cm.clan_id
    GROUP BY c.id, c.name, c.faction, c.points, c.created_at, c.updated_at
    ORDER BY c.points DESC, COUNT(cm.id) DESC
    LIMIT $1
  `,
    [limit],
  );

  return result.rows;
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
  const etag = computeETag(data);
  const entry = { data, etag, timestamp: Date.now() };
  await redisClient.setAsync(
    cacheKey,
    JSON.stringify(entry),
    "EX",
    RANKINGS_TTL_SECONDS,
  );
  return entry;
}

async function acquireLock(lockKey) {
  const result = await redisClient.setNXAsync(lockKey, "1", LOCK_TTL_MS);
  return !!result;
}

async function releaseLock(lockKey) {
  await redisClient.delAsync(lockKey);
}

/**
 * triggerRefresh — executa refresh com lock distribuído Redis (SET NX PX).
 * @param {string} type - 'users' ou 'clans'
 * @param {string|null} faction - 'gangsters', 'guardas', 'all' ou null (clans)
 * @param {number} limit - número de itens
 */
async function triggerRefresh(type, faction, limit) {
  const cacheKey =
    type === "users"
      ? getUsersCacheKey(faction, limit)
      : getClansCacheKey(limit);
  const lockKey = `lock:refresh:${cacheKey}`;

  const acquired = await acquireLock(lockKey);
  if (!acquired) {
    // Outro processo já está atualizando; retorna cache atual (pode ser stale)
    return await getCachedData(cacheKey);
  }

  try {
    let rows;
    if (type === "users") {
      const dbFaction = faction === "all" ? null : faction;
      rows = await fetchUsersFromDB(dbFaction, limit);
    } else {
      rows = await fetchClansFromDB(limit);
    }

    const entry = await setCachedData(cacheKey, rows);

    // Emite eventos SSE com snapshot completo
    if (type === "users") {
      const factionKey = faction || "all";
      sseService.publish(
        "ranking",
        `ranking:snapshot:users:${factionKey}:${limit}`,
        rows,
      );
      // Emite snapshot de top 5 para clientes da Home
      if (limit === 26) {
        sseService.publish(
          "ranking",
          `ranking:snapshot:users:${factionKey}:5`,
          rows.slice(0, 5),
        );
      }
    } else {
      sseService.publish(
        "ranking",
        `ranking:snapshot:clans:${limit}`,
        rows,
      );
      if (limit === 26) {
        sseService.publish(
          "ranking",
          `ranking:snapshot:clans:5`,
          rows.slice(0, 5),
        );
      }
    }

    return entry;
  } finally {
    await releaseLock(lockKey);
  }
}

/**
 * ensureFreshRanking — stale-while-revalidate.
 * Cache fresco → retorna imediatamente.
 * Cache stale → retorna stale e dispara refresh em background.
 * Sem cache → bloqueia e busca do banco agora.
 */
async function ensureFreshRanking(type, faction, limit) {
  const cacheKey =
    type === "users"
      ? getUsersCacheKey(faction, limit)
      : getClansCacheKey(limit);

  const cached = await getCachedData(cacheKey);

  if (cached && cached.timestamp) {
    const ageSeconds = (Date.now() - cached.timestamp) / 1000;
    if (ageSeconds < STALE_THRESHOLD_SECONDS) {
      return cached; // Cache fresco
    }
    // Cache stale: retorna imediatamente e dispara refresh em background
    triggerRefresh(type, faction, limit).catch((err) =>
      console.error(
        `❌ BG refresh falhou [${type}/${faction}/${limit}]:`,
        err.message,
      ),
    );
    return cached;
  }

  // Sem cache: busca do banco agora (bloqueante)
  return await triggerRefresh(type, faction, limit);
}

/**
 * warmupRankings — pré-carrega todos os combos no startup.
 */
async function warmupRankings() {
  console.log("🔥 Aquecendo caches de ranking...");
  const tasks = [
    triggerRefresh("users", "gangsters", 26),
    triggerRefresh("users", "guardas", 26),
    triggerRefresh("users", "all", 26),
    triggerRefresh("clans", null, 26),
  ];

  const results = await Promise.allSettled(tasks);
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`❌ Warmup falhou na tarefa ${i}:`, result.reason?.message);
    }
  });
  console.log("✅ Caches de ranking aquecidos");
}

/**
 * startPeriodicRefresh — refresh automático a cada 10 minutos,
 * sincronizado com intervalos de hora quebrada (00, 10, 20, 30, 40, 50).
 */
function startPeriodicRefresh() {
  const INTERVAL_MS = 10 * 60 * 1000;
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();
  const minutesToNext = 10 - (minutes % 10);
  const delay = (minutesToNext * 60 - seconds) * 1000 - milliseconds;

  console.log(
    `⏱️ Próximo refresh de ranking em ${Math.round(Math.max(0, delay) / 1000)}s`,
  );

  setTimeout(async () => {
    await warmupRankings();
    setInterval(warmupRankings, INTERVAL_MS);
  }, Math.max(0, delay));
}

module.exports = {
  ensureFreshRanking,
  triggerRefresh,
  warmupRankings,
  startPeriodicRefresh,
};
