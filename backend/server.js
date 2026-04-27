// 1. Carrega o .env padrão para detectar o ambiente inicial
const path = require("path");
require("dotenv").config();

// 2. Se for produção, carrega o .env.production com OVERRIDE para garantir prioridade
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ 
    path: path.join(__dirname, ".env.production"),
    override: true 
  });
}

const express = require("express");
const cors = require("cors");

const timeRoutes = require("./routes/time");
const adminRoutes = require("./routes/admin");
// const gameRoutes = require("./routes/game"); // Replaced by Socket.IO
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const { router: userRoutes } = require("./routes/users");
const { router: clanRoutes } = require("./routes/clans");
const publicRoutes = require("./routes/public");
const trainingRoutes = require("./routes/training");
const { connectDB, closePool, seedClans } = require("./config/database");
const { redisReadyPromise } = require("./config/redisClient");
const { checkAutoStart } = require("./services/gameStateService");
const { schedulePersistence, scheduleTraining } = require("./services/playerStateService");
const { initializeSocket } = require("./socketHandler");
const rankingCacheService = require("./services/rankingCacheService");
const http = require("http");
const { Server } = require("socket.io");

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL, // URL de produção (deve ser https://www.urbanclashteam.com)
  "https://www.urbanclashteam.com", // Adicionado explicitamente para garantir
  "http://localhost:3000", // Desenvolvimento local (Vite configurado na porta 3000)
  "http://localhost:5173", // Fallback Vite
  "http://127.0.0.1:5173",
].filter(Boolean); // Filtra valores nulos ou indefinidos

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With", 
    "Accept", 
    "Origin", 
    "Cache-Control", 
    "Pragma",
    "If-None-Match"
  ],
  exposedHeaders: ["ETag"],
  maxAge: 86400,
};

const app = express();

// --- SERVIR ARQUIVOS ESTÁTICOS (IMAGENS PARA E-MAILS, ETC) ---
// Disponibiliza o conteúdo da pasta 'public' na raiz do servidor.
// Ex: /images/banner.png acessará o arquivo em public/images/banner.png
app.use(express.static(path.join(__dirname, "public")));

// CORS gerenciado pelo Express para máxima confiabilidade
app.use(cors(corsOptions));

app.set("trust proxy", 1); // Confia no proxy da Render para o rate limiting funcionar
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware de segurança (configurado para não conflitar com CORS)
// Middleware de segurança otimizado para o jogo
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "Muitas tentativas, tente novamente em 1 minuto" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging
app.use(morgan("combined"));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rotas - agora usam gameStateService com Redis
app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clans", clanRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/admin", adminRoutes);
// app.use("/api/game", gameRoutes); // Replaced by Socket.IO

// Rota de health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Middleware de tratamento de erros
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Algo deu errado!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Erro interno do servidor",
  });
});

// Middleware para rotas não encontradas
// Deve ser o último middleware, exceto o de tratamento de erros.
app.use("*", (req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Função para iniciar verificação periódica do estado do jogo
async function startGameStateMonitor() {
  await checkAutoStart();

  const interval = 30000; // 30 segundos
  setInterval(async () => {
    const started = await checkAutoStart();
    if (started) {
      console.log("🎮 Jogo iniciado automaticamente pelo monitor");
    }
  }, interval);

  console.log(
    `⏱️ Monitor de estado do jogo iniciado (verificação a cada ${interval}ms)`,
  );
}

// Inicializar servidor

/**
 * Recuperação de treinos pendentes após restart do servidor.
 * Consulta o banco por treinos com training_ends_at preenchido (em andamento ou já vencidos)
 * e re-insere no ZSET para que o worker os processe imediatamente.
 */
async function recoverPendingTrainings() {
  try {
    const { query } = require("./config/database");
    const result = await query(
      `SELECT user_id, training_ends_at
       FROM user_profiles
       WHERE training_ends_at IS NOT NULL
         AND active_training_type IS NOT NULL
         AND active_training_type <> ''`,
    );

    if (result.rows.length === 0) {
      console.log("[startup] ✅ Sem treinos pendentes para recuperar.");
      return;
    }

    console.log(`[startup] 🔄 Recuperando ${result.rows.length} treinos pendentes no ZSET...`);
    for (const row of result.rows) {
      const endsAtMs = new Date(row.training_ends_at).getTime();
      if (!isNaN(endsAtMs)) {
        await scheduleTraining(row.user_id, endsAtMs);
      }
    }
    console.log("[startup] ✅ Treinos pendentes re-agendados no ZSET.");
  } catch (err) {
    console.error("[startup] ❌ Erro ao recuperar treinos pendentes:", err.message);
  }
}
async function startServer() {
  try {
    await connectDB();
    await redisReadyPromise;
    console.log("✅ Conectado ao PostgreSQL e Redis");

    // Popula a tabela de clãs, se necessário.
    // await seedClans(); // Desativado para evitar a limpeza dos dados dos clãs a cada reinício.

    initializeSocket(io);

    // schedulePersistence() inicia o safety-net de persistência a cada 2 minutos
    schedulePersistence();


    server.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);

      // Executa tarefas de background de forma assíncrona para não travar o boot
      (async () => {
        try {
          await startGameStateMonitor();
          console.log("⏱️ Iniciando warmup de ranking...");
          await rankingCacheService.initializeRankingZSet();
          await rankingCacheService.warmupRankings();
          rankingCacheService.startPeriodicRefresh();

          // Recupera treinos pendentes que estavam em andamento antes do restart
          await recoverPendingTrainings();
          
          // Inicia Heartbeat de Energia (Regeneração automática)
          const energyRegenService = require("./services/energyRegenService");
          energyRegenService.startEnergyRegenHeartbeat();

          console.log("✅ Warmup de background concluído.");
        } catch (bgError) {
          console.error("❌ Erro em tarefas de background:", bgError);
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
process.on("SIGTERM", async () => {
  console.log("🛑 Recebido SIGTERM, encerrando servidor...");
  await closePool();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 Recebido SIGINT, encerrando servidor...");
  await closePool();
  process.exit(0);
});

// Tratamento de erros globais para evitar crashes silenciosos em produção
// ✅ FIX: absorve erros conhecidos do Redis (SocketClosedUnexpectedlyError, ECONNREFUSED)
// que antes derrubavam o processo e causavam o falso erro CORS no frontend.
const KNOWN_REDIS_ERRORS = [
  "SocketClosedUnexpectedlyError",
  "ECONNREFUSED",
  "Connection timeout",
  "NOAUTH",
];

process.on("uncaughtException", (err) => {
  const isRedisError = KNOWN_REDIS_ERRORS.some(
    (msg) => err.message?.includes(msg) || err.name?.includes(msg)
  );

  if (isRedisError) {
    // Não derruba o processo — Redis vai reconectar automaticamente
    console.warn("⚠️ [Redis] Erro de conexão absorvido (não fatal):", err.message);
    return;
  }

  // Erro genuinamente inesperado → deixa o PM2 reiniciar limpo
  console.error("❌ CRASH FATAL: Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  const msg = reason?.message || String(reason);
  const isRedisError = KNOWN_REDIS_ERRORS.some((e) => msg.includes(e));

  if (isRedisError) {
    console.warn("⚠️ [Redis] Rejeição absorvida (não fatal):", msg);
    return;
  }

  console.error("❌ CRASH: Unhandled Rejection at:", promise, "reason:", reason);
});
