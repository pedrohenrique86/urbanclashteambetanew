require('dotenv').config();
const { query } = require('./config/database');

async function testResetDebug() {
  const email = 'teste@exemplo.com';
  console.log('🧪 Iniciando Debug de Reset para:', email);

  try {
    const token = 'test-token-' + Date.now();
    const expires = new Date(Date.now() + 3600000);

    console.log('1. Atualizando token no banco...');
    await query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE email = ?',
      [token, expires, email]
    );

    console.log('2. Verificando se gravou...');
    const res = await query(
      'SELECT id, email, password_reset_token, password_reset_expires FROM users WHERE email = ?',
      [email]
    );

    if (res.rows.length === 0) {
      console.log('❌ Usuário não encontrado.');
      return;
    }

    console.log('✅ Resultado:', res.rows[0]);
    
    // Teste de Sessão
    const sessions = await query('SELECT * FROM user_sessions WHERE user_id = ?', [res.rows[0].id]);
    console.log('📊 Sessões ativas:', sessions.rows.length);

  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
  } finally {
    process.exit();
  }
}

testResetDebug();