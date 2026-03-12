const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

// Vamos usar as mesmas configurações que estão no arquivo database.js
const pool = new Pool({
  user: 'postgres',
  password: 'W0rdPr355@@',
  host: 'localhost',
  port: 5432,
  database: 'urbanclash',
  ssl: false
});

async function checkConfirmedUser() {
  const email = 'dev-test-1750649537824@example.com';
  
  try {
    console.log('🔍 Verificando usuário com email:', email);
    
    const result = await pool.query(
      'SELECT id, email, username, email_confirmation_token, is_email_confirmed, created_at FROM users WHERE email = $1',
      [email]
    );
    
    console.log('📊 Resultados encontrados:', result.rows.length);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Usuário encontrado!');
      console.log('🆔 ID:', user.id);
      console.log('📧 Email:', user.email);
      console.log('👤 Username:', user.username);
      console.log('🎫 Token:', user.email_confirmation_token);
      console.log('✓ Email confirmado:', user.is_email_confirmed);
      console.log('📅 Criado em:', user.created_at);
    } else {
      console.log('❌ Usuário não encontrado no banco de dados');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkConfirmedUser();