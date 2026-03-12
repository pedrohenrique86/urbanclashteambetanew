const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432
});

async function checkPassword() {
  try {
    console.log('🔍 Verificando senhas dos usuários...');
    
    const users = await pool.query(`
      SELECT id, email, password_hash
      FROM users 
      WHERE email LIKE '%teste%' OR email LIKE '%test%'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`\n📊 Encontrados ${users.rows.length} usuários de teste:`);
    
    for (const user of users.rows) {
      console.log(`\n📧 Email: ${user.email}`);
      console.log(`🔑 Hash: ${user.password_hash.substring(0, 20)}...`);
      
      // Testar senhas comuns
      const commonPasswords = ['senha123', 'test123', '123456', 'password'];
      
      for (const password of commonPasswords) {
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (isMatch) {
          console.log(`✅ Senha encontrada: ${password}`);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    pool.end();
  }
}

checkPassword();