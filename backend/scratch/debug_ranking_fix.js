const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const rankingCacheService = require("../services/rankingCacheService");

async function debug() {
  try {
    console.log("--- DEBUG RANKING ---");
    const { rows: users } = await query("SELECT count(*) as count FROM user_profiles");
    console.log("Users in DB:", users[0].count);

    const { rows: clans } = await query("SELECT count(*) as count FROM clans");
    console.log("Clans in DB:", clans[0].count);

    if (redisClient.client.isReady) {
      const keys = await redisClient.keysAsync("ranking:*");
      console.log("Ranking keys in Redis:", keys);
      
      console.log("Triggering Warmup...");
      await rankingCacheService.initializeRankingZSet();
      
      const newKeys = await redisClient.keysAsync("ranking:*");
      console.log("Ranking keys after Warmup:", newKeys);
    } else {
      console.log("Redis not ready");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit();
  }
}

debug();
