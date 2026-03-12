const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testUsernameDisplay() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Testando exibição de username...');
    
    // Testar query do perfil (como está sendo usado no backend)
    const profileResult = await client.query(`
      SELECT 
        u.id, u.username, u.created_at, u.birth_date, u.country,
        p.avatar_url, p.bio, p.level, 
        p.experience_points, p.faction, p.created_at as profile_created_at
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.is_email_confirmed = true
      LIMIT 3
    `);
    
    console.log('\n📊 Resultados da query de perfil:');
    profileResult.rows.forEach((row, index) => {
      console.log(`\n   Usuário ${index + 1}:`);
      console.log(`   • ID: ${row.id}`);
      console.log(`   • Username: ${row.username}`);
      console.log(`   • Faction: ${row.faction}`);
      console.log(`   • Level: ${row.level}`);
      console.log(`   • Email confirmado: true`);
    });
    
    // Verificar se há usuários sem username
    const usersWithoutUsername = await client.query(`
      SELECT id, email, username 
      FROM users 
      WHERE username IS NULL OR username = ''
      LIMIT 5
    `);
    
    if (usersWithoutUsername.rows.length > 0) {
      console.log('\n⚠️  Usuários sem username encontrados:');
      usersWithoutUsername.rows.forEach(row => {
        console.log(`   • ID: ${row.id}, Email: ${row.email}, Username: ${row.username || 'NULL'}`);
      });
    } else {
      console.log('\n✅ Todos os usuários têm username definido');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar username:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testUsernameDisplay();