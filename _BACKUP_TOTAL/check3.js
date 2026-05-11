const { query } = require("./backend/config/database");

async function check() {
  const result = await query("SELECT username, level, total_xp, training_ends_at FROM user_profiles ORDER BY total_xp DESC LIMIT 10");
  console.table(result.rows);
  
  const redisClient = require("./backend/config/redisClient");
  await redisClient.redisReadyPromise;
  
  const zset = await redisClient.client.sendCommand(['ZREVRANGE', 'ranking:users:zset', '0', '10', 'WITHSCORES']);
  console.log("ZSET Top 10:", zset);
  process.exit();
}
check().catch(console.error);
