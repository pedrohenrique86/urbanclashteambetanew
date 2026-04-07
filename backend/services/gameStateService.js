const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
// const { getIO } = require("../socketHandler"); // REMOVIDO PARA QUEBRAR DEPENDÊNCIA CIRCULAR

// Wrappers seguros para Redis (Hash)
async function safeRedisHGetAll(key) {
  try {
    return await redisClient.hgetallAsync(key);
  } catch (error) {
    return null;
  }
}

async function safeRedisHSet(key, data) {
  try {
    return await redisClient.hsetAsync(key, data);
  } catch (error) {
    return null;
  }
}

async function safeRedisExpire(key, ttl) {
  try {
    return await redisClient.expireAsync(key, ttl);
  } catch (error) {
    return null;
  }
}

async function safeRedisDel(key) {
  try {
    return await redisClient.delAsync(key);
  } catch (error) {
    return null;
  }
}

const GAME_STATE_CACHE_KEY = "game_state_hash";
const GAME_STATUS_CACHE_KEY = "game:status";
const CACHE_TTL_SECONDS = 3600; // 1 hora

const GameStatus = {
  STOPPED: "stopped",
  SCHEDULED: "scheduled",
  RUNNING: "running",
  PAUSED: "paused",
  FINISHED: "finished",
};

