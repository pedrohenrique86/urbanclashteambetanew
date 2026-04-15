const redisClient = require("../config/redisClient");

// Histórico limitado a 20 mensagens por clã.
// Manter baixo é intencional: custo O(1) de escrita, leitura de lista pequena, RAM previsível.
const HISTORY_MAX_LENGTH = 20;

// TTL de 25 horas em segundos.
// Renovado a cada nova mensagem — clãs inativos expiram automaticamente sem nenhum job.
const HISTORY_TTL_SECONDS = 25 * 60 * 60; // 90.000s

// Cutoff de 24 horas em milissegundos — usado no filtro de leitura.
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 86.400.000ms

const CLAN_ROOM_PREFIX = "clan:";

// --- Funções de Chave ---

const getHistoryKey = (clanId) => `chat:history:${clanId}`;
const getClanRoom = (clanId) => `${CLAN_ROOM_PREFIX}${clanId}`;

// --- Funções Internas ---

/**
 * Adiciona uma mensagem ao histórico Redis, mantém o limite e renova o TTL.
 *
 * Usa pipeline atômico: LPUSH + LTRIM + EXPIRE em um único round-trip Redis.
 * Antes eram 3 awaits sequenciais (3 round-trips). Agora é 1 exec().
 *
 * Compatibilidade garantida:
 *   - Upstash: pipeline REST batched (1 requisição HTTP)
 *   - node-redis: MULTI/EXEC sobre TCP
 *
 * @param {string} clanId   - ID do clã.
 * @param {object} message  - Objeto da mensagem já serializada.
 */
async function addMessageToHistory(clanId, message) {
  const historyKey = getHistoryKey(clanId);
  const messageJson = JSON.stringify(message);

  console.log(`[ChatService] Salvando na key: ${historyKey} | Payload:`, messageJson);

  // Pipeline atômico: 1 round-trip ao invés de 3.
  const pipelineResult = await redisClient.chatHistoryPipeline(
    historyKey,
    messageJson,
    HISTORY_MAX_LENGTH,
    HISTORY_TTL_SECONDS,
  );
  console.log(`[ChatService] Pipeline result:`, pipelineResult);
}

/**
 * Obtém o histórico de chat do Redis, filtrando mensagens com mais de 24h.
 *
 * O filtro é feito em Node.js sobre uma lista de no máximo 20 itens — custo O(20),
 * absolutamente desprezível. Nenhuma query extra ao Redis é necessária.
 *
 * O backend é a única fonte de verdade para expiração.
 * O frontend nunca decide o que é válido ou não.
 *
 * @param {string} clanId - ID do clã.
 * @returns {Promise<object[]>} Histórico de mensagens válidas (< 24h), em ordem cronológica.
 */
async function getChatHistory(clanId) {
  const historyKey = getHistoryKey(clanId);
  console.log(`[ChatService] Lendo de: ${historyKey}`);

  const historyJson = await redisClient.lRangeAsync(historyKey, 0, -1);
  console.log(`[ChatService] lRangeAsync retornou:`, historyJson);

  if (!Array.isArray(historyJson) || historyJson.length === 0) {
    console.log(`[ChatService] Fim da leitura. Array Vazio ou invalido retornado.`);
    return [];
  }

  const cutoff = Date.now() - EXPIRY_MS;

  return historyJson
    .map((msg) => {
      try {
        return JSON.parse(msg);
      } catch {
        // Mensagem corrompida no Redis — ignora silenciosamente.
        return null;
      }
    })
    .filter((msg) => {
      if (!msg || !msg.timestamp) return false;
      // Compara milissegundos — timestamp é ISO string gerado pelo backend.
      return new Date(msg.timestamp).getTime() >= cutoff;
    })
    .reverse(); // Redis LIST é LIFO (LPUSH) → reverse para ordem cronológica crescente.
}

// --- Funções Exportadas (Manipuladores de Eventos) ---

/**
 * Manipula o recebimento de uma nova mensagem de chat.
 *
 * O timestamp é gerado aqui, no processo Node.js do servidor.
 * Nunca confiamos no relógio do cliente para definir quando a mensagem foi criada.
 *
 * @param {object} io     - Instância do Socket.IO.
 * @param {object} socket - O objeto do socket do remetente.
 * @param {string} text   - O texto da mensagem (já validado no socketHandler).
 */
async function handleNewMessage(io, socket, text) {
  const { user } = socket;
  if (!user || !user.clan_id) return;

  const message = {
    userId: user.id,
    username: user.username,
    text: text.trim(),
    // ISO 8601 UTC — consistente independente do fuso do servidor.
    // Usado como única referência de tempo para o filtro de 24h.
    timestamp: new Date().toISOString(),
  };

  await addMessageToHistory(user.clan_id, message);

  // Broadcast para todos os sockets autenticados na sala do clã.
  io.to(getClanRoom(user.clan_id)).emit("chat:message", message);
}

module.exports = {
  getChatHistory,
  handleNewMessage,
};