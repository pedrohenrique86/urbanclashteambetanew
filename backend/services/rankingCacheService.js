const redisClient = require("../config/redisClient");
const { query } = require("../config/database");
const crypto = require("crypto");
const sseService = require("./sseService");
const { FACTION_ALIAS_MAP } = require("../utils/faction");

const RANKINGS_TTL_SECONDS = 700; // Redis TTL ~11.7 min
const STALE_THRESHOLD_SECONDS = 600; // Stale após 10 min
const LOCK_TTL_MS = 30000; // Lock expira em 30s
const STANDARD_LIMIT = 26;

const RANKINGS_USERS_PREFIX = "rankings:users:";
const RANKINGS_CLANS_PREFIX = "rankings:clans:";

function computeETag(data) {
  const h = crypto.createHash("sha1");
  h.update(JSON.stringify(data));
  return `W/"${h.digest("hex")}"`;
}

function getUsersCacheKey(faction) {
  return `${RANKINGS_USERS_PREFIX}${faction || "all"}`;
}

function getClansCacheKey() {
  return `${RANKINGS_CLANS_PREFIX}all`;
}

async function fetchUsersFromDB(faction) {
  let whereClause = "WHERE u.is_email_confirmed = true AND p.id IS NOT NULL";
  const queryParams = [];
  let limitPlaceholder = "$1";

  if (faction) {
    const canonical = FACTION_ALIAS_MAP[String(faction).toLowerCase().trim()] || faction;
    whereClause += " AND p.faction = $1";
    queryParams.push(canonical);
    limitPlaceholder = "$2";
  }

  queryParams.push(STANDARD_LIMIT);

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

async function fetchClansFromDB() {
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
    [STANDARD_LIMIT],
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
 * triggerRefresh — única fonte de atualização dos rankings
 */
async function triggerRefresh(type, faction) {
  const cacheKey = type === "users" ? getUsersCacheKey(faction) : getClansCacheKey();
  const lockKey = `lock:refresh:${cacheKey}`;

  const acquired = await acquireLock(lockKey);
  if (!acquired) return await getCachedData(cacheKey);

  try {
    let rows;
    if (type === "users") {
      const dbFaction = faction === "all" ? null : faction;
      rows = await fetchUsersFromDB(dbFaction);
    } else {
      rows = await fetchClansFromDB();
    }

    const entry = await setCachedData(cacheKey, rows);

    // Emite eventos SSE simplificados (Single Source of Truth)
    const factionKey = type === "users" ? (faction || "all") : null;
    const eventName = type === "users" 
      ? `ranking:snapshot:users:${factionKey}` 
      : `ranking:snapshot:clans`;
    
    sseService.publish("ranking", eventName, rows);

    return entry;
  } finally {
    await releaseLock(lockKey);
  }
}

async function ensureFreshRanking(type, faction) {
  const cacheKey = type === "users" ? getUsersCacheKey(faction) : getClansCacheKey();
  const cached = await getCachedData(cacheKey);

  if (cached && cached.timestamp) {
    const ageSeconds = (Date.now() - cached.timestamp) / 1000;
    if (ageSeconds < STALE_THRESHOLD_SECONDS) return cached;
    
    // Background refresh
    triggerRefresh(type, faction).catch(err => 
      console.error(`❌ BG refresh falhou [${type}/${faction}]:`, err.message)
    );
    return cached;
  }

  return await triggerRefresh(type, faction);
}

async function warmupRankings() {
  console.log("🔥 Aquecendo caches de ranking (SSOT)...");
  const tasks = [
    triggerRefresh("users", "gangsters"),
    triggerRefresh("users", "guardas"),
    triggerRefresh("users", "all"),
    triggerRefresh("clans", null),
  ];

  await Promise.allSettled(tasks);
  console.log("✅ Caches de ranking aquecidos");
}

function startPeriodicRefresh() {
  const INTERVAL_MS = 10 * 60 * 1000;
  const now = new Date();
  const delay = (10 - (now.getMinutes() % 10)) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();

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
