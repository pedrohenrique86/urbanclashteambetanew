const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkClansStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela clans...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clans' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Estrutura da tabela clans:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('\n🔍 Verificando dados existentes...');
    const dataResult = await pool.query('SELECT * FROM clans LIMIT 5');
    console.log('📊 Dados existentes:', dataResult.rows);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkClansStructure();