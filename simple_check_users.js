const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkUsersStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela users...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Colunas da tabela users:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar dados existentes
    const userData = await pool.query('SELECT * FROM users LIMIT 1');
    if (userData.rows.length > 0) {
      console.log('\n📋 Colunas disponíveis no primeiro usuário:');
      console.log(Object.keys(userData.rows[0]));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersStructure();