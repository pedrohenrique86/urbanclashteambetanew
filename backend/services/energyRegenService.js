const redisClient = require("../config/redisClient");
const playerStateService = require("./playerStateService");
const gameLogic = require("../utils/gameLogic");

/**
 * energyRegenService.js
 * 
 * SÊNIOR: Serviço de Heartbeat para Regeneração de Energia.
 * Diferente da abordagem "Lazy", este serviço empurra as atualizações periodicamente
 * para que os jogadores vejam suas barras de energia subindo em tempo real (via SSE),
 * mesmo sem interagir com o site.
 */

let regenIntervalId = null;

/**
 * Inicia o loop global de regeneração.
 */
function startEnergyRegenHeartbeat() {
  if (regenIntervalId) return;

  const checkIntervalMs = 30000; // Verifica a cada 30 segundos para ser responsivo
  const targetMinutes = gameLogic.ENERGY.REGEN_RATE_MINUTES || 3;

  console.log(`[energyService] 💓 Heartbeat de verificação iniciado (cada ${checkIntervalMs/1000}s). Alvo: +1 a cada ${targetMinutes}min`);

  regenIntervalId = setInterval(async () => {
    try {
      await processAllActivePlayers();
    } catch (error) {
      console.error("[energyService] ❌ Erro no heartbeat:", error.message);
    }
  }, checkIntervalMs);
}


/**
 * Varre todos os jogadores ativos no Redis e processa a regeneração.
 */
async function processAllActivePlayers() {
  if (!redisClient.client.isReady) return;

  let processedCount = 0;

  const prefix = playerStateService.PLAYER_STATE_PREFIX;

  try {
    // Usa scanIterator — o método correto do wrapper do redisClient
    for await (const key of redisClient.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
      const userId = key.replace(prefix, "");
      processedCount++;

      try {
        // getPlayerState dispara _checkAndRegenEnergy internamente e envia SSE se ganhou energia
        await playerStateService.getPlayerState(userId);
      } catch (err) {
        // Silencioso por player individual para não poluir logs
      }
    }
  } catch (err) {
    console.error("[energyService] ❌ Erro no SCAN:", err.message);
  }

  if (processedCount > 0) {
    console.log(`[energyService] ⚡ Ciclo concluído — ${processedCount} jogadores verificados.`);
  }
}

module.exports = {
  startEnergyRegenHeartbeat
};
