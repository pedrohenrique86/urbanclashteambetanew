const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

/**
 * Autentica um usuário com base em um token JWT para uma conexão de socket.
 *
 * @param {string} token - O token JWT fornecido pelo cliente.
 * @returns {Promise<object|null>} Um objeto com os dados do usuário se o token for válido, ou null caso contrário.
 * O objeto do usuário inclui id, username, email e clan_id.
 */
async function authenticateSocket(token) {
  if (!token) {
    throw new Error("Token não fornecido.");
  }

  try {
    // 1. Verifica e decodifica o token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.userId) {
      throw new Error("Token inválido: userId ausente.");
    }

    // 2. Busca o usuário e seu clã no banco de dados
    // Usamos um LEFT JOIN para garantir que o usuário seja retornado mesmo se não estiver em um clã.
    const userQuery = `
      SELECT
        u.id,
        u.username,
        u.email,
        cm.clan_id
      FROM users u
      LEFT JOIN clan_members cm ON u.id = cm.user_id
      WHERE u.id = $1;
    `;

    const result = await query(userQuery, [decoded.userId]);

    if (result.rows.length === 0) {
      throw new Error("Usuário não encontrado no banco de dados.");
    }

    // 3. Retorna os dados do usuário, incluindo clan_id (que pode ser null)
    return result.rows[0];
  } catch (error) {
    console.error("Falha na autenticação do socket:", error.message);
    // Lança o erro para ser capturado pelo middleware do socket.io
    throw error;
  }
}

module.exports = {
  authenticateSocket,
};