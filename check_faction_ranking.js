const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend/.env") });
const redisWrapper = require("./backend/config/redisClient");

async function checkFactionRanking() {
  try {
    await redisWrapper.redisReadyPromise;
    const renegados = await redisWrapper.zRangeWithScoresAsync("ranking:players:renegados", 0, -1);
    console.log("Renegados Ranking:", renegados);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFactionRanking();
