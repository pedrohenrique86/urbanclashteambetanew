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

// Erros de stream (mobile trocando WiFi↔4G, conexão caindo).
// NÃO devem derrubar o servidor — são inofensivos.
const NON_FATAL_ERRORS = new Set([
  "EPIPE", "ECONNRESET", "ECONNABORTED", "ECANCELED",
  "ERR_STREAM_WRITE_AFTER_END", "ERR_STREAM_DESTROYED",
]);

process.on("unhandledRejection", (reason) => {
  const code = reason?.code || "";
  if (NON_FATAL_ERRORS.has(code)) return;
  console.error("🚨 Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  const code = err.code || "";
  if (NON_FATAL_ERRORS.has(code)) {
    console.warn("⚠️ Stream error ignorado:", code);
    return;
  }
  console.error("🚨 Uncaught Exception (FATAL):", err);
  if (process.env.NODE_ENV === "production") {
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
const redisClient = require("./config/redisClient");
const { redisReadyPromise } = redisClient;
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
  "https://urbanclashteam.com",
  "https://www.urbanclashteam.com/",
  "https://urbanclashteam.com/",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:3002"
].filter(Boolean);

// CORS dinâmico e robusto
const corsOptions = {
  origin: (origin, callback) => {
    // Permite requests sem origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                     /^https?:\/\/(.*\.)?urbanclashteam\.com\/?$/.test(origin) ||
                     /^http:\/\/localhost(:\d+)?$/.test(origin) ||
                     (!isProduction && (
                       /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) || 
                       /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)
                     ));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`🛑 CORS bloqueado para origin: ${origin} (Modo: ${isProduction ? 'PROD' : 'DEV'})`);
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.set("trust proxy", true); // Essencial para Cloudflare/Nginx identificar IP real do mobile
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));

// Log de debug para ver o que chega do mobile
app.use((req, res, next) => {
  if (req.path.includes('/api/auth') || req.path.includes('/subscribe')) {
    console.log(`[DEBUG] ${req.method} ${req.path} - Origin: ${req.get('origin')} - UA: ${req.get('user-agent')}`);
  }
  next();
});

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

app.get("/api/public/health", (req, res) => {
  const redisReady = redisClient.client.isReady;
  res.json({ 
    status: "OK", 
    redis: redisReady ? "CONNECTED" : "DISCONNECTED",
    env: isProduction ? "production" : "development", 
    port: PORT 
  });
});

async function startServer() {
  try {
    await connectDB();
    await redisReadyPromise;
    
    // SÊNIOR: Limpa a lista de jogadores online no Redis durante o boot.
    // Isso evita que jogadores que estavam conectados fiquem 'presos' no set
    // caso o servidor tenha caído sem fechar as conexões SSE.
    if (redisClient.client.isReady) {
      await redisClient.delAsync("online_players_set");
      await redisClient.delAsync("online_players:recovery");
      await redisClient.delAsync("online_players:isolation");
      await redisClient.delAsync("chat:global:online");
      console.log("🧹 Set de jogadores online, listas de recuperação, isolamento e global resetados no Redis.");
    }
    // SÊNIOR: Handler para Rotas não encontradas (evita que a requisição fique pendurada)
    app.use((req, res) => {
      res.status(404).json({ error: "Rota não encontrada ou indisponível no momento." });
    });

    // SÊNIOR: Middleware de Erro Global — Captura qualquer falha e impede o crash
    app.use((err, req, res, next) => {
      console.error(`🚨 [Global Error] ${req.method} ${req.url}:`, err.message);
      
      if (res.headersSent) {
        return next(err);
      }
      
      res.status(err.status || 500).json({
        error: "Erro temporário na central de dados. Tente atualizar a página.",
        code: err.code || "INTERNAL_ERROR"
      });
    });

    const io = new Server(server, { 
      cors: corsOptions,
      pingTimeout: 5000, // Detecta queda em 5s (antes era 10s)
      pingInterval: 2000, // Pergunta se tá vivo a cada 2s (antes era 5s)
      connectTimeout: 10000,
      transports: ["polling", "websocket"] // Garante suporte a ambos
    });
    initializeSocket(io);
    schedulePersistence();
const serverInstance = server.listen(PORT, () => {
      console.log(`🚀 SERVIDOR INICIADO NA PORTA ${PORT} [${isProduction ? 'PROD' : 'DEV'}]`);
      
      // SÊNIOR: Tarefas de background com delay para estabilização
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

    // SÊNIOR: Configurações de Resiliência para Cloudflare/Mobile
    // Evita erro 502 Bad Gateway aumentando os limites de espera por pacotes lentos (4G)
    serverInstance.keepAliveTimeout = 65000; // 65s (deve ser maior que o timeout do Cloudflare)
    serverInstance.headersTimeout = 66000;
    serverInstance.requestTimeout = 30000; // 30s max por request
    
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  }
}
startServer();