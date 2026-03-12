// Script para corrigir os valores padrão da tabela user_profiles
const { query } = require('./backend/config/database');

async function fixUserProfilesDefaults() {
  try {
    console.log('🔧 Corrigindo valores padrão da tabela user_profiles...');
    
    // Remover valores padrão incorretos
    const alterations = [
      'ALTER TABLE user_profiles ALTER COLUMN attack DROP DEFAULT',
      'ALTER TABLE user_profiles ALTER COLUMN defense DROP DEFAULT', 
      'ALTER TABLE user_profiles ALTER COLUMN focus DROP DEFAULT',
      'ALTER TABLE user_profiles ALTER COLUMN critical_damage DROP DEFAULT',
      'ALTER TABLE user_profiles ALTER COLUMN critical_chance DROP DEFAULT',
      'ALTER TABLE user_profiles ALTER COLUMN intimidation DROP DEFAULT',
      'ALTER TABLE user_profiles ALTER COLUMN discipline DROP DEFAULT'
    ];
    
    for (const alteration of alterations) {
      console.log(`Executando: ${alteration}`);
      await query(alteration);
    }
    
    console.log('\n✅ Valores padrão removidos com sucesso!');
    
    // Verificar perfis com valores incorretos
    const incorrectProfiles = await query(`
      SELECT 
        user_id,
        display_name,
        faction,
        attack,
        defense,
        focus,
        critical_damage,
        critical_chance,
        intimidation,
        discipline
      FROM user_profiles 
      WHERE 
        (critical_damage = 150.00 AND faction IS NOT NULL) OR
        (attack = 5 AND faction = 'gangsters') OR
        (intimidation = 0.00 AND faction = 'gangsters') OR
        (discipline = 0.00 AND faction = 'guardas')
      ORDER BY created_at DESC;
    `);
    
    console.log('\n🔍 Perfis com valores incorretos encontrados:');
    if (incorrectProfiles.rows.length === 0) {
      console.log('   Nenhum perfil com valores incorretos encontrado');
    } else {
      incorrectProfiles.rows.forEach((profile, index) => {
        console.log(`   ${index + 1}. User ID: ${profile.user_id}`);
        console.log(`      Display Name: ${profile.display_name}`);
        console.log(`      Facção: ${profile.faction}`);
        console.log(`      Ataque: ${profile.attack} (esperado: ${profile.faction === 'gangsters' ? 8 : 5})`);
        console.log(`      Defesa: ${profile.defense} (esperado: ${profile.faction === 'gangsters' ? 3 : 6})`);
        console.log(`      Foco: ${profile.focus} (esperado: ${profile.faction === 'gangsters' ? 5 : 6})`);
        console.log(`      Dano Crítico: ${profile.critical_damage} (esperado: ${profile.faction === 'gangsters' ? 10.5 : 8})`);
        console.log(`      Chance Crítica: ${profile.critical_chance} (esperado: ${profile.faction === 'gangsters' ? 10 : 12})`);
        console.log(`      Intimidação: ${profile.intimidation} (esperado: ${profile.faction === 'gangsters' ? 35 : 0})`);
        console.log(`      Disciplina: ${profile.discipline} (esperado: ${profile.faction === 'gangsters' ? 0 : 40})`);
        console.log('');
      });
      
      console.log('\n🔧 Corrigindo perfis com valores incorretos...');
      
      for (const profile of incorrectProfiles.rows) {
        if (profile.faction === 'gangsters') {
          await query(`
            UPDATE user_profiles 
            SET 
              attack = 8,
              defense = 3,
              focus = 5,
              critical_damage = 10.5,
              critical_chance = 10,
              intimidation = 35.00,
              discipline = 0.00
            WHERE user_id = $1
          `, [profile.user_id]);
          console.log(`   ✅ Corrigido perfil gangster: ${profile.display_name}`);
        } else if (profile.faction === 'guardas') {
          await query(`
            UPDATE user_profiles 
            SET 
              attack = 5,
              defense = 6,
              focus = 6,
              critical_damage = 8.0,
              critical_chance = 12,
              intimidation = 0.00,
              discipline = 40.00
            WHERE user_id = $1
          `, [profile.user_id]);
          console.log(`   ✅ Corrigido perfil guarda: ${profile.display_name}`);
        }
      }
    }
    
    console.log('\n✅ Correção concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir valores padrão:', error.message);
  }
}

fixUserProfilesDefaults();