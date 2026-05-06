/**
 * isolationChatService.js
 * 
 * Gerencia o chat volátil do Setor de Isolamento.
 * Mantém apenas as últimas 20 mensagens em memória.
 */

const isolationMessages = [];
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

  isolationMessages.push(newMessage);
  if (isolationMessages.length > MAX_MESSAGES) {
    isolationMessages.shift();
  }

  // Broadcast para a sala de isolamento
  io.to("isolation:room").emit("isolation:message", newMessage);
}

function getHistory() {
  return isolationMessages;
}

module.exports = {
  handleNewMessage,
  getHistory
};
