const { query } = require('./backend/config/database');

async function testClansRanking() {
  try {
    console.log('🔍 Testando query de ranking de clãs...');
    
    const rankingResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.faction,
        c.points as score,
        c.created_at,
        c.updated_at,
        COUNT(cm.id) as member_count,
        ROW_NUMBER() OVER (ORDER BY c.points DESC, COUNT(cm.id) DESC) as rank
      FROM clans c
      LEFT JOIN clan_members cm ON c.id = cm.clan_id
      GROUP BY c.id, c.name, c.faction, c.points, c.created_at, c.updated_at
      ORDER BY c.points DESC, COUNT(cm.id) DESC
      LIMIT $1
    `, [26]);

    console.log('✅ Query executada com sucesso!');
    console.log('📊 Resultados:', rankingResult.rows.length);
    console.log('🏆 Primeiro clã:', rankingResult.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    console.error('❌ Stack:', error.stack);
    process.exit(1);
  }
}

testClansRanking();