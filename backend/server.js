// 1. Carrega o .env padrão para detectar o ambiente inicial
const path = require("path");
require("dotenv").config();

// 2. Se for produção (via NODE_ENV), carrega o .env.production com OVERRIDE
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ 
    path: path.join(__dirname, ".env.production"),
    override: true 
  });
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

// Rotas e Configurações
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

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://www.urbanclashteam.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Cache-Control", "Pragma", "If-None-Match"],
  exposedHeaders: ["ETag"],
  maxAge: 86400,
};

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(cors(corsOptions));
app.set("trust proxy", 1);

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.cloudflareinsights.com"],
      connectSrc: ["'self'", "https://api.urbanclashteam.com", "wss://api.urbanclashteam.com", "https://*.urbanclashteam.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  },
}));

const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 20000,
  pingInterval: 25000,
  transports: ["websocket"],
});

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "Muitas tentativas, tente novamente em 1 minuto" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Algo deu errado!",
    message: process.env.NODE_ENV === "development" ? err.message : "Erro interno do servidor",
  });
});

app.use("*", (req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

async function startGameStateMonitor() {
  await checkAutoStart();
  const interval = 30000;
  setInterval(async () => {
    const started = await checkAutoStart();
    if (started) console.log("🎮 Jogo iniciado automaticamente pelo monitor");
  }, interval);
  console.log(`⏱️ Monitor de estado do jogo iniciado (verificação a cada ${interval}ms)`);
}

async function recoverPendingTrainings() {
  try {
    const { query } = require("./config/database");
    const result = await query(
      `SELECT user_id, training_ends_at FROM user_profiles 
       WHERE training_ends_at IS NOT NULL AND active_training_type IS NOT NULL AND active_training_type <> ''`,
    );
    if (result.rows.length === 0) return;
    for (const row of result.rows) {
      const endsAtMs = new Date(row.training_ends_at).getTime();
      if (!isNaN(endsAtMs)) await scheduleTraining(row.user_id, endsAtMs);
    }
  } catch (err) {
    console.error("[startup] ❌ Erro ao recuperar treinos:", err.message);
  }
}

async function startServer() {
  try {
    await connectDB();
    await redisReadyPromise;
    
    initializeSocket(io);
    schedulePersistence();

    server.listen(PORT, () => {
      // --- LÓGICA DE IDENTIFICAÇÃO DE AMBIENTE NOS LOGS ---
      const isProdPort = PORT == 4000;
      const ambientLabel = isProdPort ? "🔥 PRODUÇÃO (TÚNEL)" : "🛠️ DESENVOLVIMENTO (LOCAL)";
      const dbUrl = process.env.DATABASE_URL || "";
      const dbType = dbUrl.includes('delicate-cell') ? "NEON DEV" : "NEON PROD";

      console.log(`\n=========================================`);
      console.log(`🚀 SERVIDOR URBAN CLASH INICIADO`);
      console.log(`🌍 AMBIENTE: ${ambientLabel}`);
      console.log(`🔌 PORTA: ${PORT}`);
      console.log(`📂 BANCO: ${dbType}`);
      console.log(`📱 FRONTEND URL: ${process.env.FRONTEND_URL}`);
      console.log(`=========================================\n`);

      (async () => {
        try {
          await startGameStateMonitor();
          await rankingCacheService.initializeRankingZSet();
          await rankingCacheService.warmupRankings();
          rankingCacheService.startPeriodicRefresh();
          await recoverPendingTrainings();
          const energyRegenService = require("./services/energyRegenService");
          energyRegenService.startEnergyRegenHeartbeat();
          console.log("✅ Background Tasks: OK");
        } catch (bgError) {
          console.error("❌ Background Tasks: FALHA", bgError);
        }
      })();
    });
  } catch (error) {
    console.error("❌ Erro fatal ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`🛑 Recebido ${signal}, encerrando...`);
  await closePool();
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Tratamento de erros globais (Redis e outros)
const KNOWN_REDIS_ERRORS = ["SocketClosedUnexpectedlyError", "ECONNREFUSED", "Connection timeout", "NOAUTH"];

process.on("uncaughtException", (err) => {
  const isRedisError = KNOWN_REDIS_ERRORS.some(msg => err.message?.includes(msg) || err.name?.includes(msg));
  if (isRedisError) {
    console.warn("⚠️ [Redis] Erro absorvido:", err.message);
    return;
  }
  console.error("❌ CRASH FATAL:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const msg = reason?.message || String(reason);
  if (KNOWN_REDIS_ERRORS.some(e => msg.includes(e))) {
    console.warn("⚠️ [Redis] Rejeição absorvida:", msg);
    return;
  }
  console.error("❌ CRASH: Unhandled Rejection:", reason);
});