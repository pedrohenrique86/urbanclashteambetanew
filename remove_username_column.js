const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function removeUsernameColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Conectado ao banco de dados...');
    
    // Verificar se a coluna username existe
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name = 'username'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('📋 Coluna username encontrada na tabela user_profiles');
      
      // Remover a coluna username
      await client.query('ALTER TABLE user_profiles DROP COLUMN username');
      console.log('✅ Coluna username removida com sucesso!');
      
      // Verificar a estrutura da tabela após a remoção
      const tableStructure = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        ORDER BY ordinal_position
      `);
      
      console.log('\n📊 Estrutura atual da tabela user_profiles:');
      tableStructure.rows.forEach(row => {
        console.log(`   • ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
    } else {
      console.log('ℹ️  Coluna username não encontrada na tabela user_profiles (já foi removida)');
    }
    
  } catch (error) {
    console.error('❌ Erro ao remover coluna username:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

removeUsernameColumn();