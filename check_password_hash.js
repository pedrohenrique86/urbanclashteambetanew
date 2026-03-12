const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'admin',
  port: 5432,
});

async function checkPasswordHash() {
  try {
    console.log('🔍 Verificando hashes de senha...');
    
    // Buscar usuários
    const result = await pool.query('SELECT id, email, username, password_hash FROM users LIMIT 5');
    
    console.log('👥 Usuários encontrados:');
    for (const user of result.rows) {
      console.log(`\n📧 Email: ${user.email}`);
      console.log(`👤 Username: ${user.username}`);
      console.log(`🔐 Hash: ${user.password_hash}`);
      
      // Testar senhas comuns
      const commonPasswords = ['password123', 'admin123', '123456', 'password', 'admin'];
      
      for (const password of commonPasswords) {
        try {
          const isMatch = await bcrypt.compare(password, user.password_hash);
          if (isMatch) {
            console.log(`✅ Senha encontrada: ${password}`);
            break;
          }
        } catch (error) {
          console.log(`❌ Erro ao verificar senha '${password}':`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkPasswordHash();