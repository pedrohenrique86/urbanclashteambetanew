const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Criando usuário de teste...');
    
    const email = 'test@urbanclash.com';
    const username = 'testuser';
    const password = 'test123';
    
    // Verificar se o usuário já existe
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️  Usuário já existe, removendo...');
      await client.query('DELETE FROM users WHERE email = $1 OR username = $2', [email, username]);
    }
    
    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Criar usuário
    const userResult = await client.query(`
      INSERT INTO users (email, username, password_hash, is_email_confirmed, birth_date, country)
      VALUES ($1, $2, $3, true, '1990-01-01', 'BR')
      RETURNING id, email, username
    `, [email, username, passwordHash]);
    
    const userId = userResult.rows[0].id;
    
    // Criar perfil
    await client.query(`
      INSERT INTO user_profiles (
        user_id, faction, level, experience_points,
        energy, current_xp, xp_required, action_points,
        attack, defense, focus, intimidation, discipline,
        critical_chance, critical_damage, money, money_daily_gain, victories, defeats, winning_streak,
        action_points_reset_time
      )
      VALUES ($1, 'gangsters', 1, 0, 100, 0, 100, 10, 10, 10, 10, 1.0, 1.0, 5.0, 150.0, 1000, 50, 0, 0, 0, CURRENT_TIMESTAMP)
    `, [userId]);
    
    console.log('✅ Usuário de teste criado com sucesso!');
    console.log('📧 Email:', email);
    console.log('👤 Username:', username);
    console.log('🔑 Password:', password);
    console.log('🆔 ID:', userId);
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUser();