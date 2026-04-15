const gameStateService = require("./services/gameStateService");
const { authenticateSocket } = require("./services/authService");
const chatService = require("./services/chatService");

const MESSAGE_COOLDOWN_MS = 5000;
let io;

function initializeSocket(server) {
  io = server;
  io.on("connection", async (socket) => {
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
        const userId = user.id;

        for (const room of [...socket.rooms]) {
          if (room.startsWith("clan:") && room !== clanRoom) {
            socket.leave(room);
          }
        }

        socket.user = user;
        if (socket.lastMessageTimestamp === undefined) socket.lastMessageTimestamp = 0;
        socket.join(clanRoom);

        let history = await chatService.getChatHistory(clanId);
        if (currentAuthVersion !== socket.authVersion) return;

        socket.emit("chat:auth_success");
        socket.emit("chat:history", history || []);

        if (!socket.hasChatListener) {
          socket.hasChatListener = true;
          socket.on("chat:sendMessage", async (messageData) => {
            const now = Date.now();
            if (now - socket.lastMessageTimestamp < MESSAGE_COOLDOWN_MS) return;
            const messageText = typeof messageData.text === "string" ? messageData.text.trim() : "";
            if (messageText.length === 0) return;

            socket.lastMessageTimestamp = now;
            await chatService.handleNewMessage(io, socket, messageText);
          });
        }
      } catch (err) {
        socket.emit("chat:auth_failed", { message: err.message });
      }
    });
  });
}

module.exports = { initializeSocket };
