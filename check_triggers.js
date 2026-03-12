// Script para verificar triggers ativos no banco de dados
const { query } = require('./backend/config/database');

async function checkTriggers() {
  try {
    console.log('🔍 Verificando triggers ativos no banco de dados...');
    
    // Verificar triggers na tabela users
    const userTriggers = await query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'users'
      ORDER BY trigger_name;
    `);
    
    console.log('\n📋 Triggers na tabela users:');
    if (userTriggers.rows.length === 0) {
      console.log('   Nenhum trigger encontrado');
    } else {
      userTriggers.rows.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name}`);
        console.log(`     Evento: ${trigger.event_manipulation}`);
        console.log(`     Timing: ${trigger.action_timing}`);
        console.log(`     Ação: ${trigger.action_statement}`);
        console.log('');
      });
    }
    
    // Verificar triggers na tabela user_profiles
    const profileTriggers = await query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'user_profiles'
      ORDER BY trigger_name;
    `);
    
    console.log('📋 Triggers na tabela user_profiles:');
    if (profileTriggers.rows.length === 0) {
      console.log('   Nenhum trigger encontrado');
    } else {
      profileTriggers.rows.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name}`);
        console.log(`     Evento: ${trigger.event_manipulation}`);
        console.log(`     Timing: ${trigger.action_timing}`);
        console.log(`     Ação: ${trigger.action_statement}`);
        console.log('');
      });
    }
    
    // Verificar todas as funções relacionadas a perfis
    const functions = await query(`
      SELECT 
        routine_name,
        routine_definition
      FROM information_schema.routines 
      WHERE routine_type = 'FUNCTION'
      AND (routine_name LIKE '%profile%' OR routine_name LIKE '%user%')
      ORDER BY routine_name;
    `);
    
    console.log('📋 Funções relacionadas a usuários/perfis:');
    if (functions.rows.length === 0) {
      console.log('   Nenhuma função encontrada');
    } else {
      functions.rows.forEach(func => {
        console.log(`   - ${func.routine_name}`);
        console.log(`     Definição: ${func.routine_definition.substring(0, 200)}...`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar triggers:', error.message);
  }
}

checkTriggers();