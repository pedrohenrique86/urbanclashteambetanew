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

// Instância da Promise de inicialização para ser aguardada pelo servidor
const redisReadyPromise = initRedis();

module.exports = {
  redisReadyPromise,
  client: {
    get isReady() {
      return isReady;
    },
  },
  getAsync: async (k) => {
    if (!isReady) return null;
    try {
      if (isUpstash) {
        return await client.get(k);
      } else {
        return await client.get(k);
      }
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
  hGetAllAsync: async (k) => {
    if (!isReady) return null;
    try {
      return await client.hGetAll(k);
    } catch {
      return null;
    }
  },
  lRangeAsync: async (k, start, stop) => {
    if (!isReady) return null;
    try {
      if (isUpstash) {
        return await client.lrange(k, start, stop);
      } else {
        return await client.lRange(k, start, stop);
      }
    } catch (error) {
      console.error("❌ ERRO LRANGE:", error);
      return null;
    }
  },
  setNXAsync: async (k, v, exMs) => {
    if (!isReady) return null;
    try {
      if (isUpstash) {
        // Upstash: SET com NX e PX em milissegundos
        const result = await client.set(String(k), String(v), {
          nx: true,
          px: exMs,
        });
        return result === "OK" || result === true ? true : null;
      } else {
        // node-redis: SET com NX e PX em milissegundos
        const result = await client.set(String(k), String(v), {
          NX: true,
          PX: exMs,
        });
        return result === "OK" ? true : null;
      }
    } catch {
      return null;
    }
  },
  scanIterator: (options) => {
    if (!isReady || isUpstash) {
      async function* empty() {
        yield* [];
      }
      return empty();
    }
    return client.scanIterator(options);
  },

  /**
   * Pipeline atômico para adicionar mensagem ao histórico de chat.
   *
   * Executa LPUSH + LTRIM + EXPIRE em um único round-trip Redis.
   * Compatível com Upstash (pipeline REST batched) e node-redis (MULTI/EXEC TCP).
   *
   * Antes: 3 awaits sequenciais → 3 round-trips (até ~3× latência de rede no Upstash).
   * Depois: 1 exec()           → 1 round-trip, resultado atomicamente garantido.
   *
   * @param {string} historyKey    - Chave Redis da lista de histórico.
   * @param {string} messageJson   - JSON da mensagem já serializado.
   * @param {number} maxLength     - Número máximo de entradas na lista (LTRIM stop = maxLength - 1).
   * @param {number} ttlSeconds    - TTL em segundos para EXPIRE na key.
   * @returns {Promise<Array|null>} Resultado do exec() do pipeline, ou null em caso de erro.
   */
  chatHistoryPipeline: async (historyKey, messageJson, maxLength, ttlSeconds) => {
    if (!isReady) return null;
    try {
      if (isUpstash) {
        // Upstash @upstash/redis: .pipeline() aceita comandos em lowercase.
        // Todos os comandos são batched em uma única requisição HTTP REST.
        const pipeline = client.pipeline();
        pipeline.lpush(historyKey, messageJson);
        pipeline.ltrim(historyKey, 0, maxLength - 1);
        pipeline.expire(historyKey, ttlSeconds);
        return await pipeline.exec();
      } else {
        // node-redis: .multi() cria um bloco MULTI/EXEC — pipeline sobre TCP.
        // Comandos em camelCase conforme API do node-redis v4+.
        const pipeline = client.multi();
        pipeline.lPush(historyKey, messageJson);
        pipeline.lTrim(historyKey, 0, maxLength - 1);
        pipeline.expire(historyKey, ttlSeconds);
        return await pipeline.exec();
      }
    } catch {
      return null;
    }
  },
};
