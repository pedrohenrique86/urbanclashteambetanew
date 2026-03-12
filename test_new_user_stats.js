const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

// Função para obter stats baseados na facção (mesma lógica do backend)
function getFactionStats(faction) {
  const baseStats = {
    level: 1,
    energy: 100,
    current_xp: 0,
    xp_required: 100,
    action_points: 20000,
    money: 1000,
    victories: 0,
    defeats: 0,
    winning_streak: 0
  };

  if (faction === 'gangsters') {
    const focus = 5;
    return {
      ...baseStats,
      attack: 8,
      defense: 3,
      focus: focus,
      intimidation: 0.00,
      discipline: 0.00,
      critical_chance: focus * 2,
    critical_damage: attack + (focus / 2) // Ataque + (Foco ÷ 2)
    };
  } else if (faction === 'guardas') {
    const focus = 6;
    return {
      ...baseStats,
      attack: 5,
      defense: 6,
      focus: focus,
      intimidation: 0.00,
      discipline: 0.00,
      critical_chance: focus * 2,
      critical_damage: attack + (focus / 2) // Ataque + (Foco ÷ 2)
    };
  }
  
  return {
    ...baseStats,
    attack: 0,
    defense: 0,
    focus: 0,
    intimidation: 0.00,
    discipline: 0.00,
    critical_chance: 0.00,
    critical_damage: 150.00
  };
}

async function testNewUserStats() {
  try {
    console.log('🧪 Testando valores padrão para novos usuários...');
    
    // Testar valores para gangsters
    const gangstersStats = getFactionStats('gangsters');
    console.log('\n📊 Valores para Gangsters:');
    console.log(`   Ataque: ${gangstersStats.attack} (esperado: 8)`);
    console.log(`   Defesa: ${gangstersStats.defense} (esperado: 3)`);
    console.log(`   Foco: ${gangstersStats.focus} (esperado: 5)`);
    console.log(`   Chance Crítica: ${gangstersStats.critical_chance}% (esperado: 10%)`);
    console.log(`   Dano Crítico: ${gangstersStats.critical_damage} (esperado: 152.5)`);
    
    // Testar valores para guardas
    const guardasStats = getFactionStats('guardas');
    console.log('\n📊 Valores para Guardas:');
    console.log(`   Ataque: ${guardasStats.attack} (esperado: 5)`);
    console.log(`   Defesa: ${guardasStats.defense} (esperado: 6)`);
    console.log(`   Foco: ${guardasStats.focus} (esperado: 6)`);
    console.log(`   Chance Crítica: ${guardasStats.critical_chance}% (esperado: 12%)`);
    console.log(`   Dano Crítico: ${guardasStats.critical_damage} (esperado: 153)`);
    
    // Verificar se há usuários existentes com valores antigos
    const oldValuesCheck = await pool.query(`
      SELECT 
        display_name,
        faction,
        attack,
        defense,
        focus
      FROM user_profiles 
      WHERE 
        (faction = 'gangsters' AND (attack != 8 OR defense != 3 OR focus != 5)) OR
        (faction = 'guardas' AND (attack != 5 OR defense != 6 OR focus != 6))
      ORDER BY created_at DESC
    `);
    
    if (oldValuesCheck.rows.length > 0) {
      console.log('\n⚠️  Usuários com valores antigos encontrados:');
      oldValuesCheck.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.display_name} (${user.faction})`);
        console.log(`      Ataque: ${user.attack}, Defesa: ${user.defense}, Foco: ${user.focus}`);
      });
    } else {
      console.log('\n✅ Todos os usuários têm os valores corretos!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar stats:', error.message);
  } finally {
    await pool.end();
  }
}

testNewUserStats();