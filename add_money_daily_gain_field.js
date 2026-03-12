const { query } = require('./backend/config/database');

async function addMoneyDailyGainField() {
  try {
    console.log('🔧 Adicionando campo money_daily_gain à tabela user_profiles...');
    
    // Adicionar coluna money_daily_gain se não existir
    await query(`
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS money_daily_gain INTEGER DEFAULT 0;
    `);
    
    console.log('✅ Coluna money_daily_gain adicionada com sucesso!');
    
    // Atualizar todos os usuários existentes para ter 0 de ganho diário inicial
    const updateResult = await query(`
      UPDATE user_profiles 
      SET money_daily_gain = 0 
      WHERE money_daily_gain IS NULL;
    `);
    
    console.log(`✅ ${updateResult.rowCount} usuários atualizados com money_daily_gain = 0`);
    
    // Verificar as alterações
    const verificationResult = await query(`
      SELECT 
          display_name,
          faction,
          money,
          money_daily_gain,
          created_at
      FROM user_profiles 
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    
    console.log('\n📋 Últimos 10 usuários com money_daily_gain:');
    verificationResult.rows.forEach(user => {
      console.log(`   ${user.display_name} (${user.faction}): $${user.money} | Ganho diário: $${user.money_daily_gain}`);
    });
    
    console.log('\n🎉 Campo money_daily_gain configurado com sucesso para todas as facções!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar campo money_daily_gain:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addMoneyDailyGainField()
    .then(() => {
      console.log('✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro:', error.message);
      process.exit(1);
    });
}

module.exports = { addMoneyDailyGainField };