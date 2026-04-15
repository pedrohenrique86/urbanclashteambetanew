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
      // Controle de versão para evitar stale state gerado por race condition (ex: clicks múltiplos)
      socket.authVersion = (socket.authVersion || 0) + 1;
      const currentAuthVersion = socket.authVersion;

      try {
        const token = data.token;
        if (!token) {
          throw new Error("Token não fornecido para autenticação do chat.");
        }

        const user = await authenticateSocket(token);

        // Se uma chamada mais nova foi disparada enquanto esperávamos o BD,
        // esta request tornou-se obsoleta. Aborta silenciosamente.
        if (currentAuthVersion !== socket.authVersion) {
          return;
        }

        if (!user || !user.clan_id) {
          socket.emit("chat:auth_failed", {
            message: "Usuário inválido ou sem clã.",
          });
          return;
        }

        // Se o usuário mudou de clã na mesma conexão, remove da sala antiga
        if (socket.user && socket.user.clan_id && socket.user.clan_id !== user.clan_id) {
          const oldClanRoom = `clan:${socket.user.clan_id}`;
          socket.leave(oldClanRoom);
          console.log(`[Socket.IO] Usuário ${user.id} saiu da sala antiga: ${oldClanRoom}`);
        }

        socket.user = user; // Anexa/Atualiza o usuário no objeto do socket
        if (socket.lastMessageTimestamp === undefined) {
          socket.lastMessageTimestamp = 0; // Inicializa o timestamp para o anti-flood
        }

        const { id: userId, clan_id: clanId } = user;
        const clanRoom = `clan:${clanId}`;
        socket.join(clanRoom);
        console.log(
          `[Socket.IO] Usuário ${userId} autenticado e entrou na sala: ${clanRoom}`,
        );

        // 1. Busca histórico do clã
        let history = null;
        try {
          history = await chatService.getChatHistory(clanId);
        } catch (historyErr) {
          console.error(`[Chat] Aviso: Falha ao carregar histórico do clã ${clanId}`, historyErr.message);
        }

        // Segunda checagem de versão:
        // Se uma nova autenticação iniciou durante o tempo de busca no Redis,
        // o histórico retornado pertence ao contexto antigo. Aborta emissões.
        if (currentAuthVersion !== socket.authVersion) {
          return;
        }

        // 2. Notifica o cliente que a autenticação foi 100% resolvida e consolidada
        socket.emit("chat:auth_success");

        // 3. Envia o histórico se conseguiu buscar, ou sinaliza erro pra instigar 1 único retry local
        if (history) {
          socket.emit("chat:history", history);
        } else {
          socket.emit("chat:history_error");
        }

        // Listener para novas mensagens com anti-flood e limite de caracteres.
        // Registrado apenas UMA VEZ usando flag de controle no próprio socket.
        if (!socket.hasChatListener) {
          socket.hasChatListener = true;

          // Listener do Retry Simples (1 chamada per cycle se backend falhar)
          socket.on("chat:request_history", async () => {
            if (!socket.user || !socket.user.clan_id) return;
            try {
              const h = await chatService.getChatHistory(socket.user.clan_id);
              socket.emit("chat:history", h);
            } catch (err) {
              console.error(`[Chat] Retry do histórico falhou pro usuário ${socket.user.id}`);
            }
          });

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
        }
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
