const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  password: 'W0rdPr355@@',
  host: 'localhost',
  port: 5432,
  database: 'urbanclash',
  ssl: false
});

async function applyDatabasePatch() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Conectando ao banco de dados PostgreSQL...');
    
    // Ler o arquivo de patch SQL
    const patchPath = path.join(__dirname, 'database_patch_user_updates.sql');
    const patchSQL = fs.readFileSync(patchPath, 'utf8');
    
    console.log('📄 Arquivo de patch carregado:', patchPath);
    
    // Iniciar transação
    await client.query('BEGIN');
    console.log('🔄 Iniciando transação...');
    
    // Verificar estrutura atual das tabelas ANTES do patch
    console.log('\n📊 ESTRUTURA ATUAL DAS TABELAS (ANTES):');
    
    const usersColumnsBefore = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n👤 Tabela users:');
    usersColumnsBefore.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    const profilesColumnsBefore = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n👥 Tabela user_profiles:');
    profilesColumnsBefore.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Aplicar o patch
    console.log('\n🔧 Aplicando patch do banco de dados...');
    await client.query(patchSQL);
    
    // Verificar estrutura das tabelas DEPOIS do patch
    console.log('\n📊 ESTRUTURA DAS TABELAS (DEPOIS):');
    
    const usersColumnsAfter = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n👤 Tabela users:');
    usersColumnsAfter.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    const profilesColumnsAfter = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n👥 Tabela user_profiles:');
    profilesColumnsAfter.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Verificar índices criados
    const indexes = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('users', 'user_profiles') 
      AND indexname LIKE '%country%' OR indexname LIKE '%birth_date%' OR indexname LIKE '%username%'
    `);
    
    console.log('\n🔍 Índices criados:');
    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname} na tabela ${idx.tablename}`);
    });
    
    // Confirmar transação
    await client.query('COMMIT');
    console.log('\n✅ Patch aplicado com sucesso!');
    console.log('\n📝 Resumo das alterações:');
    console.log('   • Tabela users: Adicionadas colunas birth_date e country');
    console.log('   • Tabela user_profiles: display_name substituído por username');
    console.log('   • Índices criados para otimização de consultas');
    
  } catch (error) {
    // Reverter transação em caso de erro
    await client.query('ROLLBACK');
    console.error('❌ Erro ao aplicar patch:', error.message);
    console.error('🔄 Transação revertida.');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar o script
if (require.main === module) {
  applyDatabasePatch()
    .then(() => {
      console.log('\n🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha na execução do script:', error.message);
      process.exit(1);
    });
}

module.exports = { applyDatabasePatch };