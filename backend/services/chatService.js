const redisClient = require("../config/redisClient");

const HISTORY_MAX_LENGTH = 50; // Aumentado para 50 mensagens
const CLAN_ROOM_PREFIX = "clan:";

// --- Funções de Chave ---

const getHistoryKey = (clanId) => `chat:history:${clanId}`;
const getConnectionsKey = (clanId) => `chat:connections:${clanId}`;
const getClanRoom = (clanId) => `${CLAN_ROOM_PREFIX}${clanId}`;

// --- Funções Internas ---

/**
 * Adiciona uma mensagem ao histórico Redis e o limita.
 * @param {string} clanId - ID do clã.
 * @param {object} message - Objeto da mensagem.
 */
async function addMessageToHistory(clanId, message) {
  const historyKey = getHistoryKey(clanId);
  const messageJson = JSON.stringify(message);
  // CORRIGIDO: Usa o wrapper
  await redisClient.lPushAsync(historyKey, messageJson);
  await redisClient.lTrimAsync(historyKey, 0, HISTORY_MAX_LENGTH - 1);
}

/**
 * Obtém o histórico de chat do Redis.
 * @param {string} clanId - ID do clã.
 * @returns {Promise<object[]>} Histórico de mensagens.
 */
async function getChatHistory(clanId) {
  const historyKey = getHistoryKey(clanId);
  // CORRIGIDO: Usa o wrapper
  const historyJson = await redisClient.lRangeAsync(historyKey, 0, -1);
  // Garante que o retorno seja sempre um array
  if (!Array.isArray(historyJson)) return [];
  return historyJson.map((msg) => JSON.parse(msg)).reverse();
}

/**
 * Transmite a lista atualizada de usuários online para a sala do clã.
 * @param {object} io - Instância do Socket.IO.
 * @param {string} clanId - ID do clã.
 */
async function broadcastOnlineUsers(io, clanId) {
  const connectionsKey = getConnectionsKey(clanId);
  // CORRIGIDO: Usa o wrapper hKeysAsync
  const onlineUserIds = await redisClient.hKeysAsync(connectionsKey);
  const onlineCount = onlineUserIds ? onlineUserIds.length : 0;

  io.to(getClanRoom(clanId)).emit("chat:onlineStatus", {
    onlineUsers: onlineUserIds || [],
    onlineCount,
  });
}

// --- Funções Exportadas (Manipuladores de Eventos) ---

/**
 * Manipula a conexão de um novo usuário ao chat.
 * @param {object} io - Instância do Socket.IO.
 * @param {string} clanId - ID do clã do usuário.
 * @param {string} userId - ID do usuário.
 */
async function handleUserConnection(io, clanId, userId) {
  const connectionsKey = getConnectionsKey(clanId);

  // Incrementa a contagem de conexões para o usuário
  await redisClient.hIncrByAsync(connectionsKey, userId, 1);

  // Transmite a lista atualizada para todos no clã.
  await broadcastOnlineUsers(io, clanId);
}

/**
 * Manipula a desconexão de um usuário.
 * @param {object} io - Instância do Socket.IO.
 * @param {string} clanId - ID do clã do usuário.
 * @param {string} userId - ID do usuário.
 */
async function handleUserDisconnection(io, clanId, userId) {
  if (!clanId || !userId) return;

  const connectionsKey = getConnectionsKey(clanId);

  // CORREÇÃO FINAL: Usa o método correto do wrapper
  const newConnectionCount = await redisClient.hIncrByAsync(
    connectionsKey,
    userId,
    -1,
  );

  if (newConnectionCount <= 0) {
    // Se o contador for zero ou menos, remove o usuário do hash
    await redisClient.hDelAsync(connectionsKey, userId);
    // E então atualiza a lista de usuários online
    await broadcastOnlineUsers(io, clanId);
  }
}

/**
 * Manipula o recebimento de uma nova mensagem de chat.
 * @param {object} io - Instância do Socket.IO.
 * @param {object} socket - O objeto do socket do remetente.
 * @param {string} text - O texto da mensagem.
 */
async function handleNewMessage(io, socket, text) {
  const { user } = socket;
  if (!user || !user.clan_id) return;

  const message = {
    userId: user.id,
    username: user.username,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  await addMessageToHistory(user.clan_id, message);

  // Transmite a nova mensagem para todos na sala do clã.
  io.to(getClanRoom(user.clan_id)).emit("chat:message", message);
}

module.exports = {
  getChatHistory,
  handleUserConnection,
  handleUserDisconnection,
  handleNewMessage,
  broadcastOnlineUsers, // Exporta a função
};
