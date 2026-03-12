const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

// Função para calcular stats baseados na facção (igual ao backend)
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
    const attack = 8;
    return {
      ...baseStats,
      attack: attack,
      defense: 3,
      focus: focus,
      intimidation: 35.00,
      discipline: 0.00,
      critical_chance: focus * 2, // 10%
      critical_damage: attack + (focus / 2) // 10.5
    };
  } else if (faction === 'guardas') {
    const focus = 6;
    const attack = 5;
    return {
      ...baseStats,
      attack: attack,
      defense: 6,
      focus: focus,
      intimidation: 0.00,
      discipline: 40.00,
      critical_chance: focus * 2, // 12%
      critical_damage: attack + (focus / 2) // 8.0
    };
  }

  return baseStats;
}

async function fixExistingProfiles() {
  try {
    console.log('🔧 Corrigindo perfis existentes com stats incorretos...');

    // Buscar todos os perfis
    const result = await pool.query('SELECT * FROM user_profiles');
    const profiles = result.rows;

    console.log(`📊 Encontrados ${profiles.length} perfis para verificar`);

    for (const profile of profiles) {
      const correctStats = getFactionStats(profile.faction);
      
      // Verificar se os stats estão incorretos
      const needsUpdate = (
        profile.attack !== correctStats.attack ||
        profile.defense !== correctStats.defense ||
        profile.focus !== correctStats.focus ||
        profile.critical_damage !== correctStats.critical_damage ||
        profile.critical_chance !== correctStats.critical_chance ||
        profile.intimidation !== correctStats.intimidation ||
        profile.discipline !== correctStats.discipline
      );

      if (needsUpdate) {
        console.log(`🔄 Corrigindo perfil: ${profile.username} (${profile.faction})`);
        console.log(`   Antes: attack=${profile.attack}, defense=${profile.defense}, focus=${profile.focus}, critical_damage=${profile.critical_damage}`);
        console.log(`   Depois: attack=${correctStats.attack}, defense=${correctStats.defense}, focus=${correctStats.focus}, critical_damage=${correctStats.critical_damage}`);

        await pool.query(`
          UPDATE user_profiles 
          SET 
            attack = $1,
            defense = $2,
            focus = $3,
            intimidation = $4,
            discipline = $5,
            critical_chance = $6,
            critical_damage = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $8
        `, [
          correctStats.attack,
          correctStats.defense,
          correctStats.focus,
          correctStats.intimidation,
          correctStats.discipline,
          correctStats.critical_chance,
          correctStats.critical_damage,
          profile.user_id
        ]);
      } else {
        console.log(`✅ Perfil já correto: ${profile.username} (${profile.faction})`);
      }
    }

    console.log('\n🎉 Correção concluída!');
    
    // Verificar resultados
    const updatedResult = await pool.query('SELECT username, faction, attack, defense, focus, critical_damage, critical_chance FROM user_profiles ORDER BY faction, username');
    console.log('\n📊 Perfis após correção:');
    updatedResult.rows.forEach(profile => {
      console.log(`   ${profile.username} (${profile.faction}): attack=${profile.attack}, defense=${profile.defense}, focus=${profile.focus}, critical_damage=${profile.critical_damage}`);
    });

  } catch (error) {
    console.error('❌ Erro ao corrigir perfis:', error);
  } finally {
    await pool.end();
  }
}

fixExistingProfiles();