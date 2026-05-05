const path = require("path");
const fs = require("fs");

// Detecta se é produção pela porta da VM (3001)
const isProduction = process.env.NODE_ENV === "production" || process.env.PORT == "3001";

if (isProduction) {
  const prodEnvPath = path.join(__dirname, ".env.production");
  if (fs.existsSync(prodEnvPath)) {
    require("dotenv").config({ path: prodEnvPath, override: true });
  } else {
    require("dotenv").config();
  }
} else {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");

// SÊNIOR: Global Error Handlers para depuração de crash loops
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception:", err);
  // Em produção, queremos logar e talvez sair graciosamente
  if (process.env.NODE_ENV === "production") {
    // O PM2 reiniciará o processo
    setTimeout(() => process.exit(1), 1000);
  }
});

const timeRoutes = require("./routes/time");
const adminRoutes = require("./routes/admin");
const combatRoutes = require("./routes/combat");
const authRoutes = require("./routes/auth");
const { router: userRoutes } = require("./routes/users");
const { router: clanRoutes } = require("./routes/clans");
const publicRoutes = require("./routes/public");
const trainingRoutes = require("./routes/training");
const supplyRoutes = require("./routes/supply");
const logsRoutes = require("./routes/logs");
const { connectDB } = require("./config/database");
const { redisReadyPromise } = require("./config/redisClient");
const { checkAutoStart } = require("./services/gameStateService");
const { schedulePersistence } = require("./services/playerStateService");
const { initializeSocket } = require("./socketHandler");
const rankingCacheService = require("./services/rankingCacheService");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://www.urbanclashteam.com",
  "https://urbanclashteam.com", // SÊNIOR: Adicionado para evitar falha se o usuário omitir o WWW
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:3002"
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clans", clanRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/supply", supplyRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/combat", combatRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/daily-cards", require("./routes/dailyCards"));
app.use("/api/recovery", require("./routes/recovery"));
app.use("/api/isolation", require("./routes/isolation"));

app.get("/health", (req, res) => {
  res.json({ status: "OK", env: isProduction ? "production" : "development", port: PORT });
});

async function startServer() {
  try {
    await connectDB();
    await redisReadyPromise;
    
    // SÊNIOR: Limpa a lista de jogadores online no Redis durante o boot.
    // Isso evita que jogadores que estavam conectados fiquem 'presos' no set
    // caso o servidor tenha caído sem fechar as conexões SSE.
    const redisClient = require("./config/redisClient");
    if (redisClient.client.isReady) {
      await redisClient.delAsync("online_players_set");
      await redisClient.delAsync("online_players:recovery");
      await redisClient.delAsync("online_players:isolation");
      console.log("🧹 Set de jogadores online, lista de recuperação e isolamento resetados no Redis.");
    }
    const io = new Server(server, { cors: { origin: allowedOrigins } });
    initializeSocket(io);
    schedulePersistence();
    server.listen(PORT, () => {
      console.log(`🚀 SERVIDOR INICIADO NA PORTA ${PORT} [${isProduction ? 'PROD' : 'DEV'}]`);
      
      // SÊNIOR: Tarefas de background movidas para um contexto que não bloqueia o listen
      // e com delay para permitir que o processo estabilize (passar health checks do Oracle/Cloud)
      setTimeout(async () => {
        try {
          console.log("🌌 Iniciando subsistemas de background...");
          await checkAutoStart();
          await rankingCacheService.initializeRankingZSet();
          await rankingCacheService.warmupRankings();
          rankingCacheService.startPeriodicRefresh();
          require("./services/energyRegenService").startEnergyRegenHeartbeat();
          console.log("✅ Todos os subsistemas operacionais.");
        } catch (bgError) {
          console.error("⚠️ Erro nos processos de background:", bgError);
        }
      }, 5000); 
    });
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  }
}
startServer();