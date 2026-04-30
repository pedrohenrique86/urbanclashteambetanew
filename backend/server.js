// 1. Configuração Robusta de Variáveis de Ambiente
const path = require("path");
const fs = require("fs");

// Detecta se é produção pela porta ou pela variável de ambiente
const isProduction = process.env.NODE_ENV === "production" || process.env.PORT == "4000";

if (isProduction) {
  const prodEnvPath = path.join(__dirname, ".env.production");
  if (fs.existsSync(prodEnvPath)) {
    // Carrega o .env.production e força a substituição (override)
    require("dotenv").config({ path: prodEnvPath, override: true });
  }
} else {
  // Carrega o .env padrão para desenvolvimento
  require("dotenv").config();
}

// LOG DE DEPURAÇÃO (Importante para você ver no terminal se o banco mudou)
console.log(`[DEBUG] Iniciando processo na porta: ${process.env.PORT}`);
console.log(`[DEBUG] REDIS_URL carregada: ${process.env.REDIS_URL}`);

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

// ... Restante dos seus imports (mantenha como estão) ...
const timeRoutes = require("./routes/time");
const adminRoutes = require("./routes/admin");
const combatRoutes = require("./routes/combat");
const authRoutes = require("./routes/auth");
const { router: userRoutes } = require("./routes/users");
const { router: clanRoutes } = require("./routes/clans");
const publicRoutes = require("./routes/public");
const trainingRoutes = require("./routes/training");
const supplyRoutes = require("./routes/supply");
const { connectDB, closePool } = require("./config/database");
const { redisReadyPromise } = require("./config/redisClient");
const { checkAutoStart } = require("./services/gameStateService");
const { schedulePersistence, scheduleTraining } = require("./services/playerStateService");
const { initializeSocket } = require("./socketHandler");
const rankingCacheService = require("./services/rankingCacheService");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://www.urbanclashteam.com",
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.set("trust proxy", 1);

// ... Middlewares (Helmet, JSON, Morgan - mantenha como estão) ...
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Desativado temporariamente para facilitar o debug do socket
}));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev")); // Morgan 'dev' é mais limpo para ver erros

// Rotas
app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clans", clanRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/supply", supplyRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/combat", combatRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    env: isProduction ? "production" : "development",
    redis: process.env.REDIS_URL?.split('/').pop() // Mostra se é o db0 ou db1
  });
});

// Funções de Inicialização (mantenha como estão)
async function startGameStateMonitor() {
  await checkAutoStart();
  setInterval(async () => { await checkAutoStart(); }, 30000);
}

async function startServer() {
  try {
    await connectDB();
    await redisReadyPromise;
    
    const io = new Server(server, { cors: corsOptions, transports: ["websocket"] });
    initializeSocket(io);
    schedulePersistence();

    server.listen(PORT, () => {
      const ambientLabel = isProduction ? "🔥 PRODUÇÃO (TÚNEL)" : "🛠️ DESENVOLVIMENTO (LOCAL)";
      const redisDB = process.env.REDIS_URL?.endsWith('/1') ? "DB 1 (ISOLADO)" : "DB 0 (PADRÃO)";

      console.log(`\n=========================================`);
      console.log(`🚀 SERVIDOR URBAN CLASH INICIADO`);
      console.log(`🌍 AMBIENTE: ${ambientLabel}`);
      console.log(`🔌 PORTA: ${PORT}`);
      console.log(`🗄️  REDIS: ${redisDB}`);
      console.log(`=========================================\n`);

      (async () => {
        await startGameStateMonitor();
        await rankingCacheService.initializeRankingZSet();
        await rankingCacheService.warmupRankings();
        rankingCacheService.startPeriodicRefresh();
        const energyRegenService = require("./services/energyRegenService");
        energyRegenService.startEnergyRegenHeartbeat();
      })();
    });
  } catch (error) {
    console.error("❌ Erro fatal ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();