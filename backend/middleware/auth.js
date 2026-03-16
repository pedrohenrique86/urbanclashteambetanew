const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

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
      return res
        .status(403)
        .json({
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

// Função para criar sessão no banco
const createSession = async (userId, token) => {
  try {
    console.log("✅ Sessão criada para usuário:", userId);
    // Usando a tabela user_profiles existente ao invés de user_sessions
    // A autenticação será baseada apenas no JWT token
    return true;
  } catch (error) {
    console.error("❌ Erro ao criar sessão:", error.message);
    throw error;
  }
};

// Função para invalidar sessão
const invalidateSession = async (userId, token) => {
  try {
    const tokenHash = require("crypto")
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await query(
      "DELETE FROM user_sessions WHERE user_id = $1 AND token_hash = $2",
      [userId, tokenHash],
    );

    return true;
  } catch (error) {
    console.error("❌ Erro ao invalidar sessão:", error.message);
    throw error;
  }
};

// Função para invalidar todas as sessões do usuário
const invalidateAllSessions = async (userId) => {
  try {
    await query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);

    return true;
  } catch (error) {
    console.error("❌ Erro ao invalidar todas as sessões:", error.message);
    throw error;
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireOwnership,
  generateToken,
  createSession,
  invalidateSession,
  invalidateAllSessions,
};
