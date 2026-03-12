const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function updateExistingUsers() {
  try {
    console.log('🔧 Atualizando usuários existentes com novos valores padrão...');
    
    // Atualizar usuários da facção gangsters
    const gangstersUpdate = await pool.query(`
      UPDATE user_profiles 
      SET 
        attack = 8,
        defense = 3,
        focus = 5,
        critical_chance = 5 * 2,
        critical_damage = 150 + (5 * 0.5),
        updated_at = CURRENT_TIMESTAMP
      WHERE faction = 'gangsters'
      RETURNING display_name, faction, attack, defense, focus
    `);
    
    console.log(`✅ Atualizados ${gangstersUpdate.rows.length} usuários Gangsters:`);
    gangstersUpdate.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.display_name} - Ataque: ${user.attack}, Defesa: ${user.defense}, Foco: ${user.focus}`);
    });
    
    // Atualizar usuários da facção guardas
    const guardasUpdate = await pool.query(`
      UPDATE user_profiles 
      SET 
        attack = 5,
        defense = 6,
        focus = 6,
        critical_chance = 6 * 2,
        critical_damage = 150 + (6 * 0.5),
        updated_at = CURRENT_TIMESTAMP
      WHERE faction = 'guardas'
      RETURNING display_name, faction, attack, defense, focus
    `);
    
    console.log(`\n✅ Atualizados ${guardasUpdate.rows.length} usuários Guardas:`);
    guardasUpdate.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.display_name} - Ataque: ${user.attack}, Defesa: ${user.defense}, Foco: ${user.focus}`);
    });
    
    // Verificação final
    const finalCheck = await pool.query(`
      SELECT 
        display_name,
        faction,
        attack,
        defense,
        focus,
        critical_chance,
        critical_damage
      FROM user_profiles 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📊 Verificação final - Todos os usuários:');
    finalCheck.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.display_name} (${user.faction})`);
      console.log(`      Ataque: ${user.attack}, Defesa: ${user.defense}, Foco: ${user.focus}`);
      console.log(`      Chance Crítica: ${user.critical_chance}%, Dano Crítico: ${user.critical_damage}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar usuários:', error.message);
  } finally {
    await pool.end();
  }
}

updateExistingUsers();