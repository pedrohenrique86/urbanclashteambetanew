const express = require("express");
const timeRoutes = require("./routes/time");
const adminRoutes = require("./routes/admin"); // Importa as rotas de admin
const gameRoutes = require("./routes/game"); // Importa as rotas do jogo
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
const { connectDB, closePool, query } = require("./config/database");

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
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por IP por janela
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

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clans", clanRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/admin", adminRoutes); // Registra as rotas de admin
app.use("/api/game", gameRoutes); // Registra as rotas do jogo

// Rota de health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Middleware de tratamento de erros
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
app.use("*", (req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

async function checkGameStart() {
  try {
    const configResult = await query("SELECT key, value FROM game_config");
    const settings = configResult.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    const gameStartTime = settings.game_start_time;
    const isCountdownActive = settings.is_countdown_active === "true";

    // Se a contagem já está ativa ou não há agendamento, não faz nada
    if (isCountdownActive || !gameStartTime) {
      return;
    }

    const now = new Date();
    const startTime = new Date(gameStartTime);

    // Se a hora atual for maior ou igual à hora de início, ativa a contagem
    if (now >= startTime) {
      console.log(
        "⏰ Hora de início do jogo alcançada! Ativando contagem regressiva...",
      );
      await query(
        `INSERT INTO game_config (id, key, value)
         VALUES (2, 'is_countdown_active', 'true')
         ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()`,
      );
    }
  } catch (error) {
    console.error("❌ Erro ao verificar o início do jogo:", error);
  }
}

// Inicializar servidor
async function startServer() {
  try {
    // Conectar ao banco de dados
    await connectDB();
    console.log("✅ Conectado ao PostgreSQL");

    // Iniciar o verificador de início de jogo
    setInterval(checkGameStart, 60000); // Executa a cada 60 segundos

    // Iniciar servidor
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
