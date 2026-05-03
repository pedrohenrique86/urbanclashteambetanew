const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    // Suporta token via header (padrão) OU via query param (necessário para SSE)
    const token = (authHeader && authHeader.split(" ")[1]) || req.query.token;

    if (!token) {
      return res.status(401).json({ error: "Token de acesso requerido" });
    }

    // Verificar se o token é válido
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar dados do usuário
    const userResult = await query(
      "SELECT id, email, username, is_email_confirmed, is_admin FROM users WHERE id = $1",
      [decoded.userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const user = userResult.rows[0];

    // Verificar se o email foi confirmado
    if (!user.is_email_confirmed) {
      return res.status(403).json({
        error: "Email não confirmado",
        message: "Por favor, confirme seu email antes de continuar",
      });
    }

    // Adicionar dados do usuário à requisição
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }

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

    // Verificar se o usuário tem privilégios de admin
    const adminResult = await query(
      "SELECT is_admin FROM users WHERE id = $1",
      [req.user.id],
    );

    if (adminResult.rows.length === 0 || !adminResult.rows[0].is_admin) {
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

      // Verificar se é admin
      const adminResult = await query(
        "SELECT is_admin FROM users WHERE id = $1",
        [userId],
      );

      if (adminResult.rows.length > 0 && adminResult.rows[0].is_admin) {
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

// Função para gerar token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }, // Token expira em 7 dias
  );
};

/**
 * Função para criar sessão (Legado/No-op)
 * A autenticação agora é estritamente stateless baseada em JWT.
 */
const createSession = async (userId) => {
  // console.log("✅ Sessão validada (JWT) para usuário:", userId);
  return true;
};

/**
 * Função para invalidar sessão (Legado/No-op)
 * Como não há persistência de estado de sessão em banco, o logout é handled no client descartando o JWT.
 */
const invalidateSession = async (userId, token) => {
  // No-op: arquitetura stateless
  return true;
};

/**
 * Função para invalidar todas as sessões (Legado/No-op)
 */
const invalidateAllSessions = async (userId) => {
  // No-op: arquitetura stateless
  return true;
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

    if (status !== 'Operacional' && status !== 'Sangrando') {
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
