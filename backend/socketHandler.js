const gameStateService = require("./services/gameStateService");
const { authenticateSocket } = require("./services/authService");
const chatService = require("./services/chatService");

const MESSAGE_COOLDOWN_MS = 5000;
let io;

function initializeSocket(server) {
  io = server;
  io.on("connection", async (socket) => {
    // Sincronização inicial do estado do jogo
    socket.on("getGameState", async () => {
      try {
        const state = await gameStateService.getGameState();
        socket.emit("gameState", state);
      } catch (error) {
        console.error("Erro ao enviar estado inicial do jogo:", error);
      }
    });

    socket.on("chat:authenticate", async (data) => {
      socket.authVersion = (socket.authVersion || 0) + 1;
      const currentAuthVersion = socket.authVersion;

      try {
        const token = data.token;
        if (!token) throw new Error("Token não fornecido.");

        const user = await authenticateSocket(token);
        if (currentAuthVersion !== socket.authVersion) return;

        const clanId = String(user?.clan_id ?? "").trim();
        if (!clanId || clanId === "null" || clanId === "undefined") {
          socket.emit("chat:auth_failed", { message: "Usuário sem clã válido." });
          return;
        }

        const clanRoom = `clan:${clanId}`;
        
        // Limpeza rigorosa de salas de clã anteriores para garantir isolamento (F5/Refresh)
        for (const room of [...socket.rooms]) {
          if (room.startsWith("clan:") && room !== clanRoom) {
            socket.leave(room);
          }
        }

        socket.user = user;
        if (socket.lastMessageTimestamp === undefined) socket.lastMessageTimestamp = 0;
        socket.join(clanRoom);

        // Disparar histórico imediatamente após autenticação
        const history = await chatService.getChatHistory(clanId);
        if (currentAuthVersion !== socket.authVersion) return;

        socket.emit("chat:auth_success");
        socket.emit("chat:history", history || []);

        // Listeners persistentes (registrados apenas uma vez por socket)
        if (!socket.hasChatListener) {
          socket.hasChatListener = true;

          // Envio de nova mensagem
          socket.on("chat:sendMessage", async (messageData) => {
            if (!socket.user || !socket.user.clan_id) return;
            
            const now = Date.now();
            if (now - socket.lastMessageTimestamp < MESSAGE_COOLDOWN_MS) return;
            
            const messageText = typeof messageData.text === "string" ? messageData.text.trim() : "";
            if (messageText.length === 0) return;

            socket.lastMessageTimestamp = now;
            await chatService.handleNewMessage(io, socket, messageText);
          });

          // Pedido manual de histórico (Repescagem/Fallback)
          socket.on("chat:request_history", async () => {
            if (!socket.user || !socket.user.clan_id) return;
            try {
              const hist = await chatService.getChatHistory(socket.user.clan_id);
              socket.emit("chat:history", hist || []);
            } catch (err) {
              socket.emit("chat:history_error");
            }
          });
        }
      } catch (err) {
        socket.emit("chat:auth_failed", { message: err.message });
      }
    });

    // ─── CHAT DA BASE DE RECUPERAÇÃO (RECONDICIONAMENTO) ──────────────────────────
    socket.on("recovery:authenticate", async (data) => {
      try {
        const token = data.token;
        if (!token) throw new Error("Token não fornecido.");

        const user = await authenticateSocket(token);
        socket.user = user;
        socket.join("recovery:room");

        // SÊNIOR: Gerenciamento de lista de usuários online na recuperação
        // Emitir lista atualizada para todos na sala
        const updateRecoveryUsers = async () => {
          const sockets = await io.in("recovery:room").fetchSockets();
          const users = sockets
            .map(s => s.user)
            .filter(u => !!u)
            .map(u => ({ id: u.id, username: u.username, avatar: u.avatar_url }));
          
          // Remover duplicatas de userId
          const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
          io.to("recovery:room").emit("recovery:users", uniqueUsers);
        };

        await updateRecoveryUsers();

        const recoveryChatService = require("./services/recoveryChatService");
        socket.emit("recovery:auth_success");
        socket.emit("recovery:history", recoveryChatService.getHistory());

        socket.on("disconnect", async () => {
          await updateRecoveryUsers();
        });

        if (!socket.hasRecoveryListener) {
          socket.hasRecoveryListener = true;
          socket.on("recovery:sendMessage", async (msgData) => {
            const now = Date.now();
            if (now - (socket.lastRecoveryMsg || 0) < 2000) return; // Cooldown 2s
            
            const text = typeof msgData.text === "string" ? msgData.text.trim() : "";
            if (text.length === 0) return;

            socket.lastRecoveryMsg = now;
            const recoveryChatService = require("./services/recoveryChatService");
            await recoveryChatService.handleNewMessage(io, socket, text);
          });
        }
      } catch (err) {
        socket.emit("recovery:auth_failed", { message: err.message });
      }
    });
  });
}

const getIO = () => io;

module.exports = { initializeSocket, getIO };
