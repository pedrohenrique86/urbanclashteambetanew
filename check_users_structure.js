const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432
});

async function checkUsersStructure() {
  try {
    // Verificar estrutura da tabela users
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Estrutura da tabela users:');
    structureResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Verificar se há dados com country
    const dataResult = await pool.query(`
      SELECT id, username, country 
      FROM users 
      WHERE country IS NOT NULL 
      LIMIT 5
    `);
    
    console.log('\nUsuários com country preenchido:');
    console.log(dataResult.rows);
    
    // Testar a query exata do ranking
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
      LIMIT 1
    `);
    
    console.log('\nResultado da query de ranking (primeiro resultado):');
    console.log(JSON.stringify(rankingResult.rows[0], null, 2));
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    pool.end();
  }
}

checkUsersStructure();