const redis = require("redis");
require('dotenv').config();

async function clearKeys() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    password: process.env.REDIS_PASSWORD || undefined,
  });

  await client.connect();
  
  const keys = ['chat:global:online', 'online_players:isolation', 'online_players:recovery'];
  for (const key of keys) {
    const deleted = await client.del(key);
    console.log(`Key ${key} deleted: ${deleted}`);
  }

  await client.disconnect();
  console.log("Cleanup complete.");
}

clearKeys().catch(console.error);
