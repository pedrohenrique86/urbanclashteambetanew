const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function createTestLink() {
  try {
    console.log('🔍 Buscando usuário com token de confirmação...');
    
    // Buscar um usuário com token de confirmação
    const result = await pool.query(
      'SELECT email, email_confirmation_token, is_email_confirmed FROM users WHERE email_confirmation_token IS NOT NULL AND is_email_confirmed = false LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário com token encontrado. Criando um novo...');
      
      // Criar um usuário de teste com token
      const testToken = 'test-token-' + Date.now() + '-' + Math.random().toString(36).substring(7);
      const testEmail = 'test-' + Date.now() + '@example.com';
      const testUsername = 'testuser' + Date.now();
      
      await pool.query(
        'INSERT INTO users (id, email, username, password_hash, email_confirmation_token, is_email_confirmed) VALUES (gen_random_uuid(), $1, $2, $3, $4, false)',
        [testEmail, testUsername, '$2b$10$dummy.hash.for.testing', testToken]
      );
      
      console.log('✅ Usuário de teste criado!');
      console.log('📧 Email:', testEmail);
      console.log('🎫 Token:', testToken);
      console.log('🔗 Link de teste:');
      console.log(`http://localhost:3000/email-confirmation?token=${testToken}`);
      
    } else {
      const user = result.rows[0];
      console.log('👤 Usuário encontrado:', {
        email: user.email,
        confirmed: user.is_email_confirmed
      });
      
      console.log('🎫 Token:', user.email_confirmation_token);
      console.log('🔗 Link de teste:');
      console.log(`http://localhost:3000/email-confirmation?token=${user.email_confirmation_token}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

createTestLink();