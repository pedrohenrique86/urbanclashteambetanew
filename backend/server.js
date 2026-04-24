// Carrega as variáveis de ambiente do arquivo .env ANTES de qualquer outro código.
// Esta deve ser a primeira linha para garantir que todas as configurações estejam disponíveis.
require("dotenv").config();

const express = require("express");

const timeRoutes = require("./routes/time");
const adminRoutes = require("./routes/admin");
// const gameRoutes = require("./routes/game"); // Replaced by Socket.IO
// const cors = require("cors"); // Removido para implementação manual de diagnóstico
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const { router: userRoutes } = require("./routes/users");
const { router: clanRoutes } = require("./routes/clans");
const trainingRoutes = require("./routes/training");
const { connectDB, closePool, seedClans } = require("./config/database");
const { redisReadyPromise } = require("./config/redisClient");
const { checkAutoStart } = require("./services/gameStateService");
const { schedulePersistence } = require("./services/playerStateService");
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

// Aplica o CORS manualmente para diagnóstico robusto
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Sênior: Sempre adiciona Vary: Origin quando lidamos com múltiplas origens permitidas
  res.setHeader("Vary", "Origin");

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin && process.env.NODE_ENV === "development") {
    // Permite requisições sem origin (ex: Postman) apenas em dev
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, If-None-Match, Cache-Control, Pragma, X-Requested-With, Accept, Origin",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Intercepta e responde às requisições preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.set("trust proxy", 1); // Confia no proxy da Render para o rate limiting funcionar
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware de segurança (configurado para não conflitar com CORS)
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

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
process.on("uncaughtException", (err) => {
  console.error("❌ CRASH: Uncaught Exception:", err);
  // Em produção, talvez queiramos um restart controlado
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ CRASH: Unhandled Rejection at:", promise, "reason:", reason);
});
