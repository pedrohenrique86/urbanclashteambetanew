const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function createUserSessionsTable() {
  try {
    console.log('🔄 Verificando e criando tabela user_sessions...');
    
    // Verificar se a tabela já existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ Tabela user_sessions já existe');
      return;
    }
    
    console.log('📝 Criando tabela user_sessions...');
    
    // Criar a tabela user_sessions (sem foreign key por enquanto)
    await pool.query(`
      CREATE TABLE user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Tabela user_sessions criada com sucesso');
    
    // Criar índices
    console.log('📝 Criando índices...');
    
    await pool.query(`
      CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
    `);
    
    await pool.query(`
      CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
    `);
    
    await pool.query(`
      CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
    `);
    
    console.log('✅ Índices criados com sucesso');
    
    // Verificar a estrutura da tabela criada
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estrutura da tabela user_sessions:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    console.log('\n🎉 Tabela user_sessions configurada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela user_sessions:', error.message);
  } finally {
    await pool.end();
  }
}

createUserSessionsTable();