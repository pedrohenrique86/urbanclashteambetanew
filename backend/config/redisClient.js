const redis = require("redis");

let client = null;
let isReady = false;

// Mantemos as funções que eram expostas, para não quebrar dependências.
// isUpstash agora sempre retorna false, já que migramos para local.
function getRawClient() { return client; }
function getIsUpstash() { return false; }

async function initRedis() {
  try {
    const localClient = redis.createClient({
      url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
      password: process.env.REDIS_PASSWORD || undefined, // caso necessite de requirepass
    });

    localClient.on("error", (err) => {
      console.error("[RedisClient] Erro na conexão do client Local:", err.message);
    });

    localClient.on("ready", () => {
      console.log("✅ Redis (Local) Pronto");
      isReady = true;
    });

    localClient.on("reconnecting", () => {
      console.log("[RedisClient] Reconectando ao Redis...");
      isReady = false;
    });

    await localClient.connect();
    client = localClient;
    // O evento 'ready' atualiza isReady para true. 
    // Em alguns casos pode ser necessário marcar aqui também
    isReady = true; 
    console.log("✅ Redis (Local) OK");
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

  existsAsync: async (k) => {
    if (!k || !isReady) return 0;
    try {
      return await client.exists(String(k));
    } catch (err) {
      console.error(`[RedisClient] Erro em existsAsync key=${k}:`, err.message);
      return 0;
    }
  },

  incrAsync: async (k) => {
    if (!k || !isReady) return null;
    try {
      return await client.incr(String(k));
    } catch (err) {
      console.error(`[RedisClient] Erro em incrAsync key=${k}:`, err.message);
      return null;
    }
  },

  setAsync: async (k, v, m, t) => {
    if (!k || !isReady) return null;
    try {
      const key = String(k);
      const val = String(v ?? "");

      return m === "EX" && t
        ? await client.setEx(key, t, val)
        : await client.set(key, val);
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
        return await client.hSet(key, normalizedObj);
      }
      
      // 2. Caso f seja field/value individual
      const field = String(f);
      const value = String(v ?? "");
      return await client.hSet(key, field, value);
    } catch (err) {
      console.error(`[RedisClient] Erro em hSetAsync key=${k}:`, err.message);
      return null;
    }
  },

  hIncrByAsync: async (k, f, v) => {
    if (!k || f === undefined || !isReady) return null;
    try {
      return await client.hIncrBy(String(k), String(f), Number(v));
    } catch (err) {
      console.error(`[RedisClient] Erro em hIncrByAsync key=${k} field=${f}:`, err.message);
      return null;
    }
  },

  hGetAsync: async (k, f) => {
    if (!k || f === undefined || f === null) return null;
    if (!isReady) return null;

    try {
      const key = String(k);
      const field = String(f);
      return await client.hGet(key, field);
    } catch (err) {
      console.error(`[RedisClient] Erro em hGetAsync key=${k} field=${f}:`, err.message);
      return null;
    }
  },

  /** SÊNIOR: Busca múltiplos campos de um hash. Mais leve que hGetAll para matchmaking. */
  hmGetAsync: async (k, fields) => {
    if (!k || !fields || !isReady) return [];
    try {
      return await client.hmGet(String(k), fields.map(String));
    } catch (err) {
      console.error(`[RedisClient] Erro em hmGetAsync key=${k}:`, err.message);
      return [];
    }
  },

  hDelAsync: async (k, ...fields) => {
    if (!k || !isReady) return null;
    try {
      const key = String(k);
      const fs = fields.map(String);
      return await client.hDel(key, fs);
    } catch (err) {
      console.error(`[RedisClient] Erro em hDelAsync key=${k}:`, err.message);
      return null;
    }
  },

  hGetAllAsync: async (k) => {
    if (!k || !isReady) return null;
    try {
      const key = String(k);
      return await client.hGetAll(key);
    } catch (err) {
      console.error(`[RedisClient] Erro em hGetAllAsync key=${k}:`, err.message);
      return null;
    }
  },

  hValuesAsync: async (k) => {
    if (!k || !isReady) return [];
    try {
      const key = String(k);
      return await client.hVals(key);
    } catch (err) {
      console.error(`[RedisClient] Erro em hValuesAsync key=${k}:`, err.message);
      return [];
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
      return await client.lRange(key, start, stop);
    } catch (err) {
      console.error(`[RedisClient] Erro em lRangeAsync key=${k}:`, err.message);
      return [];
    }
  },

  lPushAsync: async (k, v) => {
    if (!k || !isReady) return null;
    try {
      return await client.lPush(String(k), String(v));
    } catch (err) {
      console.error(`[RedisClient] Erro em lPushAsync key=${k}:`, err.message);
      return null;
    }
  },

  lLenAsync: async (k) => {
    if (!k || !isReady) return 0;
    try {
      return await client.lLen(String(k));
    } catch (err) {
      console.error(`[RedisClient] Erro em lLenAsync key=${k}:`, err.message);
      return 0;
    }
  },

  rPopAsync: async (k) => {
    if (!k || !isReady) return null;
    try {
      return await client.rPop(String(k));
    } catch (err) {
      console.error(`[RedisClient] Erro em rPopAsync key=${k}:`, err.message);
      return null;
    }
  },

  lTrimAsync: async (k, start, stop) => {
    if (!k || !isReady) return null;
    try {
      const key = String(k);
      return await client.lTrim(key, start, stop);
    } catch (err) {
      console.error(`[RedisClient] Erro em lTrimAsync key=${k}:`, err.message);
      return null;
    }
  },

  setNXAsync: async (k, v, exMs) => {
    if (!k || !isReady) return null;
    try {
      const key = String(k);
      const val = String(v ?? "");
      const result = await client.set(key, val, { NX: true, PX: exMs });
      return result === "OK" ? true : null;
    } catch (err) {
      console.error(`[RedisClient] Erro em setNXAsync key=${k}:`, err.message);
      return null;
    }
  },

  keysAsync: async (pattern) => {
    if (!pattern || !isReady) return [];
    try {
      return await client.keys(pattern);
    } catch (err) {
      console.error(`[RedisClient] Erro em keysAsync pattern=${pattern}:`, err.message);
      return [];
    }
  },

  scanIterator: (options) => {
    if (!isReady) {
      async function* empty() { yield* []; }
      return empty();
    }
    return client.scanIterator(options);
  },

  // Suporte a pipeline
  pipeline: () => {
    if (!isReady) throw new Error("RedisClient não está pronto para pipeline");
    return client.multi();
  },

  chatHistoryPipeline: async (historyKey, messageJson, maxLength, ttlSeconds) => {
    if (!historyKey || !isReady) return null;
    try {
      const p = client.multi();
      p.lPush(historyKey, messageJson);
      p.lTrim(historyKey, 0, maxLength - 1);
      p.expire(historyKey, ttlSeconds);
      return await p.exec();
    } catch (err) {
      console.error(`[RedisClient] Erro no chatHistoryPipeline key=${historyKey}:`, err.message);
      return null;
    }
  },

  // ─── ZSET (Sorted Set) — para ranking ──────────────────────────────────────

  zAddAsync: async (key, score, member) => {
    if (!key || !isReady) return null;
    try {
      const k = String(key);
      const s = Number(score);
      const m = String(member);
      return await client.zAdd(k, { score: s, value: m });
    } catch (err) {
      console.error(`[RedisClient] Erro em zAddAsync key=${key}:`, err.message);
      return null;
    }
  },

  zRangeWithScoresAsync: async (key, start, stop) => {
    if (!key || !isReady) return [];
    try {
      const k = String(key);
      const s = String(start || 0);
      const e = String(stop || -1);
      
      return await client.sendCommand(['ZREVRANGE', k, s, e, 'WITHSCORES']);
    } catch (err) {
      console.error(`[RedisClient] Erro em zRangeWithScoresAsync key=${key}:`, err.message);
      return [];
    }
  },

  zRangeByScoreAsync: async (key, min, max) => {
    if (!key || !isReady) return [];
    try {
      const k = String(key);
      const mMin = String(min);
      const mMax = String(max);
      return await client.sendCommand(['ZRANGEBYSCORE', k, mMin, mMax]);
    } catch (err) {
      console.error(`[RedisClient] Erro em zRangeByScoreAsync key=${key}:`, err.message);
      return [];
    }
  },

  zRemAsync: async (key, member) => {
    if (!key || !isReady) return null;
    try {
      const k = String(key);
      const m = String(member);
      return await client.zRem(k, m);
    } catch (err) {
      console.error(`[RedisClient] Erro em zRemAsync key=${key} member=${member}:`, err.message);
      return null;
    }
  },
  
  // ─── Set Operations ─────────────────────────────────────────────────────────

  sAddAsync: async (key, member) => {
    if (!key || !isReady) return null;
    try {
      return await client.sAdd(String(key), String(member));
    } catch (err) {
      console.error(`[RedisClient] Erro em sAddAsync key=${key}:`, err.message);
      return null;
    }
  },

  sRandMemberAsync: async (key, count) => {
    if (!key || !isReady) return count ? [] : null;
    try {
      const k = String(key);
      if (count) {
        return await client.sRandMember(k, count);
      }
      return await client.sRandMember(k);
    } catch (err) {
      console.error(`[RedisClient] Erro em sRandMemberAsync key=${key}:`, err.message);
      return count ? [] : null;
    }
  },

  sMembersAsync: async (key) => {
    if (!key || !isReady) return [];
    try {
      return await client.sMembers(String(key));
    } catch (err) {
      console.error(`[RedisClient] Erro em sMembersAsync key=${key}:`, err.message);
      return [];
    }
  },

  sCardAsync: async (key) => {
    if (!key || !isReady) return 0;
    try {
      return await client.sCard(String(key));
    } catch (err) {
      console.error(`[RedisClient] Erro em sCardAsync key=${key}:`, err.message);
      return 0;
    }
  },

  sRemAsync: async (key, member) => {
    if (!key || !isReady) return null;
    try {
      return await client.sRem(String(key), String(member));
    } catch (err) {
      console.error(`[RedisClient] Erro em sRemAsync key=${key}:`, err.message);
      return null;
    }
  },

  /**
   * SÊNIOR: Executa um script Lua de forma atômica.
   * Fundamental para garantir consistência em ambientes de alta concorrência
   * (ex: regeneração de energia vs compra de itens).
   */
  runLuaAsync: async (script, keys = [], args = []) => {
    if (!isReady) return null;
    try {
      return await client.eval(script, {
        keys: keys.map(String),
        arguments: args.map(String)
      });
    } catch (err) {
      console.error("[RedisClient] Erro ao executar script Lua:", err.message);
      throw err;
    }
  },

  // Expõe referências internas
  getRawClient,
  getIsUpstash,
};

// Aliases para compatibilidade legada
redisWrapper.hsetAsync = redisWrapper.hSetAsync;
redisWrapper.hgetAsync = redisWrapper.hGetAsync;
redisWrapper.hgetallAsync = redisWrapper.hGetAllAsync;

module.exports = redisWrapper;
