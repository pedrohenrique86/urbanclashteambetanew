const gameStateService = require("./services/gameStateService");
const { authenticateSocket } = require("./services/authService");
const chatService = require("./services/chatService");
const redisClient = require("./config/redisClient");

// ─── SÊNIOR: Helper de Anti-Multi-Aba para Socket.IO ───────────────────────
async function enforceSingleSession(io, socket, user, cid) {
  const userRoom = `user:${user.id}`;
  socket.cid = cid || "unknown";
  socket.join(userRoom);

  // Busca todos os sockets deste usuário (O(1) com adapter ou local)
  const socketsInRoom = await io.in(userRoom).fetchSockets();
  for (const s of socketsInRoom) {
    // Se for o mesmo usuário, porém em outro socket com CID diferente (outra aba)
    if (s.id !== socket.id && s.cid !== socket.cid) {
      s.emit("socket:duplicate_session", { message: "Sessão finalizada: outra aba foi aberta." });
      setTimeout(() => s.disconnect(true), 2000);
    }
  }
}
// ──────────────────────────────────────────────────────────────────────────

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

        // SÊNIOR: Valida sessão única usando o CID
        await enforceSingleSession(io, socket, user, data.cid);

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

    // ─── CHAT DO SETOR DE ISOLAMENTO ──────────────────────────────────────────
    socket.on("isolation:authenticate", async (data) => {
      try {
        const token = data.token;
        if (!token) throw new Error("Token não fornecido.");

        const user = await authenticateSocket(token);
        const playerStateService = require("./services/playerStateService");
        const playerState = await playerStateService.getPlayerState(user.id);
        user.faction = playerState ? playerState.faction : 'gangsters';
        user.avatar_url = playerState ? playerState.avatar_url : user.avatar_url;

        // SÊNIOR: Valida sessão única usando o CID
        await enforceSingleSession(io, socket, user, data.cid);

        socket.user = user;
        socket.join("isolation:room");

        const ISOLATION_USERS_KEY = "online_players:isolation";
        const userData = JSON.stringify({ id: user.id, username: user.username, avatar: user.avatar_url, faction: user.faction, country: user.country });
        
        await redisClient.hSetAsync(ISOLATION_USERS_KEY, String(user.id), userData);

        const emitIsolationUsers = async () => {
          const rawUsers = await redisClient.hValuesAsync(ISOLATION_USERS_KEY);
          const users = rawUsers.map(u => {
            try { return JSON.parse(u); } catch(e) { return null; }
          }).filter(Boolean);
          io.to("isolation:room").emit("isolation:users", users);
        };

        await emitIsolationUsers();

        const isolationChatService = require("./services/isolationChatService");
        socket.emit("isolation:auth_success");
        socket.emit("isolation:history", await isolationChatService.getHistory());

        socket.on("disconnect", async () => {
          await redisClient.hDelAsync(ISOLATION_USERS_KEY, String(user.id));
          await emitIsolationUsers();
        });

        if (!socket.hasIsolationListener) {
          socket.hasIsolationListener = true;
          socket.on("isolation:sendMessage", async (msgData) => {
            if (!socket.user) return;
            const now = Date.now();
            if (now - (socket.lastIsolationMsg || 0) < 3000) return; // Cooldown 3s
            
            let text = typeof msgData.text === "string" ? msgData.text.trim() : "";
            if (text.length === 0) return;
            if (text.length > 100) text = text.substring(0, 100);

            socket.lastIsolationMsg = now;
            const isolationChatService = require("./services/isolationChatService");
            await isolationChatService.handleNewMessage(io, socket, text);
          });
        }
      } catch (err) {
        socket.emit("isolation:auth_failed", { message: err.message });
      }
    });

    // ─── CHAT DA BASE DE RECUPERAÇÃO (RECONDICIONAMENTO) ──────────────────────────
    socket.on("recovery:authenticate", async (data) => {
      try {
        const token = data.token;
        if (!token) throw new Error("Token não fornecido.");

        const user = await authenticateSocket(token);
        const playerStateService = require("./services/playerStateService");
        const playerState = await playerStateService.getPlayerState(user.id);
        user.faction = playerState ? playerState.faction : 'gangsters';
        user.avatar_url = playerState ? playerState.avatar_url : user.avatar_url;

        // SÊNIOR: Valida sessão única usando o CID
        await enforceSingleSession(io, socket, user, data.cid);

        socket.user = user;
        socket.join("recovery:room");

        const RECOVERY_USERS_KEY = "online_players:recovery";
        const userData = JSON.stringify({ id: user.id, username: user.username, avatar: user.avatar_url, faction: user.faction, country: user.country });
        
        await redisClient.hSetAsync(RECOVERY_USERS_KEY, String(user.id), userData);

        const emitRecoveryUsers = async () => {
          const rawUsers = await redisClient.hValuesAsync(RECOVERY_USERS_KEY);
          const users = rawUsers.map(u => {
            try { return JSON.parse(u); } catch(e) { return null; }
          }).filter(Boolean);
          io.to("recovery:room").emit("recovery:users", users);
        };

        await emitRecoveryUsers();

        const recoveryChatService = require("./services/recoveryChatService");
        socket.emit("recovery:auth_success");
        socket.emit("recovery:history", await recoveryChatService.getHistory());

        socket.on("disconnect", async () => {
          await redisClient.hDelAsync(RECOVERY_USERS_KEY, String(user.id));
          await emitRecoveryUsers();
        });

        if (!socket.hasRecoveryListener) {
          socket.hasRecoveryListener = true;
          socket.on("recovery:sendMessage", async (msgData) => {
            if (!socket.user) return;
            const now = Date.now();
            if (now - (socket.lastRecoveryMsg || 0) < 3000) return; // Cooldown 3s
            
            let text = typeof msgData.text === "string" ? msgData.text.trim() : "";
            if (text.length === 0) return;
            if (text.length > 100) text = text.substring(0, 100);

            socket.lastRecoveryMsg = now;
            const recoveryChatService = require("./services/recoveryChatService");
            await recoveryChatService.handleNewMessage(io, socket, text);
          });
        }
      } catch (err) {
        socket.emit("recovery:auth_failed", { message: err.message });
      }
    });

    // ─── CHAT GLOBAL (ZONA SOCIAL) ──────────────────────────────────────────────
    socket.on("global:authenticate", async (data) => {
      try {
        const token = data.token;
        if (!token) throw new Error("Token não fornecido.");

        const user = await authenticateSocket(token);
        const playerStateService = require("./services/playerStateService");
        const playerState = await playerStateService.getPlayerState(user.id);
        user.faction = playerState ? playerState.faction : 'gangsters';
        user.avatar_url = playerState ? playerState.avatar_url : user.avatar_url;

        // SÊNIOR: Valida sessão única usando o CID
        await enforceSingleSession(io, socket, user, data.cid);

        socket.user = user;
        socket.join("global:room");

        const globalChatService = require("./services/globalChatService");
        await globalChatService.addUserOnline(user.id, user.username, user.avatar_url, user.faction, user.country);

        const emitGlobalUsers = async () => {
          const users = await globalChatService.getOnlineUsers();
          io.to("global:room").emit("global:users", users);
        };

        await emitGlobalUsers();
        socket.emit("global:auth_success");
        socket.emit("global:history", await globalChatService.getHistory());

        socket.on("disconnect", async () => {
          await globalChatService.removeUserOnline(user.id);
          await emitGlobalUsers();
        });

        if (!socket.hasGlobalListener) {
          socket.hasGlobalListener = true;
          socket.on("global:sendMessage", async (msgData) => {
            if (!socket.user) return;
            const now = Date.now();
            if (now - (socket.lastGlobalMsg || 0) < 2000) return; // Cooldown 2s (Global mais rápido)
            
            let text = typeof msgData.text === "string" ? msgData.text.trim() : "";
            if (text.length === 0) return;
            if (text.length > 120) text = text.substring(0, 120);

            socket.lastGlobalMsg = now;
            await globalChatService.handleNewMessage(io, socket, text);
          });
        }
      } catch (err) {
        socket.emit("global:auth_failed", { message: err.message });
      }
    });
  });
}

const getIO = () => io;

module.exports = { initializeSocket, getIO };
