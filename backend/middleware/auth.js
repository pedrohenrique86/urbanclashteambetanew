const jwt = require("jsonwebtoken");
const { query } = require("../config/database");
const { authenticateSocket } = require("../services/authService");

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = (authHeader && authHeader.split(" ")[1]) || req.query.token;

    if (!token) {
      return res.status(401).json({ error: "Token de acesso requerido" });
    }

    // SÊNIOR: Delegamos a autenticação para o serviço central que possui cache no Redis
    const user = await authenticateSocket(token);

    if (!user.is_email_confirmed) {
      return res.status(403).json({
        error: "Email não confirmado",
        message: "Por favor, confirme seu email antes de continuar",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") return res.status(401).json({ error: "Token inválido" });
    if (error.name === "TokenExpiredError") return res.status(401).json({ error: "Token expirado" });

    console.error("❌ Erro na autenticação:", error.message);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Middleware opcional - não falha se não houver token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await query(
      "SELECT id, email, username, is_email_confirmed FROM users WHERE id = $1",
      [decoded.userId],
    );

    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Middleware para verificar se o usuário é admin (para futuras funcionalidades)
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Autenticação requerida" });
    }

    if (!req.user.is_admin) {
      return res.status(403).json({
        error: "Acesso negado - privilégios de administrador requeridos",
      });
    }

    next();
  } catch (error) {
    console.error("❌ Erro na verificação de admin:", error.message);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Middleware para verificar se o usuário pode acessar o recurso
const requireOwnership = (resourceIdParam = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;

      // Se for o próprio usuário, permitir acesso
      if (resourceId === userId) {
        return next();
      }

      if (req.user.is_admin) {
        return next();
      }

      return res.status(403).json({
        error: "Acesso negado",
        message: "Você só pode acessar seus próprios recursos",
      });
    } catch (error) {
      console.error("❌ Erro na verificação de propriedade:", error.message);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  };
};

// Função para gerar o par de tokens (Access + Refresh)
const generateToken = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15m", // 15 minutos (Segurança)
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", // 7 dias (Persistência)
  });

  return { accessToken, refreshToken };
};

// Helpers individuais se necessário
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

/**
 * Função para criar sessão no Redis (Refresh Token Persistence)
 */
const createSession = async (userId, refreshToken) => {
  const redisClient = require("../config/redisClient");
  const key = `auth:refresh:${userId}`;
  // Guardamos o refresh token no Redis para permitir revogação
  await redisClient.setAsync(key, refreshToken, "EX", 604800); // 7 dias
  return true;
};

/**
 * Função para invalidar sessão
 */
const invalidateSession = async (userId) => {
  const redisClient = require("../config/redisClient");
  await redisClient.delAsync(`auth:refresh:${userId}`);
  await redisClient.delAsync(`auth:user:${userId}`); // Limpa cache de perfil também
  return true;
};

/**
 * Função para invalidar todas as sessões (Placeholder para escalabilidade)
 */
const invalidateAllSessions = async (userId) => {
  return invalidateSession(userId);
};

// Middleware para verificar se o jogador está com status 'Operacional'
const requireOperational = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Autenticação requerida" });
    }

    // Admins pulam a verificação de status
    if (req.user.is_admin) {
      return next();
    }

    // Whitelist de endpoints permitidos mesmo em status restrito (Leitura e Comunicação)
    const whitelist = [
      '/subscription',     // SSE
      '/state/subscribe',  // SSE State
      '/ranking',          // Ranking global
      '/profile',          // Perfil do jogador
      '/events',           // Eventos de clã/sistema
      '/messages',         // Chat/Mensagens
      '/clan',            // Informações de clã
      '/season',           // Temporada
      '/vip'               // Acesso VIP
    ];

    const isWhitelisted = whitelist.some(path => req.path.includes(path));
    if (isWhitelisted) return next();

    const playerStateService = require("../services/playerStateService");
    const state = await playerStateService.getPlayerState(req.user.id);
    
    // getPlayerState já executa o "Lazy Reset" se o tempo expirou
    const status = state?.status || 'Operacional';

    if (status !== 'Operacional' && status !== 'Ruptura') {
      return res.status(403).json({
        error: "Ação bloqueada",
        message: `Status atual: ${status}. Unidade bloqueada para ações de gameplay.`,
        status: status,
        code: "STATUS_LOCK"
      });
    }

    next();
  } catch (error) {
    console.error("❌ Erro na verificação de status operacional:", error.message);
    next();
  }
};

/**
 * Middleware para exigir um nível mínimo para acessar um recurso.
 * @param {number} minLevel 
 */
const requireMinLevel = (minLevel) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Autenticação requerida" });
      }

      // Admins ignoram nível (para testes)
      if (req.user.is_admin) return next();

      const playerStateService = require("../services/playerStateService");
      const state = await playerStateService.getPlayerState(req.user.id);
      
      const level = Number(state?.level || 1);

      if (level < minLevel) {
        return res.status(403).json({
          error: "Acesso bloqueado",
          message: `Você precisa atingir o nível ${minLevel} para acessar este recurso.`,
          currentLevel: level,
          minLevel: minLevel,
          code: "LEVEL_INSUFFICIENT"
        });
      }

      next();
    } catch (error) {
      console.error("❌ Erro na verificação de nível mínimo:", error.message);
      return res.status(503).json({
        error: "Erro temporário ao verificar nível. Tente novamente em instantes.",
        code: "LEVEL_CHECK_FAILED"
      });
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireOperational,
  requireMinLevel,
  requireOwnership,
  generateToken,
  createSession,
  invalidateSession,
  invalidateAllSessions,
};
