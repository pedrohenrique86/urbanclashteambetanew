let io;

function initializeSocket(server) {
  io = server;

  io.on("connection", async (socket) => {
    console.log(`🔌 Novo cliente conectado: ${socket.id}`);

    try {
      // Importa o serviço AQUI, dentro da função, para quebrar o ciclo de dependência.
      const { getGameState } = require("./services/gameStateService");

      // 1. Envia o estado atual do jogo para o cliente que acabou de conectar
      const gameState = await getGameState();
      socket.emit("gameState", gameState);

      // 2. Envia a hora atual do servidor para cálculo de offset
      socket.emit("serverTime", { serverTime: Date.now() });
    } catch (error) {
      console.error(
        "❌ Erro ao enviar estado inicial para o cliente via socket:",
        error,
      );
      socket.emit("error", {
        message: "Não foi possível obter o estado do jogo.",
      });
    }

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
