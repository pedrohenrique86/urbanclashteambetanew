// Script para verificar a conexão com o banco de dados PostgreSQL local
const { query } = require('./backend/config/database');

async function checkDatabaseConnection() {
  try {
    console.log('🔍 Verificando conexão com o banco de dados PostgreSQL local...');
    
    // Testar conexão com o banco de dados
    const result = await query('SELECT NOW() as time');
    
    if (result && result.rows && result.rows.length > 0) {
      console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
      console.log(`⏰ Hora do servidor: ${result.rows[0].time}`);
      
      // Verificar tabelas principais
      console.log('\n📊 Verificando tabelas principais...');
      
      // Verificar tabela users
      const usersResult = await query('SELECT COUNT(*) FROM users');
      console.log(`👤 Usuários: ${usersResult.rows[0].count}`);
      
      // Verificar tabela clans
      const clansResult = await query('SELECT COUNT(*) FROM clans');
      console.log(`🏢 Clãs: ${clansResult.rows[0].count}`);
      
      // Verificar tabela user_profiles
      const profilesResult = await query('SELECT COUNT(*) FROM user_profiles');
      console.log(`📋 Perfis de usuário: ${profilesResult.rows[0].count}`);
      
      console.log('\n🎉 Verificação concluída com sucesso!');
    } else {
      console.error('❌ Erro ao verificar conexão: Resposta inesperada do banco de dados');
    }
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error.message);
    console.error('Detalhes do erro:', error);
    
    console.log('\n🔧 Verifique se:');
    console.log('1. O Docker está em execução');
    console.log('2. O container do PostgreSQL está ativo');
    console.log('3. As variáveis de ambiente estão configuradas corretamente');
    console.log('\nPara iniciar o PostgreSQL, execute:');
    console.log('docker-compose up -d postgres');
  }
}

checkDatabaseConnection();