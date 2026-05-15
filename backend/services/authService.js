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
        if (process.env.NODE_ENV === 'development') {
          console.log(`\x1b[36m[Redis:Auth]\x1b[0m ⚡ Cache HIT para ${userId}`);
        }
        return JSON.parse(cached);
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[AuthService] 🗄️ Cache MISS para ${userId}. Buscando no DB...`);
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
        up.clan_id,
        up.faction,
        up.avatar_url
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?;
    `;

    const result = await query(userQuery, [userId]);

    if (result.rows.length === 0) {
      throw new Error("Usuário não encontrado no banco de dados.");
    }

    const user = result.rows[0];
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AuthService] ✅ DB Result para ${userId}: clan_id=${user.clan_id}`);
    }

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

/**
 * SÊNIOR: Invalida o cache de autenticação de um usuário.
 * Chamado quando há mudanças críticas (ex: troca de clã) para garantir 
 * que o socketHandler e outros serviços vejam os dados novos.
 */
async function clearAuthCache(userId) {
  if (!userId) return;
  const cacheKey = `${AUTH_CACHE_PREFIX}${userId}`;
  try {
    if (redisClient.client.isReady) {
      await redisClient.delAsync(cacheKey);
      if (process.env.NODE_ENV === 'development') {
        console.log(`\x1b[35m[Redis:Auth]\x1b[0m 🗑️ Cache invalidado para ${userId}`);
      }
    }
  } catch (err) {
    console.error(`[AuthService] Erro ao invalidar cache para ${userId}:`, err.message);
  }
}

module.exports = {
  authenticateSocket,
  clearAuthCache,
  AUTH_CACHE_PREFIX
};