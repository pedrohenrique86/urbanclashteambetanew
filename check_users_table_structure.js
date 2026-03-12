const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkUsersTableStructure() {
  try {
    console.log('🔄 Verificando estrutura da tabela users...');
    
    // Verificar estrutura da tabela users
    const usersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estrutura da tabela users:');
    usersColumns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Verificar alguns registros de exemplo
    const sampleUsers = await pool.query(`
      SELECT id, email, username 
      FROM users 
      LIMIT 3;
    `);
    
    console.log('\n👤 Exemplos de usuários:');
    sampleUsers.rows.forEach(user => {
      console.log(`   ID: ${user.id} (tipo: ${typeof user.id}) - Email: ${user.email}`);
    });
    
    // Verificar estrutura da tabela user_sessions
    const sessionsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estrutura da tabela user_sessions:');
    sessionsColumns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Verificar se há incompatibilidade de tipos
    const userIdType = usersColumns.rows.find(col => col.column_name === 'id')?.data_type;
    const sessionUserIdType = sessionsColumns.rows.find(col => col.column_name === 'user_id')?.data_type;
    
    console.log('\n🔍 Análise de compatibilidade:');
    console.log(`   users.id: ${userIdType}`);
    console.log(`   user_sessions.user_id: ${sessionUserIdType}`);
    
    if (userIdType !== sessionUserIdType) {
      console.log('\n⚠️  INCOMPATIBILIDADE DETECTADA!');
      console.log('   Os tipos de ID não são compatíveis.');
      console.log('   Isso pode causar erros ao invalidar sessões.');
      
      if (userIdType === 'uuid' && sessionUserIdType === 'integer') {
        console.log('\n🔧 Solução sugerida:');
        console.log('   Alterar user_sessions.user_id para UUID');
      } else if (userIdType === 'integer' && sessionUserIdType === 'integer') {
        console.log('\n✅ Tipos compatíveis, problema pode estar em outro lugar');
      }
    } else {
      console.log('\n✅ Tipos de ID são compatíveis');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTableStructure();