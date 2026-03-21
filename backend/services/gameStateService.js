const { query } = require("../config/database");
const redisClient = require("../config/redisClient");

// Wrapper seguro para Redis (String)
async function safeRedisGet(key) {
  try {
    return await redisClient.getAsync(key);
  } catch (error) {
    return null;
  }
}

async function safeRedisSet(key, value, mode, ttl) {
  try {
    return await redisClient.setAsync(key, value, mode, ttl);
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

const GAME_STATE_CACHE_KEY = "game:state";
const GAME_STATUS_CACHE_KEY = "game:status";
const CACHE_TTL_SECONDS = 3600; // 1 hora de TTL como segurança

// Status possíveis do jogo
const GameStatus = {
  STOPPED: "stopped", // Jogo não iniciado/parado
  SCHEDULED: "scheduled", // Agendado para iniciar
  RUNNING: "running", // Em execução
  PAUSED: "paused", // Pausado (se implementado futuramente)
  FINISHED: "finished", // Tempo esgotado
};

/**
 * Estrutura padronizada do estado global do jogo
 * @typedef {Object} GameState
 * @property {string} status - Status atual do jogo
 * @property {string|null} startTime - ISO string do início do jogo
 * @property {number|null} duration - Duração em segundos
 * @property {string} serverTime - ISO string da hora atual do servidor
 * @property {boolean} isActive - Se o cronômetro está ativo
 * @property {string|null} endTime - ISO string de término (calculado)
 * @property {number} remainingTime - Tempo restante em segundos (calculado)
 */

/**
 * Busca o estado do jogo diretamente do PostgreSQL.
 * Fallback quando Redis está indisponível ou com cache miss.
 * @returns {Promise<Object>} Raw game config do banco
 */
async function getGameStateFromDB() {
  try {
    const result = await query("SELECT key, value FROM game_config");
    const config = result.rows.reduce((acc, row) => {
      // Converte strings 'true'/'false' para booleanos
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

/**
 * Calcula o status derivado do jogo baseado nos dados brutos
 * @param {Object} rawConfig - Configuração bruta do banco
 * @returns {Object} Estado calculado
 */
function calculateGameState(rawConfig) {
  const now = new Date();
  const serverTime = now.toISOString();

  const startTime = rawConfig.game_start_time || null;
  const isCountdownActive =
    rawConfig.is_countdown_active === true ||
    rawConfig.is_countdown_active === "true";
  const duration = rawConfig.game_duration
    ? parseInt(rawConfig.game_duration)
    : 20 * 24 * 60 * 60;
  const isPaused =
    rawConfig.is_paused === true || rawConfig.is_paused === "true";

  let status = GameStatus.STOPPED;
  let endTime = null;
  let remainingTime = 0;

  if (startTime) {
    const startDate = new Date(startTime);
    endTime = new Date(startDate.getTime() + duration * 1000);

    if (isPaused) {
      status = GameStatus.PAUSED;
    } else if (isCountdownActive) {
      if (now >= endTime) {
        status = GameStatus.FINISHED;
        remainingTime = 0;
      } else {
        status = GameStatus.RUNNING;
        remainingTime = Math.floor((endTime - now) / 1000);
      }
    } else if (now < startDate) {
      status = GameStatus.SCHEDULED;
      remainingTime = duration;
    } else {
      status = GameStatus.STOPPED;
    }
  }

  return {
    status,
    startTime,
    duration,
    serverTime,
    isActive: isCountdownActive && status === GameStatus.RUNNING,
    isPaused,
    endTime: endTime ? endTime.toISOString() : null,
    remainingTime: Math.max(0, remainingTime),
    gameStatus: status,
    lastUpdated: serverTime,
  };
}

/**
 * Obtém o estado atual do jogo com Cache-Aside pattern.
 * @returns {Promise<GameState>} Estado do jogo estruturado
 */
async function getGameState() {
  const serverTime = new Date().toISOString();

  try {
    const cachedState = await safeRedisGet(GAME_STATE_CACHE_KEY);
    if (cachedState) {
      const state = JSON.parse(cachedState);
      state.serverTime = serverTime;
      state.lastUpdated = serverTime;
      return state;
    }
  } catch (error) {
    console.error("❌ Erro ao buscar do Redis, fallback para DB:", error);
  }

  console.log("📦 Cache MISS: Buscando estado do PostgreSQL");
  const rawConfig = await getGameStateFromDB();
  const gameState = calculateGameState(rawConfig);

  try {
    await safeRedisSet(
      GAME_STATE_CACHE_KEY,
      JSON.stringify(gameState),
      "EX",
      CACHE_TTL_SECONDS,
    );
  } catch (error) {
    console.error("❌ Erro ao salvar estado no Redis:", error);
  }

  return gameState;
}

/**
 * Obtém apenas o status atual do jogo
 * @returns {Promise<string>} Status do jogo
 */
async function getGameStatus() {
  try {
    const cached = await safeRedisGet(GAME_STATUS_CACHE_KEY);
    if (cached) return cached;
  } catch (error) {
    // Silent fail
  }

  const state = await getGameState();

  try {
    await safeRedisSet(GAME_STATUS_CACHE_KEY, state.status, "EX", 300);
  } catch (error) {
    // Silent fail
  }

  return state.status;
}

/**
 * Atualiza uma configuração no PostgreSQL e invalida o cache Redis.
 * @param {string} key - Chave da configuração
 * @param {any} value - Valor a ser salvo
 * @returns {Promise<Object>} Resultado da operação
 */
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

    await invalidateGameStateCache();

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

/**
 * Agenda o jogo para iniciar no futuro (sem ativar ainda)
 * @param {string|Date} startTime - Quando o jogo deve iniciar
 * @param {number} durationSeconds - Duração em segundos
 * @returns {Promise<Object>} Resultado da operação
 */
async function scheduleGame(startTime, durationSeconds = 20 * 24 * 60 * 60) {
  const startTimeStr =
    startTime instanceof Date ? startTime.toISOString() : startTime;

  try {
    await query("BEGIN");

    // Agenda SEM ativar (is_countdown_active = 'false')
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
    await invalidateGameStateCache();

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

/**
 * Inicia o jogo imediatamente
 * @param {string|Date} startTime - Quando o jogo deve iniciar
 * @param {number} durationSeconds - Duração em segundos
 * @returns {Promise<Object>} Resultado da operação
 */
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
    await invalidateGameStateCache();

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

/**
 * Para o jogo
 * @returns {Promise<Object>} Resultado da operação
 */
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
    await invalidateGameStateCache();

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

/**
 * Pausa/Despausa o jogo
 * @param {boolean} paused
 * @returns {Promise<Object>}
 */
async function pauseGame(paused = true) {
  await updateGameConfig("is_paused", String(paused));
  const state = await getGameState();

  return {
    success: true,
    message: paused ? "Jogo pausado" : "Jogo despausado",
    status: state.status,
    isPaused: paused,
  };
}

/**
 * Invalida o cache do estado do jogo
 */
async function invalidateGameStateCache() {
  try {
    await Promise.all([
      safeRedisDel(GAME_STATE_CACHE_KEY),
      safeRedisDel(GAME_STATUS_CACHE_KEY),
    ]);
  } catch (error) {
    console.error("❌ Erro ao invalidar cache:", error);
  }
}

/**
 * Verifica se o jogo deve iniciar automaticamente
 * Usa cache, mas invalida quando detecta mudança necessária
 * @returns {Promise<boolean>}
 */
async function checkAutoStart() {
  try {
    // Tenta buscar do cache primeiro (rápido)
    const cachedState = await safeRedisGet(GAME_STATE_CACHE_KEY);
    let state;

    if (cachedState) {
      state = JSON.parse(cachedState);
      // Se já está running/finished, não precisa fazer nada
      if (state.status !== GameStatus.SCHEDULED) {
        return false;
      }
    }

    // Se está SCHEDULED no cache, confirma no banco (evita race condition)
    // Isso só acontece quando está agendado, não a cada 30s
    const rawConfig = await getGameStateFromDB();

    if (!rawConfig.game_start_time) {
      return false;
    }

    const startTime = new Date(rawConfig.game_start_time);
    const now = new Date();
    const isCountdownActive =
      rawConfig.is_countdown_active === true ||
      rawConfig.is_countdown_active === "true";

    // Já passou do horário e countdown não está ativo?
    if (!isCountdownActive && now >= startTime) {
      console.log(
        `⏰ Auto-start: Horário ${startTime.toISOString()} alcançado. Ativando countdown...`,
      );

      await query(
        `INSERT INTO game_config (key, value, updated_at)
         VALUES ('is_countdown_active', 'true', NOW())
         ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()`,
      );

      await invalidateGameStateCache();
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
  scheduleGame, // NOVO: Agendar para futuro
  stopGame,
  pauseGame,
  invalidateGameStateCache,
  checkAutoStart,
  getGameStateFromDB,
  calculateGameState,
};
