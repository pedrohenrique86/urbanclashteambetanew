// Script para verificar a estrutura da tabela user_profiles
const { query } = require('./backend/config/database');

async function checkUserProfilesStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela user_profiles...');
    
    // Verificar estrutura da tabela
    const structure = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estrutura da tabela user_profiles:');
    structure.rows.forEach(col => {
      console.log(`   ${col.column_name}:`);
      console.log(`     Tipo: ${col.data_type}`);
      console.log(`     Nullable: ${col.is_nullable}`);
      console.log(`     Padrão: ${col.column_default || 'NULL'}`);
      console.log('');
    });
    
    // Verificar alguns registros recentes
    const recentProfiles = await query(`
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
        discipline,
        created_at
      FROM user_profiles 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    
    console.log('📋 Últimos 5 perfis criados:');
    if (recentProfiles.rows.length === 0) {
      console.log('   Nenhum perfil encontrado');
    } else {
      recentProfiles.rows.forEach((profile, index) => {
        console.log(`   ${index + 1}. User ID: ${profile.user_id}`);
        console.log(`      Display Name: ${profile.display_name}`);
        console.log(`      Facção: ${profile.faction || 'NULL'}`);
        console.log(`      Ataque: ${profile.attack || 'NULL'}`);
        console.log(`      Defesa: ${profile.defense || 'NULL'}`);
        console.log(`      Foco: ${profile.focus || 'NULL'}`);
        console.log(`      Dano Crítico: ${profile.critical_damage || 'NULL'}`);
        console.log(`      Chance Crítica: ${profile.critical_chance || 'NULL'}`);
        console.log(`      Intimidação: ${profile.intimidation || 'NULL'}`);
        console.log(`      Disciplina: ${profile.discipline || 'NULL'}`);
        console.log(`      Criado em: ${profile.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  }
}

checkUserProfilesStructure();