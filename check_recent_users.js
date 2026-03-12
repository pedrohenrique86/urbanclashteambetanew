const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432
});

async function checkRecentUsers() {
  try {
    console.log('🔍 Verificando últimos usuários criados...');
    
    const result = await pool.query(`
      SELECT 
        u.username, 
        u.email, 
        p.faction, 
        p.attack, 
        p.defense, 
        p.focus, 
        p.intimidation, 
        p.discipline,
        u.created_at
      FROM users u 
      JOIN user_profiles p ON u.id = p.user_id 
      ORDER BY u.created_at DESC 
      LIMIT 10
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado.');
      return;
    }
    
    console.log('\n📊 Últimos usuários criados:');
    result.rows.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.username} (${user.faction})`);
      console.log(`   Ataque: ${user.attack} (esperado: ${user.faction === 'guardas' ? '5' : '8'})`);
      console.log(`   Defesa: ${user.defense} (esperado: ${user.faction === 'guardas' ? '6' : '3'})`);
      console.log(`   Foco: ${user.focus} (esperado: ${user.faction === 'guardas' ? '6' : '5'})`);
      console.log(`   Intimidação: ${user.intimidation}% (esperado: ${user.faction === 'guardas' ? '0' : '35'}%)`);
      console.log(`   Disciplina: ${user.discipline}% (esperado: ${user.faction === 'guardas' ? '40' : '0'}%)`);
      console.log(`   Criado em: ${user.created_at}`);
      
      // Verificar se os valores estão corretos
      const isCorrect = user.faction === 'guardas' 
        ? (user.attack === 5 && user.defense === 6 && user.focus === 6 && user.intimidation === 0 && user.discipline === 40)
        : (user.attack === 8 && user.defense === 3 && user.focus === 5 && user.intimidation === 35 && user.discipline === 0);
      
      console.log(`   Status: ${isCorrect ? '✅ CORRETO' : '❌ INCORRETO'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
  } finally {
    await pool.end();
  }
}

checkRecentUsers();