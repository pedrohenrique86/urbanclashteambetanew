const { Pool } = require('pg');
const axios = require('axios');

// Configuração do banco
const pool = new Pool({
  user: 'postgres',
  password: 'W0rdPr355@@',
  host: 'localhost',
  port: 5432,
  database: 'urbanclash',
  ssl: false
});

async function testEmailConfirmation() {
  try {
    console.log('🔍 Buscando usuários com tokens de confirmação...');
    
    const result = await pool.query(
      'SELECT id, email, username, email_confirmation_token, is_email_confirmed FROM users WHERE email_confirmation_token IS NOT NULL LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário com token de confirmação encontrado');
      return;
    }
    
    const user = result.rows[0];
    console.log('👤 Usuário encontrado:', {
      id: user.id,
      email: user.email,
      username: user.username,
      is_confirmed: user.is_email_confirmed,
      token: user.email_confirmation_token.substring(0, 10) + '...'
    });
    
    console.log('🌐 Testando API de confirmação...');
    
    try {
      const response = await axios.get(`http://localhost:3001/api/auth/confirm-email/${user.email_confirmation_token}`);
      console.log('✅ Resposta da API:', response.data);
    } catch (apiError) {
      console.log('❌ Erro na API:');
      console.log('Status:', apiError.response?.status);
      console.log('Data:', apiError.response?.data);
      console.log('Message:', apiError.message);
      if (apiError.code) {
        console.log('Code:', apiError.code);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testEmailConfirmation();