const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkUsersColumns() {
  try {
    console.log('🔍 Verificando colunas da tabela users...');
    
    const query = `
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(query);
    
    console.log('📊 Colunas da tabela users:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name}`);
    });
    
    console.log('\n🔍 Verificando colunas da tabela user_profiles...');
    
    const profileQuery = `
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      ORDER BY ordinal_position;
    `;
    
    const profileResult = await pool.query(profileQuery);
    
    console.log('📊 Colunas da tabela user_profiles:');
    profileResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersColumns();