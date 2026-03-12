const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432
});

async function testUserCountry() {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.username, u.country,
        p.username as display_name, p.faction
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.username = 'testuser'
    `);
    
    console.log('Dados do testuser:', result.rows);
    
    // Testar a query completa do ranking
    const rankingResult = await pool.query(`
      SELECT 
        u.id, u.username, u.country,
        p.username as display_name, p.avatar_url, p.level, 
        p.experience_points, p.faction, p.victories, p.defeats, p.winning_streak,
        ROW_NUMBER() OVER (ORDER BY p.level DESC, p.experience_points DESC) as rank
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.is_email_confirmed = true AND p.id IS NOT NULL AND p.faction = 'gangsters'
      ORDER BY p.level DESC, p.experience_points DESC
      LIMIT 5
    `);
    
    console.log('Resultado do ranking com country:', rankingResult.rows);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    pool.end();
  }
}

testUserCountry();