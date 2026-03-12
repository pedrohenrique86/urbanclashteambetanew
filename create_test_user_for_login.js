const { query } = require('./backend/config/database');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    console.log('🔍 Criando usuário de teste para login...');
    
    const email = 'logintest@example.com';
    const username = 'logintest';
    const password = 'TestPassword123!';
    
    // Verificar se o usuário já existe
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Usuário de teste já existe');
      return;
    }
    
    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Criar usuário
    const userResult = await query(
      'INSERT INTO users (email, username, password_hash, is_email_confirmed) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, username, passwordHash, true]
    );
    
    const userId = userResult.rows[0].id;
    
    // Criar perfil do usuário
    await query(
      'INSERT INTO user_profiles (user_id, level, xp, coins) VALUES ($1, $2, $3, $4)',
      [userId, 1, 0, 100]
    );
    
    console.log('✅ Usuário de teste criado com sucesso!');
    console.log('📧 Email:', email);
    console.log('🔑 Senha:', password);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}

createTestUser();