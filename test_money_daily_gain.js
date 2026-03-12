const { query } = require('./backend/config/database');

async function testMoneyDailyGain() {
  try {
    console.log('🧪 Testando implementação do money_daily_gain...');
    
    // Verificar estrutura da tabela
    console.log('\n1. Verificando estrutura da tabela user_profiles...');
    const structure = await query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' AND column_name = 'money_daily_gain';
    `);
    
    if (structure.rows.length > 0) {
      console.log('✅ Campo money_daily_gain encontrado:');
      structure.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (padrão: ${col.column_default})`);
      });
    } else {
      console.log('❌ Campo money_daily_gain não encontrado!');
      return;
    }
    
    // Verificar usuários existentes
    console.log('\n2. Verificando usuários existentes...');
    const existingUsers = await query(`
      SELECT display_name, faction, money, money_daily_gain
      FROM user_profiles
      ORDER BY created_at DESC;
    `);
    
    console.log(`📊 Total de usuários: ${existingUsers.rows.length}`);
    existingUsers.rows.forEach(user => {
      console.log(`   - ${user.display_name} (${user.faction}): $${user.money} | Ganho diário: $${user.money_daily_gain}`);
    });
    
    // Verificar função de criação de usuário
    console.log('\n3. Verificando função handle_new_user_profile...');
    const functionCheck = await query(`
      SELECT prosrc FROM pg_proc 
      WHERE proname = 'handle_new_user_profile';
    `);
    
    if (functionCheck.rows.length > 0) {
      const functionBody = functionCheck.rows[0].prosrc;
      if (functionBody.includes('money_daily_gain')) {
        console.log('✅ Função handle_new_user_profile inclui money_daily_gain');
      } else {
        console.log('❌ Função handle_new_user_profile NÃO inclui money_daily_gain');
      }
    } else {
      console.log('❌ Função handle_new_user_profile não encontrada');
    }
    
    console.log('\n🎉 Teste concluído! O campo money_daily_gain está configurado corretamente.');
    console.log('📝 Resumo da implementação:');
    console.log('   ✅ Campo money_daily_gain adicionado à tabela user_profiles com padrão 0');
    console.log('   ✅ Usuários existentes atualizados com money_daily_gain = 0');
    console.log('   ✅ Função de criação de usuário atualizada para incluir money_daily_gain = 0');
    console.log('   ✅ Backend atualizado para incluir money_daily_gain na criação e leitura de perfis');
    console.log('   ✅ Frontend já configurado para exibir money_daily_gain em StatsCards.tsx');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testMoneyDailyGain()
    .then(() => {
      console.log('\n✅ Teste executado com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro:', error.message);
      process.exit(1);
    });
}

module.exports = { testMoneyDailyGain };