const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend/.env") });

const redisWrapper = require("./backend/config/redisClient");
const rankingCacheService = require("./backend/services/rankingCacheService");
const playerStateService = require("./backend/services/playerStateService");
const { RANKING_ALL, resolveFactionName } = require("./backend/services/playerStateConstants");

async function finalRecovery() {
  try {
    console.log("--- Final System Recovery Started ---");
    
    await redisWrapper.redisReadyPromise;
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("1. Forcing Ranking Warmup...");
    await rankingCacheService.initializeRankingZSet();
    
    const rankCount = await redisWrapper.zCardAsync(RANKING_ALL);
    console.log(`Ranking count: ${rankCount}`);

    console.log("2. Hydrating and Registering Online Players...");
    const { query } = require("./backend/config/database");
    // Get ALL fields to ensure correct level calculation and hydration
    const { rows } = await query("SELECT * FROM user_profiles");
    
    for (const row of rows) {
        console.log(`Processing user ${row.user_id} (${row.faction})...`);
        
        // Hydrate state (This will also trigger _updateRankingScore correctly)
        await playerStateService.getPlayerState(row.user_id);
        
        // Add to online sets
        await redisWrapper.sAddAsync("online_players_set", row.user_id);
        const canonical = resolveFactionName(row.faction);
        const alias = canonical === "guardioes" ? "guardas" : "gangsters";
        await redisWrapper.sAddAsync(`online_players_set:${alias}`, row.user_id);
    }
    
    console.log("3. Verifying Results...");
    const onlineCount = await redisWrapper.sCardAsync("online_players_set");
    console.log(`Total Online Players in Redis: ${onlineCount}`);
    
    console.log("--- Recovery Complete ---");
    process.exit(0);
  } catch (err) {
    console.error("❌ Recovery Error:", err);
    process.exit(1);
  }
}

finalRecovery();
