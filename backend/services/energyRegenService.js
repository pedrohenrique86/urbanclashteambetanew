const redisClient = require("../config/redisClient");
const playerStateService = require("./playerStateService");
const gameLogic = require("../utils/gameLogic");
const sseService = require("./sseService");

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
 * SÊNIOR: Varre APENAS os jogadores que possuem uma conexão SSE ativa.
 * Em um jogo com 5000 jogadores, se apenas 500 estão online simultaneamente,
 * reduzimos a carga em 90%. Para os jogadores offline, a energia será 
 * recalculada de forma 'Lazy' (pelo playerStateService) no momento em que 
 * eles voltarem a interagir com o servidor.
 */
async function processAllActivePlayers() {
  if (!redisClient.client.isReady) return;

  let processedCount = 0;
  const prefix = playerStateService.PLAYER_STATE_PREFIX;

  try {
    // SÊNIOR: Em vez de SCAN no Redis (lento com muitos dados), 
    // olhamos para quem o SSE Service está rastreando localmente.
    const activeTopics = require("./sseService")._getTopics ? require("./sseService")._getTopics() : [];
    
    // Filtra tópicos que começam com "player:"
    const onlinePlayerIds = [];
    
    // Precisamos expor ou acessar os tópicos do sseService.
    // Como somos dev senior, vamos ajustar o sseService para expor os canais de jogadores em um Set eficiente.
    
    // Por enquanto, usaremos uma abordagem robusta: se não conseguirmos os online, 
    // mantemos o SCAN mas reduzimos a frequência ou usamos um filtro de 'last_active'.
    // Mas a melhor prática real é: rastrear IDs online no Redis (SSET 'online_players').
    
    const onlineSetKey = "online_players_set";
    const onlineIds = await redisClient.sMembersAsync(onlineSetKey);

    if (!onlineIds || onlineIds.length === 0) {
      // SÊNIOR FIX: Se ninguém está online, não fazemos nada!
      // Os jogadores offline terão sua energia calculada por 'Lazy Evaluation' (tempo decorrido)
      // no exato momento que abrirem o jogo novamente, mantendo o banco de dados Neon em 0% de uso.
      return;
    }

    for (const userId of onlineIds) {
      processedCount++;
      await playerStateService.regenEnergyForPlayer(userId);
    }
  } catch (err) {
    console.error("[energyService] ❌ Erro no processamento de regeneração:", err.message);
  }

  if (processedCount > 0) {
    // console.log(`[energyService] ⚡ Ciclo concluído — ${processedCount} jogadores regenerados.`);
  }
}

module.exports = {
  startEnergyRegenHeartbeat
};
