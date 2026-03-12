const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela user_profiles...');
    
    // Verificar se a tabela existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
      );
    `);
    
    console.log(`📊 Tabela user_profiles existe: ${tableExists.rows[0].exists}`);
    
    if (tableExists.rows[0].exists) {
      // Verificar colunas da tabela
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Colunas da tabela user_profiles:');
      columns.rows.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
      });
      
      // Verificar dados existentes
      const userData = await pool.query(`
        SELECT 
          id,
          display_name,
          faction,
          attack,
          defense,
          focus,
          critical_chance,
          critical_damage
        FROM user_profiles
        LIMIT 5;
      `);
      
      console.log(`\n👥 Total de usuários: ${userData.rows.length}`);
      if (userData.rows.length > 0) {
        console.log('\n📊 Primeiros usuários:');
        userData.rows.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.display_name} (${user.faction})`);
          console.log(`      ID: ${user.id}`);
          console.log(`      Ataque: ${user.attack}, Defesa: ${user.defense}, Foco: ${user.focus}`);
          console.log(`      Chance Crítica: ${user.critical_chance}%, Dano Crítico: ${user.critical_damage}`);
        });
      }
    }
    
    // Verificar outras tabelas relacionadas
    console.log('\n🔍 Verificando outras tabelas...');
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Todas as tabelas no banco:');
    allTables.rows.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();