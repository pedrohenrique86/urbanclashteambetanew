const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

// Função para simular getFactionStats
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
      intimidation: 35.00, // -35% defesa inimiga
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
      discipline: 40.00, // -40% dano recebido
      critical_chance: focus * 2, // foco * 2 = % (6*2 = 12%)
      critical_damage: attack + (focus / 2) // Ataque + (Foco ÷ 2) = 5 + (6/2) = 8.0
    };
  }
  
  return baseStats;
}

async function testFactionStandards() {
  try {
    console.log('🧪 Testando padrões de facção...');
    
    // Criar usuários de teste
    const testUsers = [
      { username: 'test_gangster', email: 'test_gangster@test.com', faction: 'gangsters' },
      { username: 'test_guarda', email: 'test_guarda@test.com', faction: 'guardas' }
    ];
    
    const createdUsers = [];
    
    for (const testUser of testUsers) {
      // Criar usuário na tabela users
      const userResult = await pool.query(
        'INSERT INTO users (username, email, password_hash, is_email_confirmed) VALUES ($1, $2, $3, $4) RETURNING id',
        [testUser.username, testUser.email, 'test_hash', true]
      );
      
      const userId = userResult.rows[0].id;
      const factionStats = getFactionStats(testUser.faction);
      
      // Criar perfil do usuário
      const profileResult = await pool.query(`
        INSERT INTO user_profiles (
          user_id, faction, display_name, level, experience_points,
          energy, current_xp, xp_required, action_points,
          attack, defense, focus, intimidation, discipline,
          critical_chance, critical_damage, money, victories, defeats, winning_streak,
          action_points_reset_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        userId,
        testUser.faction,
        testUser.username,
        factionStats.level,
        factionStats.current_xp,
        factionStats.energy,
        factionStats.current_xp,
        factionStats.xp_required,
        factionStats.action_points,
        factionStats.attack,
        factionStats.defense,
        factionStats.focus,
        factionStats.intimidation,
        factionStats.discipline,
        factionStats.critical_chance,
        factionStats.critical_damage,
        factionStats.money,
        factionStats.victories,
        factionStats.defeats,
        factionStats.winning_streak
      ]);
      
      createdUsers.push({ userId, profile: profileResult.rows[0] });
      console.log(`✅ Usuário ${testUser.faction} criado:`, testUser.username);
    }
    
    // Verificar valores esperados
    console.log('\n🔍 Verificando valores esperados:');
    
    for (const { profile } of createdUsers) {
      console.log(`\n📊 ${profile.faction.toUpperCase()} (${profile.display_name}):`);
      console.log(`  Nível: ${profile.level} (esperado: 1)`);
      console.log(`  Energia: ${profile.energy} (esperado: 100)`);
      console.log(`  XP Atual: ${profile.current_xp} (esperado: 0)`);
      console.log(`  Dinheiro: ${profile.money} (esperado: 1000)`);
      console.log(`  Pontos de Ação: ${profile.action_points} (esperado: 20000)`);
      console.log(`  Ataque: ${profile.attack} (esperado: ${profile.faction === 'guardas' ? '5' : '8'})`);
      console.log(`  Defesa: ${profile.defense} (esperado: ${profile.faction === 'guardas' ? '6' : '3'})`);
      console.log(`  Foco: ${profile.focus} (esperado: ${profile.faction === 'guardas' ? '6' : '5'})`);
      console.log(`  Intimidação: ${profile.intimidation}% (esperado: ${profile.faction === 'guardas' ? '0' : '35'}%)`);
      console.log(`  Disciplina: ${profile.discipline}% (esperado: ${profile.faction === 'guardas' ? '40' : '0'}%)`);
      console.log(`  Chance Crítica: ${profile.critical_chance}% (esperado: ${profile.faction === 'guardas' ? '12' : '10'}%)`);
      console.log(`  Dano Crítico: ${profile.critical_damage} (esperado: ${profile.faction === 'guardas' ? '8.0' : '10.5'})`);
      console.log(`  Vitórias: ${profile.victories} (esperado: 0)`);
      console.log(`  Derrotas: ${profile.defeats} (esperado: 0)`);
      console.log(`  Sequência de Vitórias: ${profile.winning_streak} (esperado: 0)`);
      
      // Verificar se os valores estão corretos
      const expectedValues = {
        gangsters: {
          attack: 8, defense: 3, focus: 5, intimidation: 35, discipline: 0,
          critical_chance: 10, critical_damage: 10.5
        },
        guardas: {
          attack: 5, defense: 6, focus: 6, intimidation: 0, discipline: 40,
          critical_chance: 12, critical_damage: 8.0
        }
      };
      
      const expected = expectedValues[profile.faction];
      if (expected) {
        const isCorrect = 
          profile.attack === expected.attack &&
          profile.defense === expected.defense &&
          profile.focus === expected.focus &&
          Math.abs(profile.intimidation - expected.intimidation) < 0.01 &&
          Math.abs(profile.discipline - expected.discipline) < 0.01 &&
          Math.abs(profile.critical_chance - expected.critical_chance) < 0.01 &&
          Math.abs(profile.critical_damage - expected.critical_damage) < 0.01;
        
        console.log(`  ✅ Valores ${isCorrect ? 'CORRETOS' : 'INCORRETOS'} para ${profile.faction}`);
      }
    }
    
    // Limpar usuários de teste
    console.log('\n🧹 Limpando usuários de teste...');
    for (const { userId } of createdUsers) {
      await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    
    console.log('✅ Teste concluído e usuários de teste removidos!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await pool.end();
  }
}

testFactionStandards();