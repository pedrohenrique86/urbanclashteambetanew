const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432
});

async function testCombatSystem() {
  try {
    console.log('🧪 Testando sistema de combate...');
    
    // 1. Verificar estrutura da tabela
    console.log('\n📋 1. Verificando estrutura da tabela user_profiles:');
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name IN (
        'energy', 'current_xp', 'xp_required', 'action_points', 
        'attack', 'defense', 'focus', 'intimidation', 
        'discipline', 'critical_damage', 'critical_chance'
      )
      ORDER BY column_name;
    `);
    
    columns.rows.forEach(col => {
      console.log(`✅ ${col.column_name} (${col.data_type}) - Default: ${col.column_default || 'N/A'}`);
    });
    
    // 2. Verificar perfis com facções
    console.log('\n👥 2. Verificando perfis por facção:');
    const profiles = await pool.query(`
      SELECT 
        faction,
        COUNT(*) as total,
        AVG(attack) as avg_attack,
        AVG(defense) as avg_defense,
        AVG(focus) as avg_focus,
        AVG(critical_chance) as avg_crit_chance,
        AVG(critical_damage) as avg_crit_damage
      FROM user_profiles 
      WHERE faction IS NOT NULL
      GROUP BY faction
    `);
    
    profiles.rows.forEach(profile => {
      console.log(`\n🏴 Facção: ${profile.faction}`);
      console.log(`   Total de usuários: ${profile.total}`);
      console.log(`   Ataque médio: ${parseFloat(profile.avg_attack).toFixed(1)}`);
      console.log(`   Defesa média: ${parseFloat(profile.avg_defense).toFixed(1)}`);
      console.log(`   Foco médio: ${parseFloat(profile.avg_focus).toFixed(1)}`);
      console.log(`   Chance crítico média: ${parseFloat(profile.avg_crit_chance).toFixed(1)}%`);
      console.log(`   Dano crítico médio: ${parseFloat(profile.avg_crit_damage).toFixed(1)}%`);
    });
    
    // 3. Testar cálculos de stats
    console.log('\n🧮 3. Testando cálculos de stats:');
    
    // Gangsters
    const gangsterAttack = 8;
    const gangsterFocus = 5;
    const gangsterCritChance = gangsterFocus * 2;
    const gangsterCritDamage = gangsterAttack + (gangsterFocus / 2); // Ataque + (Foco ÷ 2)
    console.log(`\n🔫 Gangsters (Ataque: ${gangsterAttack}, Foco: ${gangsterFocus}):`);
    console.log(`   Chance crítico calculada: ${gangsterCritChance}%`);
    console.log(`   Dano crítico calculado: ${gangsterCritDamage}`);
    console.log(`   Intimidação: -35% (reduz defesa inimiga)`);
    
    // Guardas
    const guardaAttack = 5;
    const guardaFocus = 6;
    const guardaCritChance = guardaFocus * 2;
    const guardaCritDamage = guardaAttack + (guardaFocus / 2); // Ataque + (Foco ÷ 2)
    console.log(`\n🛡️ Guardas (Ataque: ${guardaAttack}, Foco: ${guardaFocus}):`);
    console.log(`   Chance crítico calculada: ${guardaCritChance}%`);
    console.log(`   Dano crítico calculado: ${guardaCritDamage}`);
    console.log(`   Disciplina: -40% (reduz dano recebido)`);
    
    // 4. Verificar pontos de ação
    console.log('\n⚡ 4. Verificando pontos de ação:');
    const actionPoints = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        AVG(action_points) as avg_points,
        MIN(action_points) as min_points,
        MAX(action_points) as max_points
      FROM user_profiles
    `);
    
    const ap = actionPoints.rows[0];
    console.log(`   Total de usuários: ${ap.total_users}`);
    console.log(`   Pontos médios: ${parseFloat(ap.avg_points).toFixed(0)}`);
    console.log(`   Pontos mínimos: ${ap.min_points}`);
    console.log(`   Pontos máximos: ${ap.max_points}`);
    
    // 5. Exemplo de perfil completo
    console.log('\n👤 5. Exemplo de perfil completo:');
    const sampleProfile = await pool.query(`
      SELECT 
        display_name, faction, level, energy, current_xp, xp_required,
        action_points, attack, defense, focus, intimidation, discipline,
        critical_chance, critical_damage
      FROM user_profiles 
      WHERE faction IS NOT NULL 
      LIMIT 1
    `);
    
    if (sampleProfile.rows.length > 0) {
      const profile = sampleProfile.rows[0];
      console.log(`\n📊 Perfil: ${profile.display_name}`);
      console.log(`   Facção: ${profile.faction}`);
      console.log(`   Nível: ${profile.level} | XP: ${profile.current_xp}/${profile.xp_required}`);
      console.log(`   Energia: ${profile.energy} | Pontos de Ação: ${profile.action_points}`);
      console.log(`   Ataque: ${profile.attack} | Defesa: ${profile.defense} | Foco: ${profile.focus}`);
      console.log(`   Intimidação: ${profile.intimidation}% | Disciplina: ${profile.discipline}%`);
      console.log(`   Chance Crítico: ${profile.critical_chance}% | Dano Crítico: ${profile.critical_damage}%`);
    }
    
    console.log('\n🎉 Teste do sistema de combate concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    pool.end();
  }
}

testCombatSystem();