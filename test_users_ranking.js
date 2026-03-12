const { query } = require('./backend/config/database');

async function testUsersRanking() {
  try {
    console.log('🔍 Testando query de ranking de usuários...');
    
    // Verificar se as tabelas existem
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('users', 'user_profiles')
    `);
    
    console.log('📊 Tabelas encontradas:', tablesResult.rows.map(r => r.table_name));
    
    // Testar a query de ranking
    const rankingResult = await query(`
      SELECT 
        u.id, u.username,
        p.username as display_name, p.avatar_url, p.level, 
        p.experience_points, p.faction,
        ROW_NUMBER() OVER (ORDER BY p.level DESC, p.experience_points DESC) as rank
      FROM users u
      INNER JOIN user_profiles p ON u.id = p.user_id
      WHERE u.is_email_confirmed = true
      ORDER BY p.level DESC, p.experience_points DESC
      LIMIT $1
    `, [26]);

    console.log('✅ Query executada com sucesso!');
    console.log('📊 Resultados:', rankingResult.rows.length);
    if (rankingResult.rows.length > 0) {
      console.log('🏆 Primeiro usuário:', rankingResult.rows[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    console.error('❌ Stack:', error.stack);
    process.exit(1);
  }
}

testUsersRanking();