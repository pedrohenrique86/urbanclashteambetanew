const { query } = require('./config/database');

async function checkClansStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela clans...');
    const clansStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clans'
      ORDER BY ordinal_position;
    `);
    console.log('📋 Estrutura da tabela clans:');
    console.table(clansStructure.rows);

    console.log('\n🔍 Verificando dados existentes na tabela clans...');
    const clansData = await query(`SELECT * FROM clans LIMIT 5`);
    console.log('📊 Dados da tabela clans:');
    console.table(clansData.rows);

  } catch (error) {
    console.error('❌ Erro ao verificar tabela clans:', error.message);
  } finally {
    process.exit(0);
  }
}

checkClansStructure();