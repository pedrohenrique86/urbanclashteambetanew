const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const sseService = require("./sseService");

const CLAN_STATE_PREFIX = "clanState:";
const DIRTY_CLANS_SET = "dirty:clans:set";
const CLAN_STATE_TTL = 3600 * 24; // 24h as SSOT for clans during high traffic

/**
 * Carrega o estado de um clã (incluindo member_count) do DB para o Redis.
 */
async function loadClanState(clanId) {
  if (!redisClient.client.isReady) return null;

  try {
    const result = await query(
      `
      SELECT 
        c.id, c.season_score, c.faction, c.max_members, c.member_count
      FROM clans c
      WHERE c.id = $1
      `,
      [clanId]
    );

    if (result.rows.length === 0) return null;

    const clanState = result.rows[0];
    const redisKey = `${CLAN_STATE_PREFIX}${clanId}`;

    const stateForRedis = {
       score: String(clanState.season_score),
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
 * @param {object} updates { score: number, member_count: number }
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
      const now = String(Date.now());
      pipeline.hSet(redisKey, "is_dirty", "1");
      pipeline.hSet(redisKey, "is_dirty_at", now);
      pipeline.sAdd(DIRTY_CLANS_SET, String(clanId));
      await pipeline.exec();

      const newState = await getClanState(clanId);
      
      // Emitir evento SSE se a pontuação mudou
      if (updates.score) {
        sseService.publish("ranking", "ranking:clan-score:update", {
          clanId,
          score: parseInt(newState.score, 10),
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
 * SÊNIOR: Persistência em Lote de Clãs (Write-Behind).
 * Migrado de SCAN para Operação de Conjunto Atômico (O(N) onde N é clãs sujos apenas).
 */
async function persistDirtyClanStates() {
  if (!redisClient.client.isReady) return;

  try {
    const dirtyIds = await redisClient.sMembersAsync(DIRTY_CLANS_SET);
    if (!dirtyIds || dirtyIds.length === 0) return;

    for (const clanId of dirtyIds) {
      const redisKey = `${CLAN_STATE_PREFIX}${clanId}`;
      const state = await redisClient.hGetAllAsync(redisKey);

      if (state && state.is_dirty === "1") {
        const loadedDirtyAt = state.is_dirty_at;
        const rawScore = parseInt(state.score, 10);
        const safeScore = isNaN(rawScore) ? 0 : rawScore;

        // Persiste no DB
        await query(
           "UPDATE clans SET season_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
           [safeScore, clanId]
        );

        // Limpeza Segura (Optimistic Locking)
        const currentDirtyAt = await redisClient.hGetAsync(redisKey, "is_dirty_at");
        if (currentDirtyAt === loadedDirtyAt) {
          const p = redisClient.pipeline();
          p.hSet(redisKey, "is_dirty", "0");
          p.hSet(redisKey, "is_dirty_at", "");
          p.sRem(DIRTY_CLANS_SET, String(clanId));
          await p.exec();
        }
      } else {
        // Se por algum motivo não está dirty, remove do set de rastreio
        await redisClient.sRemAsync(DIRTY_CLANS_SET, String(clanId));
      }
    }
    
    if (dirtyIds.length > 0) {
      console.log(`[clanState] 📦 Arquivado lote de ${dirtyIds.length} clãs.`);
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