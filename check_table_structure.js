const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela users...');
    
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(query);
    
    console.log('📊 Estrutura da tabela users:');
    console.table(result.rows);
    
    console.log('\n🔍 Verificando estrutura da tabela user_profiles...');
    
    const profileQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      ORDER BY ordinal_position;
    `;
    
    const profileResult = await pool.query(profileQuery);
    
    console.log('📊 Estrutura da tabela user_profiles:');
    console.table(profileResult.rows);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();