async function seedInitialGameState() {
  try {
    const result = await query("SELECT COUNT(*) FROM game_config");
    if (parseInt(result.rows[0].count, 10) === 0) {
      console.log(
        "🌱 Tabela 'game_config' vazia. Semeando com valores padrão...",
      );
      const defaultConfig = {
        is_paused: "false",
        is_countdown_active: "false",
        game_duration: "1728000", // 20 dias em segundos
      };

      const promises = Object.entries(defaultConfig).map(([key, value]) =>
        query(
          `INSERT INTO game_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
          [key, value],
        ),
      );

      await Promise.all(promises);
      console.log("✅ Tabela 'game_config' semeada com sucesso.");
    }
  } catch (error) {
    console.error("❌ Erro ao semear 'game_config':", error);
    // Não lançar o erro para não impedir o início do servidor
  }
}

async function getGameStateFromDB() {
  try {
    // Garante que a configuração inicial exista antes de tentar ler
    await seedInitialGameState();

    const result = await query("SELECT key, value FROM game_config");
    const config = result.rows.reduce((acc, row) => {
      if (row.value === "true") {
        acc[row.key] = true;
      } else if (row.value === "false") {
        acc[row.key] = false;
      } else if (!isNaN(row.value) && row.value !== "") {
        acc[row.key] = Number(row.value);
      } else {
        acc[row.key] = row.value;
      }
      return acc;
    }, {});
    return config;
  } catch (error) {
    console.error("❌ Erro ao buscar game_config do PostgreSQL:", error);
    throw error;
  }
}

function calculateGameState(rawConfig) {
  const now = new Date();
  const serverTime = now.toISOString();

  const startTime = rawConfig.game_start_time || null;
  const duration = rawConfig.game_duration
    ? parseInt(rawConfig.game_duration, 10)
    : 20 * 24 * 60 * 60; // 20 dias em segundos
  const isPaused =
    rawConfig.is_paused === true || rawConfig.is_paused === "true";

  let status = GameStatus.STOPPED;
  let endTime = null;
  let remainingTime = duration; // Regra 1: Por padrão, o tempo é a duração total (20d)

  if (startTime) {
    const startDate = new Date(startTime);
    endTime = new Date(startDate.getTime() + duration * 1000);

    if (isPaused) {
      status = GameStatus.PAUSED;
      // Se pausado, o tempo restante é a diferença do fim para o início
      remainingTime = Math.floor((endTime - startDate) / 1000);
    } else if (now < startDate) {
      // Jogo agendado, mas não iniciado
      status = GameStatus.SCHEDULED;
      // Regra 2: Contagem regressiva para o início
      remainingTime = Math.floor((startDate - now) / 1000);
    } else if (now >= startDate && now < endTime) {
      // Jogo em andamento
      status = GameStatus.RUNNING;
      remainingTime = Math.floor((endTime - now) / 1000);
    } else if (now >= endTime) {
      // Jogo finalizado
      status = GameStatus.FINISHED;
      remainingTime = 0;
    }
  }

  return {
    status,
    startTime,
    duration,
    serverTime,
    isActive: status === GameStatus.RUNNING,
    isPaused,
    endTime: endTime ? endTime.toISOString() : null,
    remainingTime: Math.max(0, remainingTime),
    gameStatus: status, // Mantendo para compatibilidade se necessário
    lastUpdated: serverTime,
  };
}

async function getGameState() {
  const serverTime = new Date().toISOString();

  try {
    const cachedState = await safeRedisHGetAll(GAME_STATE_CACHE_KEY);

    if (cachedState && Object.keys(cachedState).length > 0) {
      const state = {
        ...cachedState,
        duration: parseInt(cachedState.duration, 10),
        remainingTime: parseInt(cachedState.remainingTime, 10),
        isActive: cachedState.isActive === "true",
        isPaused: cachedState.isPaused === "true",
        serverTime,
        lastUpdated: serverTime,
      };
      return state;
    }
  } catch (error) {
    console.error("❌ Erro ao buscar do Redis, fallback para DB:", error);
  }

  console.log("📦 Cache MISS: Buscando estado do PostgreSQL");
  const rawConfig = await getGameStateFromDB();
  const gameState = calculateGameState(rawConfig);

  try {
    await safeRedisHSet(GAME_STATE_CACHE_KEY, gameState);
    await safeRedisExpire(GAME_STATE_CACHE_KEY, CACHE_TTL_SECONDS);
  } catch (error) {
    console.error("❌ Erro ao salvar estado no Redis:", error);
  }

  return gameState;
}

// CORRIGIDO: Esta função agora usa getGameState para ser consistente
async function getGameStatus() {
  const state = await getGameState();
  return state.status;
}

async function updateGameConfig(key, value) {
  try {
    const result = await query(
      `INSERT INTO game_config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE 
       SET value = $2, updated_at = NOW()
       RETURNING *`,
      [key, String(value)],
    );

    await invalidateAndBroadcastState();

    return {
      success: true,
      config: result.rows[0],
      key,
      value,
    };
  } catch (error) {
    console.error(`❌ Erro ao atualizar configuração '${key}':`, error);
    throw error;
  }
}

async function scheduleGame(startTime, durationSeconds = 20 * 24 * 60 * 60) {
  const startTimeStr =
    startTime instanceof Date ? startTime.toISOString() : startTime;

  try {
    await query("BEGIN");
    await query(
      `INSERT INTO game_config (key, value, updated_at) VALUES 
       ('game_start_time', $1, NOW()),
       ('game_duration', $2, NOW()),
       ('is_countdown_active', 'false', NOW())
       ON CONFLICT (key) DO UPDATE 
       SET value = EXCLUDED.value, updated_at = NOW()`,
      [startTimeStr, String(durationSeconds)],
    );
    await query("COMMIT");
    await invalidateAndBroadcastState(); // CORRIGIDO

    console.log(`📅 Jogo agendado para: ${startTimeStr}`);

    return {
      success: true,
      message: "Jogo agendado com sucesso",
      startTime: startTimeStr,
      duration: durationSeconds,
      status: GameStatus.SCHEDULED,
    };
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
}

async function startGame(startTime, durationSeconds = 20 * 24 * 60 * 60) {
  const startTimeStr =
    startTime instanceof Date ? startTime.toISOString() : startTime;

  try {
    await query("BEGIN");
    await query(
      `INSERT INTO game_config (key, value, updated_at) VALUES 
       ('game_start_time', $1, NOW()),
       ('game_duration', $2, NOW()),
       ('is_countdown_active', 'true', NOW())
       ON CONFLICT (key) DO UPDATE 
       SET value = EXCLUDED.value, updated_at = NOW()`,
      [startTimeStr, String(durationSeconds)],
    );
    await query("COMMIT");
    await invalidateAndBroadcastState(); // CORRIGIDO

    return {
      success: true,
      message: "Jogo iniciado com sucesso",
      startTime: startTimeStr,
      duration: durationSeconds,
      status: GameStatus.RUNNING,
    };
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
}

async function stopGame() {
  try {
    await query("BEGIN");
    await query(
      `INSERT INTO game_config (key, value, updated_at) VALUES 
       ('is_countdown_active', 'false', NOW()),
       ('is_paused', 'false', NOW())
       ON CONFLICT (key) DO UPDATE 
       SET value = EXCLUDED.value, updated_at = NOW()`,
    );
    await query("DELETE FROM game_config WHERE key = 'game_start_time'");
    await query("COMMIT");
    await invalidateAndBroadcastState(); // CORRIGIDO

    return {
      success: true,
      message: "Jogo parado com sucesso",
      status: GameStatus.STOPPED,
    };
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
}

async function pauseGame() {
  await updateGameConfig("is_paused", "true");
  const state = await getGameState();

  return {
    success: true,
    message: "Jogo pausado",
    status: state.status,
    isPaused: true,
  };
}

async function resumeGame() {
  await updateGameConfig("is_paused", "false");
  const state = await getGameState();

  return {
    success: true,
    message: "Jogo despausado",
    status: state.status,
    isPaused: false,
  };
}

async function invalidateAndBroadcastState() {
  try {
    // Quebra a dependência circular importando o getIO somente quando necessário.
    const { getIO } = require("../socketHandler");
    await Promise.all([
      safeRedisDel(GAME_STATE_CACHE_KEY),
      safeRedisDel(GAME_STATUS_CACHE_KEY),
    ]);
    const newState = await getGameState();
    getIO().emit("gameStateUpdated", newState);
    console.log(
      "📢 Estado do jogo invalidado e transmitido para todos os clientes.",
    );
    return newState;
  } catch (error) {
    console.error("❌ Erro ao invalidar e transmitir estado:", error);
    return getGameState();
  }
}

async function checkAutoStart() {
  try {
    const cachedState = await safeRedisHGetAll(GAME_STATE_CACHE_KEY);
    let state;

    if (cachedState && Object.keys(cachedState).length > 0) {
      state = { ...cachedState, isActive: cachedState.isActive === "true" };
      if (state.status !== GameStatus.SCHEDULED) {
        return false;
      }
    }

    const rawConfig = await getGameStateFromDB();
    if (!rawConfig.game_start_time) {
      return false;
    }

    const startTime = new Date(rawConfig.game_start_time);
    const now = new Date();
    const isCountdownActive =
      rawConfig.is_countdown_active === true ||
      rawConfig.is_countdown_active === "true";

    if (!isCountdownActive && now >= startTime) {
      console.log(
        `⏰ Auto-start: Horário ${startTime.toISOString()} alcançado. Ativando countdown...`,
      );
      await query(
        `INSERT INTO game_config (key, value, updated_at)
         VALUES ('is_countdown_active', 'true', NOW())
         ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()`,
      );
      await invalidateAndBroadcastState(); // CORRIGIDO
      console.log("🎮 Jogo iniciado automaticamente!");
      return true;
    }
    return false;
  } catch (error) {
    console.error("❌ Erro no checkAutoStart:", error);
    return false;
  }
}

module.exports = {
  GameStatus,
  getGameState,
  getGameStatus,
  updateGameConfig,
  startGame,
  scheduleGame,
  stopGame,
  pauseGame,
  resumeGame,
  invalidateAndBroadcastState,
  checkAutoStart,
  getGameStateFromDB,
  calculateGameState,
};
