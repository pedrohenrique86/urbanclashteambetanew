const { query } = require('./config/database');

async function checkRankingData() {
  try {
    console.log('🔍 Verificando contagem de jogadores para o ranking...');
    const usersCount = await query('SELECT COUNT(*) FROM user_profiles WHERE level > 0 OR total_xp > 0');
    console.log(`📊 Jogadores elegíveis para ranking (level > 0 ou total_xp > 0): ${usersCount.rows[0].count}`);

    const clansCount = await query('SELECT COUNT(*) FROM clans');
    console.log(`📊 Total de clãs cadastrados: ${clansCount.rows[0].count}`);

    if (usersCount.rows[0].count > 0) {
      console.log('\n🔝 Top 5 jogadores no banco:');
      const topUsers = await query('SELECT user_id, level, total_xp, faction FROM user_profiles ORDER BY level DESC, total_xp DESC LIMIT 5');
      console.table(topUsers.rows);
    }

  } catch (error) {
    console.error('❌ Erro ao verificar dados de ranking:', error.message);
  } finally {
    process.exit(0);
  }
}

checkRankingData();
