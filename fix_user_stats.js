const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function fixUserStats() {
  try {
    console.log('🔧 Corrigindo stats dos usuários...');
    
    // Primeiro, verificar quantos usuários têm os valores antigos
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM user_profiles 
      WHERE attack = 5 OR defense = 3 OR focus = 5
    `);
    
    console.log(`📊 Encontrados ${checkResult.rows[0].count} usuários com valores antigos`);
    
    if (checkResult.rows[0].count > 0) {
      // Atualizar todos os usuários para ter attack=0, defense=0, focus=0
      const updateResult = await pool.query(`
        UPDATE user_profiles 
        SET 
          attack = 0,
          defense = 0,
          focus = 0,
          critical_chance = 0,
          critical_damage = 150,
          updated_at = CURRENT_TIMESTAMP
        WHERE attack = 5 OR defense = 3 OR focus = 5
        RETURNING user_id, display_name, faction
      `);
      
      console.log(`✅ Atualizados ${updateResult.rows.length} usuários:`);
      updateResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.display_name || 'Sem nome'} (${user.faction})`);
      });
    } else {
      console.log('✅ Todos os usuários já têm os valores corretos!');
    }
    
    // Verificar o resultado final
    const finalResult = await pool.query(`
      SELECT 
        display_name,
        faction,
        attack, 
        defense, 
        focus
      FROM user_profiles 
      ORDER BY created_at DESC
      LIMIT 3
    `);
    
    console.log('\n📊 Verificação final - Últimos 3 usuários:');
    finalResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.display_name || 'Sem nome'} (${user.faction})`);
      console.log(`      Ataque: ${user.attack}, Defesa: ${user.defense}, Foco: ${user.focus}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir stats:', error.message);
  } finally {
    await pool.end();
  }
}

fixUserStats();