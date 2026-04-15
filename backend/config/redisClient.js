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
    if (!k || !isReady) return null;
    try {
      return await client.get(String(k));
    } catch (err) {
      console.error(`[RedisClient] Erro em getAsync key=${k}:`, err.message);
      return null;
    }
  },

  setAsync: async (k, v, m, t) => {
    if (!k || !isReady) return null;
    try {
      const key = String(k);
      const val = String(v ?? "");

      if (isUpstash) {
        return m === "EX" && t
          ? await client.set(key, val, { ex: t })
          : await client.set(key, val);
      } else {
        return m === "EX" && t
          ? await client.setEx(key, t, val)
          : await client.set(key, val);
      }
    } catch (err) {
      console.error(`[RedisClient] Erro em setAsync key=${k}:`, err.message);
      return null;
    }
  },

  delAsync: async (k) => {
    if (!k || !isReady) return null;
    try {
      return await client.del(String(k));
    } catch (err) {
      console.error(`[RedisClient] Erro em delAsync key=${k}:`, err.message);
      return null;
    }
  },

  hSetAsync: async (k, f, v) => {
    if (!k || f === undefined || f === null) return null;
    if (!isReady) return null;

    try {
      const key = String(k);

      // 1. Caso f seja objeto: normalizar todas keys e values para String
      if (typeof f === "object" && f !== null) {
        const normalizedObj = {};
        for (const [objKey, objVal] of Object.entries(f)) {
          normalizedObj[String(objKey)] = String(objVal ?? "");
        }

        if (isUpstash) {
          return await client.hset(key, normalizedObj);
        } else {
          return await client.hSet(key, normalizedObj);
        }
      }
      
      // 2. Caso f seja field/value individual
      const field = String(f);
      const value = String(v ?? "");
      
      if (isUpstash) {
        return await client.hset(key, field, value);
      } else {
        return await client.hSet(key, field, value);
      }
    } catch (err) {
      console.error(`[RedisClient] Erro em hSetAsync key=${k}:`, err.message);
      return null;
    }
  },

  hGetAsync: async (k, f) => {
    if (!k || f === undefined || f === null) return null;
    if (!isReady) return null;

    try {
      const key = String(k);
      const field = String(f);

      if (isUpstash) return await client.hget(key, field);
      return await client.hGet(key, field);
    } catch (err) {
      console.error(`[RedisClient] Erro em hGetAsync key=${k} field=${f}:`, err.message);
      return null;
    }
  },

  hGetAllAsync: async (k) => {
    if (!k || !isReady) return null;
    try {
      const key = String(k);
      if (isUpstash) return await client.hgetall(key);
      return await client.hGetAll(key);
    } catch (err) {
      console.error(`[RedisClient] Erro em hGetAllAsync key=${k}:`, err.message);
      return null;
    }
  },

  expireAsync: async (k, t) => {
    if (!k || !isReady) return null;
    try {
      return await client.expire(String(k), t);
    } catch (err) {
      console.error(`[RedisClient] Erro em expireAsync key=${k}:`, err.message);
      return null;
    }
  },

  lRangeAsync: async (k, start, stop) => {
    if (!k || !isReady) return [];
    try {
      const key = String(k);
      if (isUpstash) return await client.lrange(key, start, stop);
      return await client.lRange(key, start, stop);
    } catch (err) {
      console.error(`[RedisClient] Erro em lRangeAsync key=${k}:`, err.message);
      return [];
    }
  },

  setNXAsync: async (k, v, exMs) => {
    if (!k || !isReady) return null;
    try {
      const key = String(k);
      const val = String(v ?? "");
      if (isUpstash) {
        const result = await client.set(key, val, { nx: true, px: exMs });
        return result === "OK" || result === true ? true : null;
      } else {
        const result = await client.set(key, val, { NX: true, PX: exMs });
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
    if (!historyKey || !isReady) return null;
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
