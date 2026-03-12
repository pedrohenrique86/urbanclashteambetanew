const { query } = require('./backend/config/database');

async function testRankingsRoute() {
  try {
    console.log('🔍 Testando a rota de rankings de usuários...');
    
    // Simular a query exata da rota
    const rankingsQuery = `
      SELECT 
        u.id,
        u.username,
        p.username as display_name,
        p.level,
        p.experience_points,
        p.faction,
        p.victories,
        p.defeats,
        p.winning_streak,
        p.avatar_url,
        CASE 
          WHEN u.is_email_confirmed = true THEN
            ROW_NUMBER() OVER (ORDER BY p.level DESC, p.experience_points DESC)
          ELSE NULL
        END as rank
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.is_email_confirmed = true
      ORDER BY p.level DESC, p.experience_points DESC
      LIMIT 100
    `;
    
    console.log('Executando query de rankings...');
    const result = await query(rankingsQuery);
    
    console.log('✅ Query executada com sucesso!');
    console.log('Número de resultados:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('Primeiro resultado:', result.rows[0]);
    }
    
    // Testar também a query simplificada
    console.log('\n🔍 Testando query simplificada...');
    const simpleQuery = `
      SELECT 
        u.id,
        u.username,
        p.level,
        p.experience_points
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.is_email_confirmed = true
      ORDER BY p.level DESC
      LIMIT 5
    `;
    
    const simpleResult = await query(simpleQuery);
    console.log('✅ Query simplificada executada!');
    console.log('Resultados:', simpleResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao testar rankings:');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testRankingsRoute();