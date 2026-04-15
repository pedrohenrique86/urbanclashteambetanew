const gameStateService = require("./services/gameStateService");
const { authenticateSocket } = require("./services/authService");
const chatService = require("./services/chatService");

const MESSAGE_COOLDOWN_MS = 5000; // 5 segundos de cooldown
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
      // Guard: se o socket já foi autenticado, não registra um novo listener
      // de chat:sendMessage. Apenas reemite o sucesso para o cliente reconectar
      // o estado sem duplicar handlers.
      if (socket.user) {
        socket.emit("chat:auth_success");
        return;
      }

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
        socket.lastMessageTimestamp = 0; // Inicializa o timestamp para o anti-flood

        const { id: userId, clan_id: clanId } = user;
        const clanRoom = `clan:${clanId}`;
        socket.join(clanRoom);
        console.log(
          `[Socket.IO] Usuário ${userId} autenticado e entrou na sala: ${clanRoom}`,
        );

        // 1. Notifica o cliente que a autenticação foi bem-sucedida
        socket.emit("chat:auth_success");

        // 2. Envia o histórico de chat APENAS para o socket que acabou de se conectar
        const history = await chatService.getChatHistory(clanId);
        socket.emit("chat:history", history);

        // Listener para novas mensagens com anti-flood e limite de caracteres.
        // Registrado apenas UMA vez por socket (guard acima garante isso).
        socket.on("chat:sendMessage", async (messageData) => {
          const now = Date.now();
          if (now - socket.lastMessageTimestamp < MESSAGE_COOLDOWN_MS) {
            console.log(
              `[Anti-Flood] Mensagem bloqueada (cooldown) para o usuário ${socket.user.id}`,
            );
            return;
          }

          const messageText =
            typeof messageData.text === "string" ? messageData.text.trim() : "";

          if (messageText.length === 0) {
            return;
          }

          if (messageText.length > 100) {
            console.log(
              `[Anti-Flood] Mensagem bloqueada (muito longa) para o usuário ${socket.user.id}`,
            );
            return;
          }

          // Atualiza o timestamp antes do await para manter o cooldown mesmo em caso de erro.
          socket.lastMessageTimestamp = now;

          try {
            await chatService.handleNewMessage(io, socket, messageText);
          } catch (err) {
            console.error(
              `[Chat] Erro ao processar mensagem do usuário ${socket.user.id}:`,
              err.message,
            );
          }
        });
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
