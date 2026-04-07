const redisClient = require("../config/redisClient");
const { getIO } = require("../socketHandler");

const HISTORY_MAX_LENGTH = 30; // Manter as últimas 30 mensagens

/**
 * Retorna a chave Redis para o histórico de chat de um clã.
 * @param {string} clanId - O ID do clã.
 * @returns {string} A chave do histórico no Redis.
 */
const getHistoryKey = (clanId) => `chat:history:${clanId}`;

/**
 * Retorna a chave Redis para as conexões ativas de um clã.
 * @param {string} clanId - O ID do clã.
 * @returns {string} A chave de conexões no Redis.
 */
const getConnectionsKey = (clanId) => `chat:connections:${clanId}`;

/**
 * Adiciona uma mensagem ao histórico de chat de um clã e a transmite.
 * @param {string} clanId - O ID do clã.
 * @param {object} message - O objeto da mensagem (ex: { userId, username, text, timestamp }).
 */
async function addMessage(clanId, message) {
  const historyKey = getHistoryKey(clanId);
  const messageJson = JSON.stringify(message);

  // Adiciona a mensagem à lista e garante que a lista não exceda o tamanho máximo.
  await redisClient.lPush(historyKey, messageJson);
  await redisClient.lTrim(historyKey, 0, HISTORY_MAX_LENGTH - 1);

  // Transmite a nova mensagem para todos os membros do clã na sala.
  getIO().to(clanId).emit("chat:message", message);
}

/**
 * Retorna o histórico de mensagens de um clã.
 * @param {string} clanId - O ID do clã.
 * @returns {Promise<object[]>} Uma promessa que resolve para a lista de mensagens.
 */
async function getChatHistory(clanId) {
  const historyKey = getHistoryKey(clanId);
  const historyJson = await redisClient.lRange(historyKey, 0, -1);
  // O histórico é armazenado do mais novo para o mais antigo (LPUSH), então revertemos para exibir na ordem correta.
  return historyJson.map((msg) => JSON.parse(msg)).reverse();
}

/**
 * Manipula a conexão de um novo usuário ao chat.
 * Incrementa o contador de conexões e notifica o clã se o usuário ficou online.
 * @param {string} clanId - O ID do clã.
 * @param {string} userId - O ID do usuário.
 */
async function handleUserConnection(clanId, userId) {
  const connectionsKey = getConnectionsKey(clanId);
  // Incrementa o contador de conexões para este usuário. Retorna o novo valor.
  const newConnectionCount = await redisClient.hIncrBy(connectionsKey, userId, 1);

  // Se for a primeira conexão, o usuário acabou de ficar online.
  if (newConnectionCount === 1) {
    await broadcastOnlineUsers(clanId);
  }
}

/**
 * Manipula a desconexão de um usuário do chat.
 * Decrementa o contador de conexões e notifica o clã se o usuário ficou offline.
 * @param {string} clanId - O ID do clã.
 * @param {string} userId - O ID do usuário.
 */
async function handleUserDisconnection(clanId, userId) {
  if (!clanId || !userId) return;

  const connectionsKey = getConnectionsKey(clanId);
  // Decrementa o contador de conexões.
  const newConnectionCount = await redisClient.hIncrBy(connectionsKey, userId, -1);

  // Se o contador chegou a zero, o usuário não tem mais conexões ativas.
  if (newConnectionCount <= 0) {
    // Remove o usuário do hash para manter a limpeza.
    await redisClient.hDel(connectionsKey, userId);
    await broadcastOnlineUsers(clanId);
  }
}

/**
 * Obtém e transmite a lista de usuários online e a contagem para a sala do clã.
 * @param {string} clanId - O ID do clã.
 */
async function broadcastOnlineUsers(clanId) {
  const connectionsKey = getConnectionsKey(clanId);
  // Pega todos os campos (userIds) do hash.
  const onlineUserIds = await redisClient.hKeys(connectionsKey);

  const onlineCount = onlineUserIds.length;

  // Emite a atualização para todos na sala do clã.
  getIO().to(clanId).emit("chat:onlineStatus", {
    onlineUsers: onlineUserIds,
    onlineCount: onlineCount,
  });
}

module.exports = {
  addMessage,
  getChatHistory,
  handleUserConnection,
  handleUserDisconnection,
  broadcastOnlineUsers,
};