const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkUserData() {
  try {
    console.log('🔍 Verificando dados dos usuários...');

    // Verificar dados existentes na tabela user_profiles
    const result = await pool.query(`
      SELECT 
        id, user_id, faction, 
        attack, defense, focus, 
        critical_damage, critical_chance,
        intimidation, discipline
      FROM user_profiles 
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`\n📋 Dados dos usuários (${result.rows.length} registros):`);
    result.rows.forEach((row, index) => {
      console.log(`\n👤 Usuário ${index + 1}:`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Facção: ${row.faction}`);
      console.log(`   Ataque: ${row.attack}`);
      console.log(`   Defesa: ${row.defense}`);
      console.log(`   Foco: ${row.focus}`);
      console.log(`   Dano Crítico: ${row.critical_damage}`);
      console.log(`   Chance Crítico: ${row.critical_chance}`);
      console.log(`   Intimidação: ${row.intimidation}`);
      console.log(`   Disciplina: ${row.discipline}`);
      
      // Verificar se os valores estão corretos para a facção
      if (row.faction === 'gangsters') {
        const isCorrect = row.attack === 8 && row.defense === 3 && row.focus === 5;
        console.log(`   ✅ Stats corretos: ${isCorrect ? 'SIM' : 'NÃO'}`);
        if (!isCorrect) {
          console.log(`   ❌ Esperado: attack=8, defense=3, focus=5`);
        }
      } else if (row.faction === 'guardas') {
        const isCorrect = row.attack === 5 && row.defense === 6 && row.focus === 6;
        console.log(`   ✅ Stats corretos: ${isCorrect ? 'SIM' : 'NÃO'}`);
        if (!isCorrect) {
          console.log(`   ❌ Esperado: attack=5, defense=6, focus=6`);
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserData();