const gameStateService = require("./services/gameStateService");
const { authenticateSocket } = require("./services/authService");
const chatService = require("./services/chatService");
const redisClient = require("./config/redisClient");
const clanMemberService = require("./services/clanMemberService");

async function enforceSingleSession(io, socket, user, cid) {
  const userId = String(user.id);
  const userRoom = `user:${userId}`;

  // SÊNIOR: Identificação de Dispositivo (CID) para evitar duplicidade real
  // O CID é gerado no frontend e amarrado à sessão do socket.
  socket.cid = cid;

  const existingSockets = await io.in(userRoom).fetchSockets();
  
  for (const s of existingSockets) {
    if (s.id !== socket.id) {
      console.log(`[AUTH] 🛡️ Derrubando sessão duplicada (User: ${userId}, NewCID: ${cid}, OldCID: ${s.cid})`);
      s.emit("session_duplicate", { 
        message: "Sua conta foi conectada em outro dispositivo ou aba.",
        new_cid: cid 
      });
      s.disconnect(true);
    }
  }

  socket.join(userRoom);
}

// ──────────────────────────────────────────────────────────────────────────

const MESSAGE_COOLDOWN_MS = 5000;
let io;

function initializeSocket(server) {
  io = server;
  io.on("connection", async (socket) => {
    // SÊNIOR: Autenticação via query param (suporta reconexão rápida 4G)
    const token = socket.handshake.query.token;
    const cid = socket.handshake.query.cid || "legacy";

    if (token) {
      try {
        const user = await authenticateSocket(token);
        if (user) {
          socket.user = user;
          await enforceSingleSession(io, socket, user, cid);
          console.log(`[SOCKET] ✅ Usuário ${user.username} conectado (4G/Wi-Fi Ready)`);
        }
      } catch (err) {
        console.warn(`[SOCKET] ❌ Falha na auth inicial: ${err.message}`);
      }
    }
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

        const rawClanId = user?.clan_id;
        const clanId = (rawClanId && rawClanId !== "null" && rawClanId !== "undefined") ? String(rawClanId).trim() : "";

        if (!clanId) {
          socket.emit("chat:auth_failed", { message: "Você não pertence a uma divisão (clã) no momento." });
          return;
        }

        // SÊNIOR: Verificação dupla contra o DB para evitar spoofing/stale state
        const isMember = await clanMemberService.isMember(clanId, user.id);
        
        if (!isMember) {
          console.warn(`[Socket:ChatAuth] 🛡️ Acesso negado: user=${user.id} não pertence ao clã ${clanId}`);
          socket.emit("chat:auth_failed", { message: "Acesso negado: Você não pertence a este clã." });
          return;
        }

        const clanRoom = `clan:${clanId}`;
        
        // Limpeza rigorosa de salas de clã anteriores para garantir isolamento
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
      } catch (err) {
        console.error(`[Socket:ChatAuth] ❌ Erro: ${err.message}`);
        socket.emit("chat:auth_failed", { message: "Falha na autenticação do chat." });
      }
    });

    // SÊNIOR: Envio de mensagem unificado
    socket.on("chat:sendMessage", async (messageData) => {
      const user = socket.user;
      if (!user) return;
      
      const rawClanId = user.clan_id;
      const clanId = (rawClanId && rawClanId !== "null" && rawClanId !== "undefined") ? String(rawClanId).trim() : "";
      if (!clanId) return;

      const now = Date.now();
      if (now - (socket.lastMessageTimestamp || 0) < MESSAGE_COOLDOWN_MS) return;

      const messageText = String(messageData?.text || messageData?.content || "").trim();
      if (!messageText) return;

      socket.lastMessageTimestamp = now;
      try {
        await chatService.handleNewMessage(io, socket, messageText);
      } catch (err) {
        console.error(`[Socket:Chat] Erro ao enviar:`, err.message);
      }
    });

    // Pedido manual de histórico
    socket.on("chat:request_history", async () => {
      const user = socket.user;
      if (!user || !user.clan_id) return;
      const history = await chatService.getChatHistory(user.clan_id);
      socket.emit("chat:history", history || []);
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
          // SÊNIOR: Anti-Race-Condition para Multi-Aba (Anti-Multi-Aba)
          // Só remove do Redis se este for o ÚLTIMO socket ativo do usuário.
          const userRoom = `user:${user.id}`;
          const sockets = await io.in(userRoom).fetchSockets();
          if (sockets.length === 0) {
            await redisClient.hDelAsync(ISOLATION_USERS_KEY, String(user.id));
            await emitIsolationUsers();
          }
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
          // SÊNIOR: Anti-Race-Condition para Multi-Aba
          const userRoom = `user:${user.id}`;
          const sockets = await io.in(userRoom).fetchSockets();
          if (sockets.length === 0) {
            await redisClient.hDelAsync(RECOVERY_USERS_KEY, String(user.id));
            await emitRecoveryUsers();
          }
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
          // SÊNIOR: Anti-Race-Condition para Multi-Aba
          const userRoom = `user:${user.id}`;
          const sockets = await io.in(userRoom).fetchSockets();
          if (sockets.length === 0) {
            await globalChatService.removeUserOnline(user.id);
            await emitGlobalUsers();
          }
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
