const redis = require('redis');

let client = null;
let isReady = false;

async function initRedis() {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    client.on('error', () => {});
    
    await client.connect();
    isReady = true;
    console.log('✅ Redis OK');
  } catch (e) {
    console.log('⚠️ Redis indisponível');
    client = null;
    isReady = false;
  }
}

initRedis();

module.exports = {
  client: { get isReady() { return isReady; } },
  getAsync: async (k) => {
    if (!isReady) return null;
    try { return await client.get(k); } catch { return null; }
  },
  setAsync: async (k, v, m, t) => {
    if (!isReady) return null;
    try { 
      return (m === 'EX' && t) 
        ? await client.setEx(k, t, String(v)) 
        : await client.set(k, String(v));
    } catch { return null; }
  },
  delAsync: async (k) => {
    if (!isReady) return null;
    try { return await client.del(k); } catch { return null; }
  },
};
