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

// Vamos também criar um pool alternativo usando as variáveis de ambiente
const envPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function checkSpecificToken() {
  const token = 'dev-token-1750649537824-c1c604';
  
  try {
    console.log('🔍 Verificando token:', token);
    console.log('\n=== USANDO CONFIGURAÇÃO HARDCODED (database.js) ===');
    
    // Verificar com o pool principal (configurações hardcoded)
    const result = await pool.query(
      'SELECT id, email, username, email_confirmation_token, is_email_confirmed, created_at FROM users WHERE email_confirmation_token = $1',
      [token]
    );
    
    console.log('📊 Resultados encontrados:', result.rows.length);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Token encontrado!');
      console.log('🆔 ID:', user.id);
      console.log('📧 Email:', user.email);
      console.log('👤 Username:', user.username);
      console.log('🎫 Token:', user.email_confirmation_token);
      console.log('✓ Email confirmado:', user.is_email_confirmed);
      console.log('📅 Criado em:', user.created_at);
    } else {
      console.log('❌ Token não encontrado no banco de dados');
      
      // Vamos verificar se existe algum usuário com token similar
      const similarResult = await pool.query(
        'SELECT id, email, username, email_confirmation_token, is_email_confirmed, created_at FROM users WHERE email_confirmation_token IS NOT NULL ORDER BY created_at DESC LIMIT 5'
      );
      
      console.log('\n🔍 Últimos 5 tokens no banco:');
      similarResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.email} - ${row.email_confirmation_token} (${row.created_at})`);
      });
    }
    
    // Agora vamos verificar com o pool alternativo (variáveis de ambiente)
    console.log('\n=== USANDO VARIÁVEIS DE AMBIENTE (.env) ===');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_USER:', process.env.DB_USER);
    
    const envResult = await envPool.query(
      'SELECT id, email, username, email_confirmation_token, is_email_confirmed, created_at FROM users WHERE email_confirmation_token = $1',
      [token]
    );
    
    console.log('📊 Resultados encontrados (env):', envResult.rows.length);
    
    if (envResult.rows.length > 0) {
      const user = envResult.rows[0];
      console.log('✅ Token encontrado (env)!');
      console.log('🆔 ID:', user.id);
      console.log('📧 Email:', user.email);
      console.log('🎫 Token:', user.email_confirmation_token);
      console.log('✓ Email confirmado:', user.is_email_confirmed);
    } else {
      console.log('❌ Token não encontrado no banco de dados (env)');
      
      // Vamos verificar se existe algum usuário com token similar
      const envSimilarResult = await envPool.query(
        'SELECT id, email, username, email_confirmation_token, is_email_confirmed, created_at FROM users WHERE email_confirmation_token IS NOT NULL ORDER BY created_at DESC LIMIT 5'
      );
      
      console.log('\n🔍 Últimos 5 tokens no banco (env):');
      envSimilarResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.email} - ${row.email_confirmation_token} (${row.created_at})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
    await envPool.end();
  }
}

checkSpecificToken();