const jwt = require("jsonwebtoken");
const { query } = require("../config/database");
const { authenticateSocket } = require("../services/authService");

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    let token = req.query.token;

    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
        token = parts[1];
      } else if (parts.length === 1) {
        token = parts[0]; // Caso enviem o token direto no header sem 'Bearer'
      }
    }

    if (!token || token === "null" || token === "undefined") {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Auth] ⚠️ Tentativa de acesso sem token em: ${req.path}`);
      }
      return res.status(401).json({ 
        error: "Token de acesso requerido",
        code: "TOKEN_MISSING"
      });
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
    if (error.name === "JsonWebTokenError") {
      console.warn(`[Auth] ❌ Token Inválido: ${error.message}`);
      return res.status(401).json({ error: "Token inválido", code: "TOKEN_INVALID" });
    }
    if (error.name === "TokenExpiredError") {
      console.warn(`[Auth] 🕒 Token Expirado em: ${error.expiredAt}`);
      return res.status(401).json({ error: "Token expirado", code: "TOKEN_EXPIRED" });
    }

    console.error("❌ Erro fatal na autenticação:", error.message);
    
    if (error.message.includes("não encontrado")) {
      return res.status(401).json({ 
        error: "Sessão inválida", 
        message: "Usuário não encontrado no banco de dados. Por favor, faça login novamente.",
        code: "USER_NOT_FOUND"
      });
    }

    return res.status(500).json({ error: "Erro interno no middleware de autenticação" });
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
      "SELECT id, email, username, is_email_confirmed FROM users WHERE id = ?",
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
    expiresIn: "21d", // 21 dias (Duração total da temporada + margem)
  });

  return { accessToken, refreshToken };
};

// Helpers individuais se necessário
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "21d" });
};

/**
 * Função para criar sessão no Redis (Refresh Token Persistence)
 */
const createSession = async (userId, refreshToken) => {
  const redisClient = require("../config/redisClient");
  const key = `auth:refresh:${userId}`;
  // Guardamos o refresh token no Redis por 21 dias (1.814.400 segundos)
  await redisClient.setAsync(key, refreshToken, "EX", 1814400); 
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
      const gameLogic = require("../utils/gameLogic");
      const state = await playerStateService.getPlayerState(req.user.id);
      
      // SÊNIOR: O desbloqueio de recursos deve seguir o Nível Dinâmico (Prestígio)
      // para bater com o que o usuário vê na Topbar.
      const level = gameLogic.calculateDynamicLevel(state);

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
