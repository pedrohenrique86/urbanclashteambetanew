const gameStateService = require("./services/gameStateService");
const { authenticateSocket } = require("./services/authService");
const chatService = require("./services/chatService");

let io;

function initializeSocket(server) {
  io = server;

  io.on("connection", async (socket) => {
    console.log(`🔌 Novo cliente conectado: ${socket.id}`);

    // --- LÓGICA DE ESTADO DO JOGO (PÚBLICA) ---
    // Isso é enviado para todos que conectam, autenticados ou não.
    try {
      const gameState = await gameStateService.getGameState(); // CORRIGIDO
      socket.emit("gameState", gameState);
      socket.emit("serverTime", { serverTime: Date.now() });
    } catch (error) {
      console.error("❌ Erro ao enviar estado inicial para o cliente:", error);
      socket.emit("error", {
        message: "Não foi possível obter o estado do jogo.",
      });
    }

    // --- LÓGICA DO CHAT (REQUER AUTENTICAÇÃO) ---
    socket.on("chat:authenticate", async (data) => {
      try {
        const token = data.token;
        if (!token) {
          throw new Error("Token não fornecido para autenticação do chat.");
        }

        const user = await authenticateSocket(token);
        if (!user || !user.clan_id) {
          socket.emit("chat:auth_failed", {
            message: "Usuário inválido ou sem clã.",
          });
          return;
        }

        socket.user = user; // Anexa o usuário ao objeto do socket

        const { id: userId, clan_id: clanId } = user;
        const clanRoom = `clan:${clanId}`;
        socket.join(clanRoom);
        console.log(
          `[Socket.IO] Usuário ${userId} autenticado e entrou na sala: ${clanRoom}`,
        );

        // Notifica que o usuário conectou e envia o histórico
        await chatService.handleUserConnection(io, clanId, userId);

        // Listener para novas mensagens (agora dentro do escopo autenticado)
        socket.on("chat:sendMessage", (messageData) => {
          if (
            typeof messageData.text === "string" &&
            messageData.text.trim().length > 0
          ) {
            chatService.handleNewMessage(io, socket, messageData.text);
          }
        });

        // Informa ao cliente que a autenticação foi bem-sucedida
        socket.emit("chat:auth_success");
      } catch (error) {
        console.error(
          "❌ Falha na autenticação do chat via socket:",
          error.message,
        );
        socket.emit("chat:auth_failed", { message: error.message });
      }
    });

    // --- LÓGICA DE DESCONEXÃO ---
    socket.on("disconnect", () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
      // Se o usuário foi autenticado, ele terá a propriedade 'user'
      if (socket.user && socket.user.clan_id) {
        const { id: userId, clan_id: clanId } = socket.user;
        console.log(`[Socket.IO] Usuário desconectado do chat: ${userId}`);
        chatService.handleUserDisconnection(io, clanId, userId);
      }
    });
  });
}

// Função para obter a instância do IO e emitir eventos de outros lugares
function getIO() {
  if (!io) {
    throw new Error("Socket.IO não foi inicializado!");
  }
  return io;
}

module.exports = {
  initializeSocket,
  getIO,
};
