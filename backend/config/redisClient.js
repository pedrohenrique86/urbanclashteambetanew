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

      localClient.on("error", (err) => {
        console.error("[RedisClient] Erro na conexão do client Local:", err.message);
      });

      await localClient.connect();
      client = localClient;
      isReady = true;
      console.log("✅ Redis (Local) OK");
    }
  } catch (err) {
    console.error(`[RedisClient] Redis indisponível durante inicialização:`, err.message);
    client = null;
    isReady = false;
  }
}

// Instância da Promise de inicialização para ser aguardada pelo servidor
const redisReadyPromise = initRedis();

const redisWrapper = {
  redisReadyPromise,
  client: {
    get isReady() {
      return isReady;
    },
  },

  getAsync: async (k) => {
    if (!isReady) return null;
    try {
      return await client.get(k);
    } catch (err) {
      console.error(`[RedisClient] Erro em getAsync key=${k}:`, err.message);
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
    } catch (err) {
      console.error(`[RedisClient] Erro em setAsync key=${k}:`, err.message);
      return null;
    }
  },

  delAsync: async (k) => {
    if (!isReady) return null;
    try {
      return await client.del(k);
    } catch (err) {
      console.error(`[RedisClient] Erro em delAsync key=${k}:`, err.message);
      return null;
    }
  },

  hSetAsync: async (k, f, v) => {
    if (!isReady) return null;
    try {
      if (isUpstash) {
        if (typeof f === 'object') return await client.hset(k, f);
        return await client.hset(k, f, String(v));
      } else {
        return await client.hSet(k, f, String(v));
      }
    } catch (err) {
      console.error(`[RedisClient] Erro em hSetAsync key=${k}:`, err.message);
      return null;
    }
  },

  hGetAsync: async (k, f) => {
    if (!isReady) return null;
    try {
      if (isUpstash) return await client.hget(k, f);
      return await client.hGet(k, f);
    } catch (err) {
      console.error(`[RedisClient] Erro em hGetAsync key=${k}:`, err.message);
      return null;
    }
  },

  hGetAllAsync: async (k) => {
    if (!isReady) return null;
    try {
      if (isUpstash) return await client.hgetall(k);
      return await client.hGetAll(k);
    } catch (err) {
      console.error(`[RedisClient] Erro em hGetAllAsync key=${k}:`, err.message);
      return null;
    }
  },

  expireAsync: async (k, t) => {
    if (!isReady) return null;
    try {
      return await client.expire(k, t);
    } catch (err) {
      console.error(`[RedisClient] Erro em expireAsync key=${k}:`, err.message);
      return null;
    }
  },

  lRangeAsync: async (k, start, stop) => {
    if (!isReady) return null;
    try {
      if (isUpstash) return await client.lrange(k, start, stop);
      return await client.lRange(k, start, stop);
    } catch (err) {
      console.error(`[RedisClient] Erro em lRangeAsync key=${k}:`, err.message);
      return null;
    }
  },

  setNXAsync: async (k, v, exMs) => {
    if (!isReady) return null;
    try {
      if (isUpstash) {
        const result = await client.set(String(k), String(v), { nx: true, px: exMs });
        return result === "OK" || result === true ? true : null;
      } else {
        const result = await client.set(String(k), String(v), { NX: true, PX: exMs });
        return result === "OK" ? true : null;
      }
    } catch (err) {
      console.error(`[RedisClient] Erro em setNXAsync key=${k}:`, err.message);
      return null;
    }
  },

  scanIterator: (options) => {
    if (!isReady || isUpstash) {
      async function* empty() { yield* []; }
      return empty();
    }
    return client.scanIterator(options);
  },

  // Suporte a pipeline (usado em playerStateService.js)
  pipeline: () => {
    if (!isReady) throw new Error("RedisClient não está pronto para pipeline");
    if (isUpstash) {
      const p = client.pipeline();
      // Mapeia métodos camelCase usados em node-redis para lowercase do Upstash
      const proxy = {
        hIncrBy: (k, f, v) => { p.hincrby(k, f, v); return proxy; },
        hSet: (k, f, v) => { p.hset(k, f, v); return proxy; },
        lpush: (k, v) => { p.lpush(k, v); return proxy; },
        ltrim: (k, s, st) => { p.ltrim(k, s, st); return proxy; },
        expire: (k, t) => { p.expire(k, t); return proxy; },
        exec: async () => await p.exec(),
      };
      return proxy;
    } else {
      return client.multi();
    }
  },

  chatHistoryPipeline: async (historyKey, messageJson, maxLength, ttlSeconds) => {
    if (!isReady) return null;
    try {
      if (isUpstash) {
        const p = client.pipeline();
        p.lpush(historyKey, messageJson);
        p.ltrim(historyKey, 0, maxLength - 1);
        p.expire(historyKey, ttlSeconds);
        return await p.exec();
      } else {
        const p = client.multi();
        p.lPush(historyKey, messageJson);
        p.lTrim(historyKey, 0, maxLength - 1);
        p.expire(historyKey, ttlSeconds);
        return await p.exec();
      }
    } catch (err) {
      console.error(`[RedisClient] Erro no chatHistoryPipeline key=${historyKey}:`, err.message);
      return null;
    }
  },
};

// Aliases para compatibilidade legada
redisWrapper.hsetAsync = redisWrapper.hSetAsync;
redisWrapper.hgetAsync = redisWrapper.hGetAsync;
redisWrapper.hgetallAsync = redisWrapper.hGetAllAsync;

module.exports = redisWrapper;
