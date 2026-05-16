const path = require("path");
const fs = require("fs");

// Detecta se é produção pela porta da VM (3001)
const isProduction = 
  process.env.NODE_ENV === "production" || 
  process.env.PORT === "3001" || 
  process.platform === "linux"; // Força produção em ambiente Linux/Nuvem

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
// Substituído Socket.io por WebSockets Nativos (High Performance)
const { initializeSocket } = require("./socketHandlerNative");

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
const marketRoutes = require("./routes/market");
const combatRoutes = require("./routes/combat");
const authRoutes = require("./routes/auth");
const { router: userRoutes } = require("./routes/users");
const { router: clanRoutes } = require("./routes/clans");
const publicRoutes = require("./routes/public");
const trainingRoutes = require("./routes/training");
const supplyRoutes = require("./routes/supply");
const logsRoutes = require("./routes/logs");
const contractsRoutes = require("./routes/contracts");
const inventoryRoutes = require("./routes/inventory");
const { connectDB } = require("./config/database");
const redisClient = require("./config/redisClient");
const { redisReadyPromise } = redisClient;
const { checkAutoStart } = require("./services/gameStateService");
const { schedulePersistence } = require("./services/playerStateService");
// Já importado no topo
const rankingCacheService = require("./services/rankingCacheService");

const compression = require("compression");
const rateLimit = require("express-rate-limit");

const app = express();


app.set("trust proxy", 1);
app.use((req, res, next) => {
  req.realIP = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
  next();
});

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

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin.includes("urbanclashteam.com") || origin.includes("localhost") || origin.includes("127.0.0.1")) {
      callback(null, true);
    } else {
      console.warn(`🛑 CORS bloqueado para: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "10mb" }));

// SÊNIOR: Cache-Control agressivo para imagens (Melhor Prática AAA)
app.use((req, res, next) => {
  if (req.url.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/)) {
    res.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  next();
});

// SÊNIOR: Logging de Requisições em Desenvolvimento
if (!isProduction) {
  app.use(morgan("dev"));
}

// --- CONFIGURAÇÃO DE RATE LIMITING (ANTI-SPAM/ANTI-BOT) ---

// 1. Limiter Geral
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, 
  message: { error: "Muitas requisições. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.realIP || req.ip,
});

// 2. Limiter de Ações de Jogo
const gameActionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100, // Aumentado para 100 para evitar falsos positivos no status
  message: { error: "Calma! Você está agindo rápido demais. Respire um pouco." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.realIP || req.ip,
});

// 3. Limiter de Autenticação
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20, 
  message: { error: "Muitas tentativas de login. Tente novamente em uma hora." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.realIP || req.ip,
});

app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/contracts", gameActionLimiter);
app.use("/api/combat", gameActionLimiter);
app.use("/api/training", gameActionLimiter);

const server = http.createServer(app);

// SÊNIOR: Aumenta timeouts para aguentar latência de 4G instável
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.timeout = 30000; // 30 segundos para dar tempo do 4G responder

const PORT = process.env.PORT || 3001;


// Log de debug para ver o que chega do mobile (4G Diagnostic)
app.use((req, res, next) => {
  const oldJson = res.json;
    res.json = function(data) {
      if (res.statusCode >= 400 && (req.path.includes('/auth') || req.path.includes('/profile'))) {
        const authHeader = req.headers.authorization || '';
        const maskedHeader = authHeader ? `${authHeader.substring(0, 15)}...` : 'AUSENTE';
        
        console.log(`[4G-DIAGNOSTIC] ❌ Falha em ${req.method} ${req.path}`);
        console.log(` > Status: ${res.statusCode}`);
        console.log(` > IP: ${req.ip}`);
        console.log(` > Auth Header: ${maskedHeader}`);
        console.log(` > Token Query: ${req.query.token ? 'Presente' : 'AUSENTE'}`);
        console.log(` > UA: ${req.get('user-agent')}`);
        if (data && data.error) console.log(` > Error: ${data.error} (${data.code || 'no-code'})`);
      }
      return oldJson.apply(res, arguments);
    };
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
app.use("/api/contracts", contractsRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/inventory", inventoryRoutes);
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
    
    // SÊNIOR: Subsistemas de background com delay para estabilização
    // (A limpeza de cache do Redis agora é manual via comando gai)
    // SÊNIOR: Handler para Rotas não encontradas (evita que a requisição fique pendurada)
    app.use((req, res) => {
      if (isProduction) {
        console.warn(`⚠️ [404] Rota não encontrada: ${req.method} ${req.url} - IP: ${req.ip}`);
      }
      res.status(404).json({ 
        error: "Rota não encontrada ou indisponível no momento.",
        path: req.url,
        method: req.method
      });
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

    // SÊNIOR: Inicializa o WebSocket Nativo (Alta Performance)
    initializeSocket(server);
    schedulePersistence();
    const serverInstance = server.listen(PORT, "0.0.0.0", () => {
      const modeEmoji = isProduction ? "🛡️ [PRODUÇÃO]" : "🛠️ [DESENVOLVIMENTO]";
      console.log(`${modeEmoji} SERVIDOR INICIADO NA PORTA ${PORT}`);

      if (!isProduction) {
        const os = require("os");
        const nets = os.networkInterfaces();
        const ips = [];
        for (const name of Object.keys(nets)) {
          for (const net of nets[name]) {
            if (net.family === "IPv4" && !net.internal) ips.push(net.address);
          }
        }

        console.log("------------------------------------------------------------------");
        console.log(`🚀 Diagnóstico de Inicialização:`);
        console.log(`   - Node: ${process.version} | OS: ${process.platform} (${os.release()})`);
        console.log(`   - RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   - Rede Local: http://localhost:${PORT}`);
        ips.forEach(ip => console.log(`   - Rede Externa: http://${ip}:${PORT}`));
        
        // Verificação de .env Críticos
        const criticalEnv = ["JWT_SECRET", "REDIS_URL"];
        const missing = criticalEnv.filter(k => !process.env[k]);
        if (missing.length > 0) {
          console.warn(`⚠️  VARIÁVEIS CRÍTICAS AUSENTES NO .ENV: ${missing.join(", ")}`);
        } else {
          console.log(`   - Configurações .env: ✅ OK`);
        }
        console.log("------------------------------------------------------------------");
      }
      
      // SÊNIOR: Tarefas de background com delay para estabilização
      setTimeout(async () => {
        try {
          console.log("🌌 Iniciando subsistemas de background...");
          const { seedInitialGameState } = require("./services/gameStateService");
          const catalogService = require("./services/catalogService");
          
          await catalogService.warmup(); // SÊNIOR: Cache de itens permanente
          await seedInitialGameState();
          await checkAutoStart();
          await rankingCacheService.initializeRankingZSet();
          rankingCacheService.startPeriodicRefresh();
          require("./services/energyRegenService").startEnergyRegenHeartbeat();
          require("./services/cronService").start();
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