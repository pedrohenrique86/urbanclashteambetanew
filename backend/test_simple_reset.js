require('dotenv').config();
const { query } = require('./config/database');

async function simpleReset() {
  const userId = '0a95f31c-9abb-424f-a5ba-2820816788a2'; // ID do Pedro (Auditado)
  const token = 'manual-reset-token';
  const expires = new Date(Date.now() + 3600000);

  try {
    console.log('🔄 Resetando token para o usuário:', userId);
    
    await query(
      "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?",
      [token, expires, userId]
    );

    const check = await query(
      "SELECT password_reset_token, password_reset_expires FROM users WHERE id = ?",
      [userId]
    );

    console.log('✅ Token atualizado:', check.rows[0]);
    
    const sessions = await query(
        "SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ?",
        [userId]
    );
    console.log('📱 Sessões ativas:', sessions.rows[0].count);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit();
  }
}

simpleReset();
