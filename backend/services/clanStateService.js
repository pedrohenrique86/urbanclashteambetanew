const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const sseService = require("./sseService");

const CLAN_STATE_PREFIX = "clanState:";

/**
 * Carrega o estado de um clã (incluindo member_count) do DB para o Redis.
 */
async function loadClanState(clanId) {
  if (!redisClient.client.isReady) return null;

  try {
    const result = await query(
      `
      SELECT 
        c.id, c.points, c.faction, c.max_members,
        (SELECT COUNT(*)::int FROM clan_members WHERE clan_id = c.id) as member_count
      FROM clans c
      WHERE c.id = $1
      `,
      [clanId]
    );

    if (result.rows.length === 0) return null;

    const clanState = result.rows[0];
    const redisKey = `${CLAN_STATE_PREFIX}${clanId}`;

    const stateForRedis = {
       points: String(clanState.points),
       member_count: String(clanState.member_count),
       faction: String(clanState.faction),
       is_dirty: "0"
    };

    await redisClient.hSetAsync(redisKey, stateForRedis);
    await redisClient.expireAsync(redisKey, 3600 * 24); // 24h

    return clanState;
  } catch (error) {
    console.error(`❌ Erro ao carregar estado do clã ${clanId}:`, error);
    return null;
  }
}

/**
 * Obtém o estado do clã do Redis (com fallback para DB).
 */
async function getClanState(clanId) {
  if (!redisClient.client.isReady) return null;
  const redisKey = `${CLAN_STATE_PREFIX}${clanId}`;
  
  const state = await redisClient.hGetAllAsync(redisKey);
  if (!state || Object.keys(state).length === 0) {
    return await loadClanState(clanId);
  }
  return state;
}

/**
 * Atualiza o estado do clã no Redis de forma atômica.
 * @param {string} clanId 
 * @param {object} updates { points: number, member_count: number }
 */
async function updateClanState(clanId, updates) {
  if (!redisClient.client.isReady) return null;
  const redisKey = `${CLAN_STATE_PREFIX}${clanId}`;

  try {
    const pipeline = redisClient.pipeline();
    let hasChanges = false;

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "number" && value !== 0) {
        pipeline.hIncrBy(redisKey, key, value);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      pipeline.hSet(redisKey, "is_dirty", "1");
      await pipeline.exec();

      const newState = await getClanState(clanId);
      
      // Emitir evento SSE se a pontuação mudou
      if (updates.points) {
        sseService.publish("ranking", "ranking:clan-score:update", {
          clanId,
          score: parseInt(newState.points, 10),
          faction: newState.faction
        });
      }

      return newState;
    }
    return await getClanState(clanId);
  } catch (error) {
    console.error(`❌ Erro ao atualizar estado do clã ${clanId}:`, error);
    return null;
  }
}

/**
 * Persiste todos os clãs marcados como "sujos" no PostgreSQL.
 * Deve ser chamado a cada 10 minutos (no fluxo do ranking).
 */
async function persistDirtyClanStates() {
  if (!redisClient.client.isReady) return;

  try {
    const iterator = redisClient.scanIterator({
      MATCH: `${CLAN_STATE_PREFIX}*`,
      COUNT: 100
    });

    for await (const key of iterator) {
      const state = await redisClient.hGetAllAsync(key);
      if (state && state.is_dirty === "1") {
        const clanId = key.split(":")[1];
        await query(
           "UPDATE clans SET points = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
           [parseInt(state.points, 10), clanId]
        );
        await redisClient.hSetAsync(key, "is_dirty", "0");
        console.log(`💾 Estado do clã ${clanId} persistido (Pontos: ${state.points})`);
      }
    }
  } catch (error) {
    console.error("❌ Erro ao persistir estados dos clãs:", error);
  }
}

module.exports = {
  loadClanState,
  getClanState,
  updateClanState,
  persistDirtyClanStates
};