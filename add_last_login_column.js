const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function addLastLoginColumn() {
  try {
    console.log('🔧 Adicionando coluna last_login à tabela user_profiles...');
    
    // Verificar se a coluna já existe
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' AND column_name = 'last_login';
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna last_login já existe!');
      return;
    }
    
    // Adicionar a coluna last_login
    await pool.query(`
      ALTER TABLE user_profiles 
      ADD COLUMN last_login TIMESTAMP;
    `);
    
    console.log('✅ Coluna last_login adicionada com sucesso!');
    
    // Verificar se foi adicionada
    const verifyColumn = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' AND column_name = 'last_login';
    `);
    
    if (verifyColumn.rows.length > 0) {
      console.log('✅ Verificação: Coluna last_login criada:', verifyColumn.rows[0]);
    } else {
      console.log('❌ Erro: Coluna last_login não foi criada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
  } finally {
    await pool.end();
  }
}

addLastLoginColumn();