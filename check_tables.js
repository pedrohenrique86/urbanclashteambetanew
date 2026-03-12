// Verificar tabelas existentes no banco
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkTables() {
  try {
    console.log('🔍 Verificando tabelas no banco de dados...');
    
    // Listar todas as tabelas
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tabelas encontradas:');
    tablesResult.rows.forEach(row => {
      console.log('- ' + row.table_name);
    });
    
    // Verificar se user_profiles existe
    const userProfilesExists = tablesResult.rows.find(row => row.table_name === 'user_profiles');
    
    if (userProfilesExists) {
      console.log('\n🔍 Estrutura da tabela user_profiles:');
      const profilesStructure = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        ORDER BY ordinal_position;
      `);
      
      profilesStructure.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Contar perfis
      const profileCount = await pool.query('SELECT COUNT(*) FROM user_profiles');
      console.log(`\n👤 Total de perfis: ${profileCount.rows[0].count}`);
    } else {
      console.log('\n❌ Tabela user_profiles não existe!');
    }
    
    // Verificar usuários com email confirmado
    const confirmedUsers = await pool.query('SELECT COUNT(*) FROM users WHERE is_email_confirmed = true');
    console.log(`✅ Usuários com email confirmado: ${confirmedUsers.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();