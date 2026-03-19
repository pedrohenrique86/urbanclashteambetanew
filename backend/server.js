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
const { connectDB, closePool, query } = require("./config/database");

// Cache em memória para as configurações do jogo
let gameSettingsCache = {};

// Função para buscar e atualizar o cache de configurações do jogo
async function updateGameSettingsCache() {
  try {
    const result = await query("SELECT key, value FROM game_config");
    const newSettings = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    // Converte o valor de 'is_countdown_active' para booleano
    if (newSettings.is_countdown_active !== undefined) {
      newSettings.is_countdown_active =
        newSettings.is_countdown_active === "true";
    }

    // Limpa o cache antigo e copia as novas propriedades para manter a referência do objeto
    Object.keys(gameSettingsCache).forEach(
      (key) => delete gameSettingsCache[key],
    );
    Object.assign(gameSettingsCache, newSettings);

    // console.log('Cache de configurações do jogo atualizado:', gameSettingsCache); // Log para depuração
  } catch (error) {
    console.error(
      "❌ Erro ao atualizar o cache de configurações do jogo:",
      error,
    );
  }
}

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

// Injeta o cache e a função de atualização nas rotas
const adminRouter = adminRoutes({ updateGameSettingsCache });
const gameRouter = gameRoutes({ gameSettingsCache });

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clans", clanRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/admin", adminRouter);
app.use("/api/game", gameRouter);

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

async function checkGameStart() {
  try {
    const gameStartTime = gameSettingsCache.game_start_time;
    const isCountdownActive = gameSettingsCache.is_countdown_active;

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
      // Atualiza o cache imediatamente após a mudança no banco
      await updateGameSettingsCache();
    }
  } catch (error) {
    console.error("❌ Erro ao verificar o início do jogo:", error);
  }
}

// Função para iniciar o polling das configurações do jogo
async function pollGameSettings() {
  await updateGameSettingsCache(); // Carga inicial
  setInterval(updateGameSettingsCache, 5000); // Atualiza a cada 5 segundos
  setInterval(checkGameStart, 5000); // Verifica o início do jogo a cada 5 segundos
}

// Inicializar servidor
async function startServer() {
  try {
    // Conectar ao banco de dados
    await connectDB();
    console.log("✅ Conectado ao PostgreSQL");

    // Iniciar o polling das configurações do jogo
    await pollGameSettings();

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
