const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432
});

async function addEmailRateLimitingColumn() {
  try {
    // Verificar se a coluna já existe
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_confirmation_email_sent'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna last_confirmation_email_sent já existe');
      return;
    }
    
    // Adicionar a coluna
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN last_confirmation_email_sent TIMESTAMP WITHOUT TIME ZONE
    `);
    
    console.log('✅ Coluna last_confirmation_email_sent adicionada com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error.message);
  } finally {
    await pool.end();
  }
}

addEmailRateLimitingColumn();