// Teste direto da lógica de ranking com estrutura correta
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testRankingLogic() {
  try {
    console.log('🔍 Testando lógica de ranking com estrutura correta...');
    
    // Simular os parâmetros da requisição
    const faction = 'gangsters';
    const limit = '10'; // Como string, como viria da URL
    
    console.log('📋 Parâmetros:');
    console.log('- Facção:', faction);
    console.log('- Limite:', limit, '(tipo:', typeof limit, ')');
    
    // Construir a cláusula WHERE (usando is_email_confirmed)
    let whereClause = 'WHERE u.is_email_confirmed = true';
    const queryParams = [];
    
    if (faction && faction !== 'all') {
      whereClause += ' AND p.faction = $1';
      queryParams.push(faction);
    }
    
    console.log('🔍 WHERE clause:', whereClause);
    console.log('🔍 Query params:', queryParams);
    
    // Construir a query completa (usando user_profiles)
    const query = `
      SELECT 
        u.id, u.username,
        p.display_name, p.avatar_url, p.level, 
        p.experience_points, p.faction,
        ROW_NUMBER() OVER (ORDER BY p.level DESC, p.experience_points DESC) as rank
      FROM users u
      INNER JOIN user_profiles p ON u.id = p.user_id
      ${whereClause}
      ORDER BY p.level DESC, p.experience_points DESC
      LIMIT $${queryParams.length + 1}
    `;
    
    // Adicionar o limite aos parâmetros
    queryParams.push(parseInt(limit));
    
    console.log('🔍 Query SQL final:');
    console.log(query);
    console.log('🔍 Parâmetros finais:', queryParams);
    
    // Executar a query
    const result = await pool.query(query, queryParams);
    
    console.log('✅ Query executada com sucesso!');
    console.log('📊 Número de resultados:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('🏆 Resultados do ranking:');
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.username} (${row.faction}) - Level ${row.level || 0} - XP: ${row.experience_points || 0}`);
      });
    } else {
      console.log('❌ Nenhum resultado encontrado!');
    }
    
    // Simular a resposta JSON
    const response = {
      leaderboard: result.rows
    };
    
    console.log('✅ Resposta JSON seria:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Erro na lógica de ranking:');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testRankingLogic();