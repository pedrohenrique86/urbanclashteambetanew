const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432
});

// Função para calcular stats baseados na facção
function getFactionStats(faction) {
  const baseStats = {
    level: 1,
    energy: 100,
    current_xp: 0,
    xp_required: 100,
    action_points: 20000, // 20.000 pontos de ação diários não cumulativos
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
      intimidation: 35.00, // -35% defesa inimiga (valor positivo para cálculo)
      discipline: 0.00,
      critical_chance: focus * 2, // foco * 2 = % (5*2 = 10%)
      critical_damage: attack + (focus / 2) // Ataque + (Foco ÷ 2) = 8 + (5/2) = 10.5
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
      discipline: 40.00, // -40% dano recebido (valor positivo para cálculo)
      critical_chance: focus * 2, // foco * 2 = % (6*2 = 12%)
      critical_damage: attack + (focus / 2) // Ataque + (Foco ÷ 2) = 5 + (6/2) = 8.0
    };
  }
  
  // Valores padrão se facção não especificada
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

async function setupFactionStats() {
  try {
    console.log('🎯 Configurando stats baseados na facção...');
    
    // Buscar todos os perfis existentes
    const profiles = await pool.query('SELECT id, faction, focus FROM user_profiles');
    
    console.log(`📊 Encontrados ${profiles.rows.length} perfis para atualizar`);
    
    for (const profile of profiles.rows) {
      const faction = profile.faction;
      
      const stats = getFactionStats(faction);
      
      // Atualizar o perfil com os stats da facção
      await pool.query(`
        UPDATE user_profiles 
        SET 
          level = $1,
          energy = $2,
          current_xp = $3,
          xp_required = $4,
          action_points = $5,
          attack = $6,
          defense = $7,
          focus = $8,
          intimidation = $9,
          discipline = $10,
          critical_chance = $11,
          critical_damage = $12,
          money = $13,
          victories = $14,
          defeats = $15,
          winning_streak = $16,
          action_points_reset_time = CURRENT_TIMESTAMP
        WHERE id = $17
      `, [
        stats.level,
        stats.energy,
        stats.current_xp,
        stats.xp_required,
        stats.action_points,
        stats.attack,
        stats.defense,
        stats.focus,
        stats.intimidation,
        stats.discipline,
        stats.critical_chance,
        stats.critical_damage,
        stats.money,
        stats.victories,
        stats.defeats,
        stats.winning_streak,
        profile.id
      ]);
      
      console.log(`✅ Perfil ${profile.id} atualizado para facção: ${faction || 'padrão'}`);
    }
    
    console.log('\n🎉 Todos os perfis foram atualizados com sucesso!');
    
    // Mostrar exemplo dos stats aplicados
    const sampleProfiles = await pool.query(`
      SELECT faction, attack, defense, focus, intimidation, discipline, 
             critical_chance, critical_damage 
      FROM user_profiles 
      WHERE faction IS NOT NULL 
      LIMIT 3
    `);
    
    console.log('\n📋 Exemplos de stats aplicados:');
    sampleProfiles.rows.forEach((profile, index) => {
      console.log(`${index + 1}. Facção: ${profile.faction}`);
      console.log(`   Ataque: ${profile.attack}, Defesa: ${profile.defense}, Foco: ${profile.focus}`);
      console.log(`   Intimidação: ${profile.intimidation}%, Disciplina: ${profile.discipline}%`);
      console.log(`   Chance Crítico: ${profile.critical_chance}%, Dano Crítico: ${profile.critical_damage}%\n`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao configurar stats da facção:', error.message);
  } finally {
    pool.end();
  }
}

setupFactionStats();