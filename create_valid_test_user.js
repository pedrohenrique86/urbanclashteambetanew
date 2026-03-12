const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432
});

async function createValidTestUser() {
  try {
    console.log('👤 Criando usuário de teste válido...');
    
    const testEmail = 'apitest@urbanclash.com';
    const testPassword = 'test123';
    const testUsername = 'apitest';
    
    // Verificar se o usuário já existe
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [testEmail]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Usuário de teste já existe!');
      console.log(`   Email: ${testEmail}`);
      console.log(`   Senha: ${testPassword}`);
      return;
    }
    
    // Hash da senha corretamente
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    console.log(`🔑 Hash gerado: ${hashedPassword.substring(0, 20)}...`);
    
    // Criar usuário
    const userResult = await pool.query(
      `INSERT INTO users (email, username, password_hash, is_email_confirmed) 
       VALUES ($1, $2, $3, true) 
       RETURNING id`,
      [testEmail, testUsername, hashedPassword]
    );
    
    const userId = userResult.rows[0].id;
    console.log(`👤 Usuário criado com ID: ${userId}`);
    
    // Criar perfil com facção Gangsters
    await pool.query(
      `INSERT INTO user_profiles (
        user_id, display_name, faction, level, current_xp, xp_required,
        energy, action_points, attack, defense, focus, intimidation,
        discipline, critical_chance, critical_damage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        userId, 'API Test User', 'gangsters', 1, 0, 100,
        100, 20000, 8, 3, 5, -35.00,
        0.00, 10.00, 152.50
      ]
    );
    
    console.log('✅ Usuário de teste criado com sucesso!');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Senha: ${testPassword}`);
    console.log(`   Facção: Gangsters`);
    
    // Testar a senha
    const isValid = await bcrypt.compare(testPassword, hashedPassword);
    console.log(`🔍 Teste de senha: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error.message);
  } finally {
    pool.end();
  }
}

createValidTestUser();