/**
 * globalChatService.js
 * 
 * Gerencia o chat global unificado (Social Zone) usando Redis.
 * Escalável para milhares de jogadores, 100% volátil (não toca no PostgreSQL).
 */

const redisClient = require("../config/redisClient");

const GLOBAL_CHAT_KEY = "chat:global:messages";
const GLOBAL_USERS_KEY = "chat:global:online";
const MAX_MESSAGES = 30;
const HISTORY_TTL = 60 * 60 * 24; // 24 horas de expiração se ninguém falar nada

/**
 * Adiciona uma nova mensagem ao Redis e mantém apenas as últimas 30.
 */
async function handleNewMessage(io, socket, text) {
  if (!socket.user) return;

  const newMessage = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    userId: socket.user.id,
    username: socket.user.username,
    avatar: socket.user.avatar_url,
    faction: socket.user.faction,
    country: socket.user.country,
    text: text,
    timestamp: new Date().toISOString()
  };

  const messageJson = JSON.stringify(newMessage);

  // Usa o pipeline otimizado do redisClient para LPUSH + LTRIM + EXPIRE atômico
  await redisClient.chatHistoryPipeline(GLOBAL_CHAT_KEY, messageJson, MAX_MESSAGES, HISTORY_TTL);

  // Broadcast para todos na sala global
  io.to("global:room").emit("global:message", newMessage);
}

/**
 * Retorna o histórico do Redis (as últimas 30 mensagens).
 */
async function getHistory() {
  const rawHistory = await redisClient.lRangeAsync(GLOBAL_CHAT_KEY, 0, -1);
  return rawHistory.map(m => {
    try { return JSON.parse(m); } catch (e) { return null; }
  }).filter(Boolean).reverse(); // Reverse pois LPUSH adiciona no início
}

/**
 * Adiciona um usuário à lista de online do chat global no Redis.
 */
async function addUserOnline(userId, username, avatar, faction, country) {
  const userData = JSON.stringify({ id: userId, username, avatar, faction, country });
  await redisClient.hSetAsync(GLOBAL_USERS_KEY, String(userId), userData);
}

/**
 * Remove um usuário da lista de online.
 */
async function removeUserOnline(userId) {
  await redisClient.hDelAsync(GLOBAL_USERS_KEY, String(userId));
}

/**
 * Retorna a lista de usuários online no chat global.
 */
async function getOnlineUsers() {
  const rawUsers = await redisClient.hValuesAsync(GLOBAL_USERS_KEY);
  return rawUsers.map(u => {
    try { return JSON.parse(u); } catch (e) { return null; }
  }).filter(Boolean);
}

module.exports = {
  handleNewMessage,
  getHistory,
  addUserOnline,
  removeUserOnline,
  getOnlineUsers
};
