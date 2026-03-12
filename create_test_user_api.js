const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function createTestUser() {
  try {
    console.log('🔍 Criando usuário de teste...');

    const email = 'test@urbanclash.com';
    const password = 'test123';
    const userId = uuidv4();

    // Verificar se o usuário já existe
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️ Usuário de teste já existe, removendo...');
      await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [existingUser.rows[0].id]);
      await pool.query('DELETE FROM users WHERE email = $1', [email]);
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    await pool.query(`
      INSERT INTO users (id, email, username, password_hash, is_email_confirmed, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [userId, email, 'TestUser', hashedPassword, true]);

    console.log('✅ Usuário criado:');
    console.log('   Email:', email);
    console.log('   Senha:', password);
    console.log('   ID:', userId);

    // Criar perfil com facção gangsters
    await pool.query(`
      INSERT INTO user_profiles (
        id, user_id, faction, display_name,
        level, current_xp, xp_required, money,
        attack, defense, focus, energy,
        intimidation, discipline, critical_chance, critical_damage,
        victories, defeats, winning_streak, action_points,
        created_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20,
        NOW()
      )
    `, [
      uuidv4(), userId, 'gangsters', 'TestUser',
      1, 0, 100, 1000,
      8, 3, 5, 100,
      35.00, 0.00, 10.00, 10.50,
      0, 0, 0, 20000
    ]);

    console.log('✅ Perfil criado com facção gangsters');
    console.log('   Ataque: 8');
    console.log('   Defesa: 3');
    console.log('   Foco: 5');
    console.log('   Dano Crítico: 10.5');
    console.log('   Intimidação: 35.0');

  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error.message);
  } finally {
    await pool.end();
  }
}

createTestUser();