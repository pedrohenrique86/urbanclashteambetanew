const express = require("express");

const timeRoutes = require("./routes/time");
const adminRoutes = require("./routes/admin");
// const gameRoutes = require("./routes/game"); // Replaced by Socket.IO
// const cors = require("cors"); // Removido para implementação manual de diagnóstico
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
const { initializeSocket } = require("./socketHandler");
const http = require("http");
const { Server } = require("socket.io");

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL, // URL de produção (deve ser https://www.urbanclashteam.com)
  "https://www.urbanclashteam.com", // Adicionado explicitamente para garantir
  "http://localhost:5173", // Desenvolvimento local
  "http://127.0.0.1:5173",
].filter(Boolean); // Filtra valores nulos ou indefinidos

const corsOptions = {
  origin: allowedOrigins, // Usa a lista de origens permitidas diretamente.
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();

// Aplica o CORS manualmente para diagnóstico
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

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

// O Socket.IO pode reutilizar a mesma configuração de CORS simplificada.
const io = new Server(server, {
  cors: corsOptions,
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
app.use("/api/time", timeRoutes);
app.use("/api/admin", adminRoutes);
// app.use("/api/game", gameRoutes); // Replaced by Socket.IO

// Rota de health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// --- SERVIR ARQUIVOS ESTÁTICOS DO FRONTEND EM PRODUÇÃO ---
if (process.env.NODE_ENV === "production") {
  // Define o caminho para a pasta de build do frontend
  const frontendBuildPath = path.resolve(__dirname, "../frontend/dist");

  // Serve os arquivos estáticos (JS, CSS, imagens, etc.)
  app.use(express.static(frontendBuildPath));

  // Para qualquer outra rota que não seja de API, serve o index.html do frontend
  // Isso permite que o React Router lide com o roteamento no lado do cliente
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

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
    console.log("✅ Conectado ao PostgreSQL");

    await startGameStateMonitor();

    initializeSocket(io);

    server.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
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
