/**
 * recoveryChatService.js
 * 
 * Gerencia o chat volátil da Base de Recuperação.
 * Mantém apenas as últimas 20 mensagens em memória.
 */

const recoveryMessages = [];
const MAX_MESSAGES = 20;

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

  recoveryMessages.push(newMessage);
  if (recoveryMessages.length > MAX_MESSAGES) {
    recoveryMessages.shift();
  }

  // Broadcast para a sala de recuperação
  io.to("recovery:room").emit("recovery:message", newMessage);
}

function getHistory() {
  return recoveryMessages;
}

module.exports = {
  handleNewMessage,
  getHistory
};
