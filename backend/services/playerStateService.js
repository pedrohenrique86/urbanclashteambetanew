const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const sseService = require("./sseService"); // Importar o sseService

const PLAYER_STATE_PREFIX = "playerState:";
const PERSISTENCE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos

/**
 * Carrega o estado de um jogador do PostgreSQL para o Redis.
 * Deve ser chamado no login ou quando a sessão do jogador é iniciada.
 *
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<object|null>} O estado do jogador carregado ou null em caso de erro.
 */
async function loadPlayerState(userId) {
  if (!redisClient.client.isReady) {
    console.error(
      "Redis não está pronto. Impossível carregar o estado do jogador.",
    );
    return null;
  }

  try {
    const profileResult = await query(
      `
      SELECT 
        p.*,
        u.username, u.country, u.created_at as account_created_at, u.birth_date,
        c.name as clan_name
      FROM user_profiles p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN clan_members cm ON cm.user_id = p.user_id
      LEFT JOIN clans c ON cm.clan_id = c.id
      WHERE p.user_id = $1
      `,
      [userId],
    );

    if (profileResult.rows.length === 0) {
      return null; // Perfil não encontrado
    }

    const playerState = profileResult.rows[0];
    const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;

    // Converte todos os valores para string para armazenamento no Redis Hash
    const stateForRedis = Object.entries(playerState).reduce(
      (acc, [key, value]) => {
        if (value instanceof Date) {
          acc[key] = value.toISOString();
        } else if (key === "birth_date" && value) {
          // birth_date no Postgres 'date' vem como objeto Date.
          // Se vier como string/outro, tentamos garantir o formato ISO date.
          acc[key] = new Date(value).toISOString().split("T")[0];
        } else {
          acc[key] = String(value ?? "");
        }
        return acc;
      },
      {},
    );

    stateForRedis.is_dirty = "0"; // Adiciona o marcador "não sujo"

    await redisClient.hSetAsync(redisKey, stateForRedis);
    // Define um TTL (Time To Live) para a chave, limpando jogadores inativos
    await redisClient.expireAsync(redisKey, 3600 * 6); // 6 horas

    console.log(`Estado do jogador ${userId} carregado para o Redis.`);
    return playerState;
  } catch (error) {
    console.error(
      `❌ Erro ao carregar estado do jogador ${userId} para o Redis:`,
      error,
    );
    return null;
  }
}

/**
 * Obtém o estado atual de um jogador diretamente do Redis.
 *
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<object|null>} O estado do jogador do cache ou null se não encontrado.
 */
async function getPlayerState(userId) {
  if (!redisClient.client.isReady) return null;
  const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;

  const stateFromRedis = await redisClient.hGetAllAsync(redisKey);

  if (!stateFromRedis || Object.keys(stateFromRedis).length === 0) {
    // Se não estiver no cache, tenta carregar do DB como fallback
    return await loadPlayerState(userId);
  }

  // TODO: Converter valores numéricos de string para number antes de retornar
  return stateFromRedis;
}

/**
 * Atualiza o estado de um jogador no Redis. Usa HINCRBY para operações atômicas.
 *
 * @param {string} userId - O ID do usuário.
 * @param {object} updates - Um objeto com os campos a serem atualizados e seus valores (ex: { energy: -10, xp: 50 }).
 * @returns {Promise<object|null>} O novo estado do jogador após a atualização.
 */
async function updatePlayerState(userId, updates) {
  if (!redisClient.client.isReady) return null;
  const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;

  try {
    const pipeline = redisClient.pipeline();

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "number") {
        pipeline.hIncrBy(redisKey, key, value);
      } else {
        pipeline.hSet(redisKey, key, String(value));
      }
    }

    pipeline.hSet(redisKey, "is_dirty", "1");
    await pipeline.exec();

    // Após a atualização, busca o estado atualizado para emitir o evento
    const newState = await getPlayerState(userId);

    // Se a atualização incluiu 'experience_points' ou 'level', emita o evento
    if (
      newState &&
      (updates.experience_points !== undefined || updates.level !== undefined)
    ) {
      sseService.publish("ranking", "ranking:player:update", {
        playerId: newState.user_id,
        faction: newState.faction,
        level: parseInt(newState.level, 10),
        current_xp: parseInt(newState.experience_points, 10),
      });
    }

    return newState;
  } catch (error) {
    console.error(
      `❌ Erro ao atualizar estado do jogador ${userId} no Redis:`,
      error,
    );
    return null;
  }
}

/**
 * Persiste o estado de um único jogador do Redis para o PostgreSQL.
 *
 * @param {string} userId - O ID do usuário.
 */
async function persistPlayerState(userId) {
  if (!redisClient.client.isReady) return;
  const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;

  const playerState = await redisClient.hGetAllAsync(redisKey);

  if (!playerState || playerState.is_dirty !== "1") {
    return; // Nada a fazer se não estiver "sujo"
  }

  try {
    // Remove campos de controle antes de salvar
    const { id, user_id, is_dirty, ...fieldsToUpdate } = playerState;

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      updateFields.push(`${key} = $${paramCount++}`);
      // TODO: Garantir que os tipos de dados estão corretos para o PG
      updateValues.push(value);
    }

    if (updateFields.length === 0) return;

    updateValues.push(userId);

    await query(
      `UPDATE user_profiles SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $${paramCount}`,
      updateValues,
    );

    // Reseta o marcador "sujo" no Redis após a persistência bem-sucedida
    await redisClient.hSetAsync(redisKey, "is_dirty", "0");
    console.log(`Estado do jogador ${userId} persistido no PostgreSQL.`);
  } catch (error) {
    console.error(`❌ Erro ao persistir estado do jogador ${userId}:`, error);
  }
}

/**
 * Worker que periodicamente verifica e persiste todos os estados "sujos".
 */
async function persistDirtyStates() {
  if (!redisClient.client.isReady) {
    return;
  }

  try {
    // Usando o iterador seguro para percorrer as chaves
    const iterator = redisClient.scanIterator({
      MATCH: `${PLAYER_STATE_PREFIX}*`,
      COUNT: 100, // Processa em lotes de 100
    });

    for await (const key of iterator) {
      const isDirty = await redisClient.hGetAsync(key, "is_dirty");
      if (isDirty === "1") {
        const userId = key.replace(PLAYER_STATE_PREFIX, "");
        await persistPlayerState(userId);
      }
    }
  } catch (error) {
    console.error("❌ Erro no worker de persistência:", error);
  }
}

/**
 * Inicia o worker de persistência em segundo plano.
 */
function schedulePersistence() {
  console.log(
    `🚀 Worker de persistência agendado para rodar a cada ${PERSISTENCE_INTERVAL_MS / 1000} segundos.`,
  );
  setInterval(persistDirtyStates, PERSISTENCE_INTERVAL_MS);
}

module.exports = {
  loadPlayerState,
  getPlayerState,
  updatePlayerState,
  persistPlayerState,
  schedulePersistence,
};