const { createClient } = require('@libsql/client');
require('dotenv').config();

// SÊNIOR: Teste de conexão nativo para libSQL/Turso
const url = process.env.DATABASE_URL || 'file:dev.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

console.log('🔍 Testando conexão libSQL em:', url);

async function testConnection() {
  const client = createClient({
    url: url,
    authToken: authToken
  });

  try {
    const start = Date.now();
    const result = await client.execute('SELECT CURRENT_TIMESTAMP as now');
    const duration = Date.now() - start;

    console.log('\n✅ Conexão estabelecida com sucesso!');
    console.log('🕒 Hora do Banco:', result.rows[0].now);
    console.log('⚡ Latência:', duration, 'ms');
    
    // Teste de escrita simples (opcional)
    // await client.execute('SELECT 1');
    
  } catch (error) {
    console.error('\n❌ Erro de conexão:', error.message);
    if (error.message.includes('autocommit')) {
      console.log('💡 Dica: Verifique se a URL do banco está correta no .env');
    }
  } finally {
    // O cliente do libsql não precisa de .end() ou .close() manual obrigatoriamente
    // mas é boa prática para scripts curtos
  }
}

testConnection().catch(console.error);