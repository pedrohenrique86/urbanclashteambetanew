const jwt = require("jsonwebtoken");
const { query } = require("../config/database");
const redisClient = require("../config/redisClient");

const AUTH_CACHE_TTL = 3600; // 1 hora de cache para dados de auth
const AUTH_CACHE_PREFIX = "auth:user:";

/**
 * Autentica um usuário com base em um token JWT para uma conexão de socket ou middleware.
 */
async function authenticateSocket(token) {
  if (!token) {
    throw new Error("Token não fornecido.");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.userId) {
      throw new Error("Token inválido: userId ausente.");
    }

    const userId = decoded.userId;
    const cacheKey = `${AUTH_CACHE_PREFIX}${userId}`;

    // 1. Tenta buscar no Redis (Fast Path)
    if (redisClient.client.isReady) {
      const cached = await redisClient.getAsync(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // 2. Fallback ao Banco de Dados (Slow Path)
    const userQuery = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.country,
        u.is_email_confirmed,
        u.is_admin,
        cm.clan_id
      FROM users u
      LEFT JOIN clan_members cm ON u.id = cm.user_id
      WHERE u.id = $1;
    `;

    const result = await query(userQuery, [userId]);

    if (result.rows.length === 0) {
      throw new Error("Usuário não encontrado no banco de dados.");
    }

    const user = result.rows[0];

    // 3. Salva no Redis para próximas requisições
    if (redisClient.client.isReady) {
      await redisClient.setAsync(cacheKey, JSON.stringify(user), "EX", AUTH_CACHE_TTL);
    }

    return user;
  } catch (error) {
    if (error.name === "TokenExpiredError") throw error;
    console.error("Falha na autenticação:", error.message);
    throw error;
  }
}

module.exports = {
  authenticateSocket,
  AUTH_CACHE_PREFIX
};