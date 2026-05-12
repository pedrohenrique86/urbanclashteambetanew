const WebSocket = require("ws");
const gameStateService = require("./services/gameStateService");
const { authenticateSocket } = require("./services/authService");
const chatService = require("./services/chatService");
const redisClient = require("./config/redisClient");
const clanMemberService = require("./services/clanMemberService");

/**
 * SÊNIOR: Gerenciador de WebSockets Nativos (High Performance)
 * Substitui o Socket.io para reduzir overhead de memória e CPU.
 * 
 * Implementa lógica de "Salas" (Rooms) manualmente.
 */

let wss;
const rooms = new Map(); // roomName -> Set of sockets
const userConnections = new Map(); // userId -> Set of sockets (para multi-aba)

function initializeSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", async (ws, req) => {
    // SÊNIOR: Extração de token/cid da query string nativa
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const cid = url.searchParams.get("cid") || "legacy";

    ws.rooms = new Set();
    ws.cid = cid;

    // Helper para emitir eventos (formato padronizado)
    ws.sendEvent = (type, data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data }));
      }
    };

    if (token) {
      try {
        const user = await authenticateSocket(token);
        if (user) {
          ws.user = user;
          const userId = String(user.id);
          
          // Gerenciar conexões por usuário (Multi-aba)
          if (!userConnections.has(userId)) {
            userConnections.set(userId, new Set());
          }
          userConnections.get(userId).add(ws);

          // SÊNIOR: Sessão Única via Native WS
          await enforceSingleSession(ws, userId, cid);

          // Entrar na sala privada do usuário
          joinRoom(ws, `user:${userId}`);
          
          console.log(`[WS-NATIVE] ✅ ${user.username} conectado`);
        }
      } catch (err) {
        console.warn(`[WS-NATIVE] ❌ Auth falhou: ${err.message}`);
      }
    }

    ws.on("message", async (message) => {
      try {
        const { type, data } = JSON.parse(message);
        handleEvent(ws, type, data);
      } catch (err) {
        // Ignora mensagens malformadas
      }
    });

    ws.on("close", () => {
      if (ws.user) {
        const userId = String(ws.user.id);
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) userConnections.delete(userId);
        }
      }
      
      // Sair de todas as salas
      ws.rooms.forEach(roomName => leaveRoom(ws, roomName));
      
      // Cleanup específico de chats (Redis online status)
      handleCleanup(ws);
    });

    ws.on("error", (err) => {
      console.error("[WS-NATIVE] Erro no socket:", err.message);
    });
  });

  console.log("\x1b[35m[WS-NATIVE]\x1b[0m 🚀 Engine de Alta Performance Ativada");
}

async function handleEvent(ws, type, data) {
  const user = ws.user;

  switch (type) {
    case "getGameState":
      try {
        const state = await gameStateService.getGameState();
        ws.sendEvent("gameState", state);
      } catch (error) {
        console.error("Erro getGameState:", error);
      }
      break;

    case "chat:authenticate":
      await handleChatAuth(ws, data);
      break;

    case "chat:sendMessage":
      await handleChatMessage(ws, data);
      break;

    case "chat:request_history":
      if (user && user.clan_id) {
        const history = await chatService.getChatHistory(user.clan_id);
        ws.sendEvent("chat:history", history || []);
      }
      break;

    case "isolation:authenticate":
      await handleIsolationAuth(ws, data);
      break;

    case "isolation:sendMessage":
      await handleIsolationMessage(ws, data);
      break;

    case "recovery:authenticate":
      await handleRecoveryAuth(ws, data);
      break;

    case "recovery:sendMessage":
      await handleRecoveryMessage(ws, data);
      break;

    case "global:authenticate":
      await handleGlobalAuth(ws, data);
      break;

    case "global:sendMessage":
      await handleGlobalMessage(ws, data);
      break;

    case "ping":
      ws.sendEvent("pong", { time: Date.now() });
      break;
  }
}

