const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkUserProfiles() {
  try {
    console.log('🔍 Verificando estrutura da tabela user_profiles...');
    
    const result = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles' ORDER BY ordinal_position"
    );
    
    console.log('Colunas da tabela user_profiles:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    // Verificar também a tabela users
    const usersResult = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    
    console.log('\nColunas da tabela users:');
    usersResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserProfiles();