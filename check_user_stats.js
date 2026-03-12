const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkUserStats() {
  try {
    console.log('🔍 Verificando stats dos usuários...');
    
    const result = await pool.query(`
      SELECT 
        user_id, 
        faction, 
        display_name,
        attack, 
        defense, 
        focus,
        level,
        current_xp,
        xp_required
      FROM user_profiles 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado');
      return;
    }
    
    console.log('\n📊 Últimos 5 usuários:');
    result.rows.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.display_name || 'Sem nome'} (${user.faction})`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Ataque: ${user.attack}`);
      console.log(`   Defesa: ${user.defense}`);
      console.log(`   Foco: ${user.focus}`);
      console.log(`   Level: ${user.level}`);
      console.log(`   XP Atual: ${user.current_xp}`);
      console.log(`   XP Necessário: ${user.xp_required}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar stats:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserStats();