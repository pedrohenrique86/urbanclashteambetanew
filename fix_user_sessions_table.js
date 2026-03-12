const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function fixUserSessionsTable() {
  try {
    console.log('🔄 Corrigindo tabela user_sessions...');
    
    // Verificar se há dados na tabela
    const dataCheck = await pool.query('SELECT COUNT(*) FROM user_sessions');
    const recordCount = parseInt(dataCheck.rows[0].count);
    
    console.log(`📊 Registros existentes: ${recordCount}`);
    
    if (recordCount > 0) {
      console.log('🧹 Limpando dados existentes (incompatíveis)...');
      await pool.query('DELETE FROM user_sessions');
      console.log('✅ Dados limpos');
    }
    
    // Alterar o tipo da coluna user_id de integer para UUID
    console.log('🔧 Alterando tipo da coluna user_id para UUID...');
    
    await pool.query(`
      ALTER TABLE user_sessions 
      ALTER COLUMN user_id TYPE UUID 
      USING user_id::text::uuid;
    `);
    
    console.log('✅ Tipo da coluna alterado com sucesso');
    
    // Verificar a estrutura atualizada
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estrutura atualizada da tabela user_sessions:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Verificar compatibilidade novamente
    const usersIdType = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id';
    `);
    
    const sessionsUserIdType = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' AND column_name = 'user_id';
    `);
    
    console.log('\n🔍 Verificação de compatibilidade:');
    console.log(`   users.id: ${usersIdType.rows[0].data_type}`);
    console.log(`   user_sessions.user_id: ${sessionsUserIdType.rows[0].data_type}`);
    
    if (usersIdType.rows[0].data_type === sessionsUserIdType.rows[0].data_type) {
      console.log('\n✅ COMPATIBILIDADE CORRIGIDA!');
      console.log('   Os tipos agora são compatíveis.');
    } else {
      console.log('\n❌ Ainda há incompatibilidade');
    }
    
    console.log('\n🎉 Correção da tabela user_sessions concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir tabela:', error.message);
    
    if (error.message.includes('cannot be cast automatically')) {
      console.log('\n🔧 Tentando abordagem alternativa...');
      
      try {
        // Recriar a tabela com o tipo correto
        console.log('🗑️  Removendo tabela existente...');
        await pool.query('DROP TABLE IF EXISTS user_sessions');
        
        console.log('📝 Recriando tabela com tipo UUID...');
        await pool.query(`
          CREATE TABLE user_sessions (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        
        // Recriar índices
        await pool.query('CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);');
        await pool.query('CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);');
        await pool.query('CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);');
        
        console.log('✅ Tabela recriada com sucesso!');
        
      } catch (recreateError) {
        console.error('❌ Erro ao recriar tabela:', recreateError.message);
      }
    }
  } finally {
    await pool.end();
  }
}

fixUserSessionsTable();