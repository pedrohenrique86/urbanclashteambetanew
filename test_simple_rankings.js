const { query } = require('./backend/config/database');

async function testSimpleRankings() {
  try {
    console.log('🔍 Testando query simples de rankings...');
    
    // Query mais simples sem ROW_NUMBER
    const simpleQuery = `
      SELECT 
        u.id, 
        u.username,
        p.username as display_name, 
        p.level, 
        p.experience_points
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.is_email_confirmed = true AND p.id IS NOT NULL
      ORDER BY p.level DESC, p.experience_points DESC
      LIMIT 10
    `;
    
    console.log('Executando query simples...');
    const result = await query(simpleQuery);
    
    console.log('✅ Query simples executada com sucesso!');
    console.log('Número de resultados:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('Resultados:', result.rows);
    }
    
    // Agora testar com ROW_NUMBER
    console.log('\n🔍 Testando query com ROW_NUMBER...');
    const rowNumberQuery = `
      SELECT 
        u.id, 
        u.username,
        p.username as display_name, 
        p.level, 
        p.experience_points,
        ROW_NUMBER() OVER (ORDER BY p.level DESC, p.experience_points DESC) as rank
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.is_email_confirmed = true AND p.id IS NOT NULL
      ORDER BY p.level DESC, p.experience_points DESC
      LIMIT 10
    `;
    
    const rowNumberResult = await query(rowNumberQuery);
    console.log('✅ Query com ROW_NUMBER executada!');
    console.log('Resultados:', rowNumberResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao testar rankings:');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSimpleRankings();