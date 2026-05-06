/**
 * recoveryChatService.js
 * 
 * Gerencia o chat da Base de Recuperação usando Redis.
 * Escalável e persistente entre reinicializações.
 */

const redisClient = require("../config/redisClient");

const RECOVERY_CHAT_KEY = "chat:recovery:messages";
const MAX_MESSAGES = 20;
const HISTORY_TTL = 60 * 60 * 24; // 24 horas

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

  // Usa o pipeline otimizado do redisClient
  await redisClient.chatHistoryPipeline(RECOVERY_CHAT_KEY, messageJson, MAX_MESSAGES, HISTORY_TTL);

  // Broadcast para a sala de recuperação
  io.to("recovery:room").emit("recovery:message", newMessage);
}

async function getHistory() {
  const rawHistory = await redisClient.lRangeAsync(RECOVERY_CHAT_KEY, 0, -1);
  return rawHistory.map(m => {
    try { return JSON.parse(m); } catch (e) { return null; }
  }).filter(Boolean).reverse();
}

module.exports = {
  handleNewMessage,
  getHistory
};
