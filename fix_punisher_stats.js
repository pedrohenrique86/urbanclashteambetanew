const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function fixPunisherStats() {
  try {
    console.log('🔧 Corrigindo stats do usuário punisher (gangster)...');
    
    // Verificar dados atuais
    const currentData = await pool.query(`
      SELECT 
        display_name,
        faction,
        attack,
        defense,
        focus,
        critical_chance,
        critical_damage
      FROM user_profiles 
      WHERE display_name = 'punisher'
    `);
    
    if (currentData.rows.length > 0) {
      const user = currentData.rows[0];
      console.log('📊 Dados atuais do punisher:');
      console.log(`   Facção: ${user.faction}`);
      console.log(`   Ataque: ${user.attack} (deveria ser 8)`);
      console.log(`   Defesa: ${user.defense} (deveria ser 3)`);
      console.log(`   Foco: ${user.focus} (deveria ser 5)`);
      console.log(`   Chance Crítica: ${user.critical_chance}% (deveria ser 10%)`);
      console.log(`   Dano Crítico: ${user.critical_damage} (deveria ser 152.5)`);
      
      // Atualizar com valores corretos para gangster
      const updateResult = await pool.query(`
        UPDATE user_profiles 
        SET 
          attack = 8,
          defense = 3,
          focus = 5,
          critical_chance = 10,
          critical_damage = 152.5,
          updated_at = CURRENT_TIMESTAMP
        WHERE display_name = 'punisher'
        RETURNING display_name, attack, defense, focus, critical_chance, critical_damage
      `);
      
      if (updateResult.rows.length > 0) {
        const updated = updateResult.rows[0];
        console.log('\n✅ Usuário atualizado com sucesso!');
        console.log('📊 Novos dados do punisher:');
        console.log(`   Ataque: ${updated.attack}`);
        console.log(`   Defesa: ${updated.defense}`);
        console.log(`   Foco: ${updated.focus}`);
        console.log(`   Chance Crítica: ${updated.critical_chance}%`);
        console.log(`   Dano Crítico: ${updated.critical_damage}`);
      }
    } else {
      console.log('❌ Usuário punisher não encontrado!');
    }
    
    // Verificar todos os usuários gangsters
    console.log('\n📊 Verificação final - Todos os usuários Gangsters:');
    const allGangsters = await pool.query(`
      SELECT 
        display_name,
        attack,
        defense,
        focus
      FROM user_profiles 
      WHERE faction = 'gangsters'
      ORDER BY created_at DESC
    `);
    
    allGangsters.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.display_name}`);
      console.log(`      Ataque: ${user.attack}, Defesa: ${user.defense}, Foco: ${user.focus}`);
      
      if (user.attack === 8 && user.defense === 3 && user.focus === 5) {
        console.log(`      ✅ Valores corretos!`);
      } else {
        console.log(`      ❌ Valores incorretos! Esperado: 8,3,5`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir stats:', error.message);
  } finally {
    await pool.end();
  }
}

fixPunisherStats();