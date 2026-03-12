const { Pool } = require('pg');
const axios = require('axios');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testRealToken() {
  try {
    console.log('🔍 Buscando usuário com token de confirmação...');
    
    // Buscar um usuário com token de confirmação
    const result = await pool.query(
      'SELECT email, email_confirmation_token, is_email_confirmed FROM users WHERE email_confirmation_token IS NOT NULL AND is_email_confirmed = false LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário com token de confirmação encontrado');
      
      // Criar um usuário de teste com token
      console.log('📝 Criando usuário de teste...');
      const testToken = 'test-token-' + Date.now();
      const testEmail = 'test-' + Date.now() + '@example.com';
      
      await pool.query(
        'INSERT INTO users (id, email, username, password_hash, email_confirmation_token, is_email_confirmed) VALUES (gen_random_uuid(), $1, $2, $3, $4, false)',
        [testEmail, 'testuser' + Date.now(), '$2b$10$dummy.hash.for.testing', testToken]
      );
      
      console.log('✅ Usuário de teste criado com token:', testToken);
      
      // Testar com o token criado
      console.log('🧪 Testando confirmação com token:', testToken);
      
      try {
        const response = await axios.get(`http://localhost:3001/api/auth/confirm-email/${testToken}`);
        console.log('✅ Sucesso! Resposta:', response.data);
      } catch (error) {
        console.log('❌ Erro na confirmação:', error.response?.data || error.message);
      }
      
    } else {
      const user = result.rows[0];
      console.log('👤 Usuário encontrado:', {
        email: user.email,
        token: user.email_confirmation_token,
        confirmed: user.is_email_confirmed
      });
      
      // Testar confirmação com token real
      console.log('🧪 Testando confirmação com token real...');
      
      try {
        const response = await axios.get(`http://localhost:3001/api/auth/confirm-email/${user.email_confirmation_token}`);
        console.log('✅ Sucesso! Resposta:', response.data);
      } catch (error) {
        console.log('❌ Erro na confirmação:', error.response?.data || error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testRealToken();