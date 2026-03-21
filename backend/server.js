const express = require("express");
const timeRoutes = require("./routes/time");
const adminRoutes = require("./routes/admin");
const gameRoutes = require("./routes/game");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const clanRoutes = require("./routes/clans");
const { connectDB, closePool } = require("./config/database");
const { checkAutoStart } = require("./services/gameStateService");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de segurança
app.use(helmet());

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

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
app.use("/api/time", timeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/game", gameRoutes);

// Rota de health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Middleware de tratamento de erros
app.use((err, req, res) => {
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
      console.log('🎮 Jogo iniciado automaticamente pelo monitor');
    }
  }, interval);
  
  console.log(`⏱️ Monitor de estado do jogo iniciado (verificação a cada ${interval}ms)`);
}

// Inicializar servidor
async function startServer() {
  try {
    await connectDB();
    console.log("✅ Conectado ao PostgreSQL");

    await startGameStateMonitor();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`🔗 Backend URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error);
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