// ─── LÓGICA DE SALAS (ROOMS) ──────────────────────────────────────────────

function joinRoom(ws, roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  rooms.get(roomName).add(ws);
  ws.rooms.add(roomName);
}

function leaveRoom(ws, roomName) {
  if (rooms.has(roomName)) {
    rooms.get(roomName).delete(ws);
    if (rooms.get(roomName).size === 0) {
      rooms.delete(roomName);
    }
  }
  ws.rooms.delete(roomName);
}

function broadcastToRoom(roomName, type, data, excludeWs = null) {
  const payload = JSON.stringify({ type, data });
  
  if (roomName === "all") {
    // SÊNIOR: Broadcast Global (todos os clientes conectados)
    wss.clients.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
    return;
  }

  if (rooms.has(roomName)) {
    rooms.get(roomName).forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}

// ─── AUTH & SEGURANÇA ─────────────────────────────────────────────────────

async function enforceSingleSession(ws, userId, cid) {
  const connections = userConnections.get(userId);
  if (!connections) return;

  for (const s of connections) {
    if (s !== ws) {
      console.log(`[WS-NATIVE] 🛡️ Derrubando duplicada (User: ${userId}, NewCID: ${cid}, OldCID: ${s.cid})`);
      s.sendEvent("session_duplicate", { 
        message: "Sua conta foi conectada em outro dispositivo ou aba.",
        new_cid: cid 
      });
      s.close();
    }
  }
}

// ─── HANDLERS DE CHAT (REPLICADOS DO ORIGINAL) ───────────────────────────

async function handleChatAuth(ws, data) {
  try {
    const user = ws.user || await authenticateSocket(data.token);
    if (!user) throw new Error("Não autorizado");
    ws.user = user;

    const clanId = String(user.clan_id || "").trim();
    if (!clanId || clanId === "null") {
      return ws.sendEvent("chat:auth_failed", { message: "Sem divisão (clã)." });
    }

    const isMember = await clanMemberService.isMember(clanId, user.id);
    if (!isMember) return ws.sendEvent("chat:auth_failed", { message: "Acesso negado." });

    joinRoom(ws, `clan:${clanId}`);
    const history = await chatService.getChatHistory(clanId);
    ws.sendEvent("chat:auth_success");
    ws.sendEvent("chat:history", history || []);
  } catch (err) {
    ws.sendEvent("chat:auth_failed", { message: err.message });
  }
}

async function handleChatMessage(ws, data) {
  const user = ws.user;
  if (!user || !user.clan_id) return;

  const now = Date.now();
  if (now - (ws.lastMsg || 0) < 5000) return;
  ws.lastMsg = now;

  const text = String(data?.text || "").trim();
  if (!text) return;

  try {
    // SÊNIOR: O chatService precisa de um objeto 'io' fake para broadcastToRoom
    const fakeIo = {
      to: (roomName) => ({
        emit: (event, payload) => broadcastToRoom(roomName, event, payload)
      })
    };
    await chatService.handleNewMessage(fakeIo, ws, text);
  } catch (err) {
    console.error("[WS-NATIVE] Erro chat:", err.message);
  }
}

// --- ISOLATION, RECOVERY, GLOBAL (Similares aos originais) ---

async function handleIsolationAuth(ws, data) {
  try {
    const user = ws.user || await authenticateSocket(data.token);
    ws.user = user;
    joinRoom(ws, "isolation:room");

    const ISOLATION_USERS_KEY = "online_players:isolation";
    const userData = JSON.stringify({ id: user.id, username: user.username, avatar: user.avatar_url, faction: user.faction, country: user.country });
    await redisClient.hSetAsync(ISOLATION_USERS_KEY, String(user.id), userData);

    const users = await getRedisUsers(ISOLATION_USERS_KEY);
    broadcastToRoom("isolation:room", "isolation:users", users);

    const isolationChatService = require("./services/isolationChatService");
    ws.sendEvent("isolation:auth_success");
    ws.sendEvent("isolation:history", await isolationChatService.getHistory());
  } catch (e) { ws.sendEvent("isolation:auth_failed", { message: e.message }); }
}

async function handleIsolationMessage(ws, data) {
  if (!ws.user) return;
  const now = Date.now();
  if (now - (ws.lastIso || 0) < 3000) return;
  ws.lastIso = now;

  const isolationChatService = require("./services/isolationChatService");
  const fakeIo = createFakeIo();
  await isolationChatService.handleNewMessage(fakeIo, ws, data.text);
}

// ... Outros handlers seguem o mesmo padrão ...

async function handleRecoveryAuth(ws, data) {
  try {
    const user = ws.user || await authenticateSocket(data.token);
    ws.user = user;
    joinRoom(ws, "recovery:room");
    const RECOVERY_USERS_KEY = "online_players:recovery";
    await redisClient.hSetAsync(RECOVERY_USERS_KEY, String(user.id), JSON.stringify({ id: user.id, username: user.username }));
    const users = await getRedisUsers(RECOVERY_USERS_KEY);
    broadcastToRoom("recovery:room", "recovery:users", users);
    const recoveryChatService = require("./services/recoveryChatService");
    ws.sendEvent("recovery:auth_success");
    ws.sendEvent("recovery:history", await recoveryChatService.getHistory());
  } catch (e) {}
}

async function handleRecoveryMessage(ws, data) {
  if (!ws.user) return;
  const recoveryChatService = require("./services/recoveryChatService");
  await recoveryChatService.handleNewMessage(createFakeIo(), ws, data.text);
}

async function handleGlobalAuth(ws, data) {
  try {
    const user = ws.user || await authenticateSocket(data.token);
    ws.user = user;
    joinRoom(ws, "global:room");
    const globalChatService = require("./services/globalChatService");
    await globalChatService.addUserOnline(user.id, user.username, user.avatar_url, user.faction, user.country);
    const users = await globalChatService.getOnlineUsers();
    broadcastToRoom("global:room", "global:users", users);
    ws.sendEvent("global:auth_success");
    ws.sendEvent("global:history", await globalChatService.getHistory());
  } catch (e) {}
}

async function handleGlobalMessage(ws, data) {
  if (!ws.user) return;
  const globalChatService = require("./services/globalChatService");
  await globalChatService.handleNewMessage(createFakeIo(), ws, data.text);
}

// --- HELPERS ---

async function getRedisUsers(key) {
  const raw = await redisClient.hValuesAsync(key);
  return raw.map(u => { try { return JSON.parse(u); } catch(e) { return null; } }).filter(Boolean);
}

function createFakeIo() {
  return {
    to: (room) => ({
      emit: (type, data) => broadcastToRoom(room, type, data)
    })
  };
}

async function handleCleanup(ws) {
  if (!ws.user) return;
  const userId = String(ws.user.id);
  const connections = userConnections.get(userId);
  
  if (!connections || connections.size === 0) {
    // SÓ remove do Redis se for a ÚLTIMA aba
    await redisClient.hDelAsync("online_players:isolation", userId);
    await redisClient.hDelAsync("online_players:recovery", userId);
    const globalChatService = require("./services/globalChatService");
    await globalChatService.removeUserOnline(userId);
    
    // Notificar salas sobre a saída
    const usersIso = await getRedisUsers("online_players:isolation");
    broadcastToRoom("isolation:room", "isolation:users", usersIso);
    
    const usersRec = await getRedisUsers("online_players:recovery");
    broadcastToRoom("recovery:room", "recovery:users", usersRec);
    
    const usersGlo = await globalChatService.getOnlineUsers();
    broadcastToRoom("global:room", "global:users", usersGlo);
  }
}

const getIO = () => ({
  emit: (type, data) => broadcastToRoom("all", type, data),
  to: (room) => ({
    emit: (type, data) => broadcastToRoom(room, type, data)
  })
});

module.exports = { initializeSocket, getIO };
