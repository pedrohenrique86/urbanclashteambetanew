const { Redis } = require("@upstash/redis");
const redis = require("redis");

let client = null;
let isReady = false;
let isUpstash = false;

async function initRedis() {
  try {
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      // Configuração para Upstash (produção)
      client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      isUpstash = true;
      isReady = true;
      console.log("✅ Redis (Upstash) OK");
    } else {
      // Configuração para Redis local (desenvolvimento)
      const localClient = redis.createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
      });

      localClient.on("error", () => {});

      await localClient.connect();
      client = localClient;
      isReady = true;
      console.log("✅ Redis (Local) OK");
    }
  } catch (e) {
    console.log("⚠️ Redis indisponível");
    client = null;
    isReady = false;
  }
}

initRedis();

module.exports = {
  client: {
    get isReady() {
      return isReady;
    },
  },
  getAsync: async (k) => {
    if (!isReady) return null;
    try {
      return await client.get(k);
    } catch {
      return null;
    }
  },
  setAsync: async (k, v, m, t) => {
    if (!isReady) return null;
    try {
      if (isUpstash) {
        return m === "EX" && t
          ? await client.set(k, String(v), { ex: t })
          : await client.set(k, String(v));
      } else {
        return m === "EX" && t
          ? await client.setEx(k, t, String(v))
          : await client.set(k, String(v));
      }
    } catch {
      return null;
    }
  },
  delAsync: async (k) => {
    if (!isReady) return null;
    try {
      return await client.del(k);
    } catch {
      return null;
    }
  },
  hSetAsync: async (k, f, v) => {
    if (!isReady) return null;
    try {
      return await client.hSet(k, f, String(v));
    } catch {
      return null;
    }
  },
  hGetAsync: async (k, f) => {
    if (!isReady) return null;
    try {
      return await client.hGet(k, f);
    } catch {
      return null;
    }
  },
  expireAsync: async (k, t) => {
    if (!isReady) return null;
    try {
      return await client.expire(k, t);
    } catch {
      return null;
    }
  },
  expireAsync: async (k, t) => {
    if (!isReady) return null;
    try {
      return await client.expire(k, t);
    } catch {
      return null;
    }
  },
  hGetAllAsync: async (k) => {
    if (!isReady) return null;
    try {
      return await client.hGetAll(k);
    } catch {
      return null;
    }
  },
  scanIterator: (options) => {
    if (!isReady || isUpstash) {
      // Esta implementação é para o pacote local 'redis'.
      // Upstash tem um método de scan diferente que precisaria de uma implementação separada.
      async function* empty() {
        yield* [];
      }
      return empty();
    }
    // Retorna diretamente o iterador assíncrono do cliente node-redis
    return client.scanIterator(options);
  },
};
