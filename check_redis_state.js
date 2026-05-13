const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend/.env") });
const redisWrapper = require("./backend/config/redisClient");
const { RANKING_ALL } = require("./backend/services/playerStateConstants");

async function checkState() {
  try {
    await redisWrapper.redisReadyPromise;
    console.log("--- Redis State Check ---");
    
    const rankAll = await redisWrapper.zRangeWithScoresAsync(RANKING_ALL, 0, -1);
    console.log(`Ranking (${RANKING_ALL}):`, rankAll);
    
    const onlineAll = await redisWrapper.sMembersAsync("online_players_set");
    console.log("Online Set (all):", onlineAll);
    
    const onlineGangsters = await redisWrapper.sMembersAsync("online_players_set:gangsters");
    console.log("Online Set (gangsters):", onlineGangsters);
    
    const onlineGuardas = await redisWrapper.sMembersAsync("online_players_set:guardas");
    console.log("Online Set (guardas):", onlineGuardas);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkState();
