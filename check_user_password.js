const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkUserPassword() {
  try {
    console.log('🔍 Verificando senha do usuário...');

    // Buscar o usuário
    const result = await pool.query(`
      SELECT id, email, password_hash
      FROM users 
      WHERE email = 'prodrigues42@gmail.com'
    `);

    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    const user = result.rows[0];
    console.log('👤 Usuário encontrado:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Hash da senha:', user.password_hash ? 'Existe' : 'Não existe');

    // Testar algumas senhas comuns
    const testPasswords = ['senha123', 'password123', '123456', 'admin', 'test'];
    
    for (const password of testPasswords) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log(`   Senha '${password}': ${isValid ? '✅ CORRETA' : '❌ Incorreta'}`);
      
      if (isValid) {
        console.log(`\n🎉 Senha correta encontrada: '${password}'`);
        break;
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar senha:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserPassword();