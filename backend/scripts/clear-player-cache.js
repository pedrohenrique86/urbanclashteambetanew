// scripts/clear-player-cache.js
const { createClient } = require('redis');
require('dotenv').config();

async function clearCache(userId) {
  // Ajuste o host/porta se necessário, ou deixe ler do .env
  const client = createClient({ 
    url: process.env.REDIS_URL || 'redis://localhost:6379' 
  });
  
  await client.connect();
  
  // O prefixo correto conforme definido no seu playerStateService.js
  const key = `playerState:${userId}`; 
  const deleted = await client.del(key);
  
  if (deleted) {
    console.log(`✅ Cache 'playerState' removido para o usuário ${userId}.`);
    console.log(`ℹ️  O sistema irá recarregar os dados do PostgreSQL na próxima ação do jogador.`);
  } else {
    console.log(`❌ Nenhuma chave '${key}' encontrada no Redis. O jogador já pode estar lendo do banco ou está offline.`);
  }
  
  await client.quit();
}

const targetId = process.argv[2];
if (!targetId) {
  console.log("Uso: node scripts/clear-player-cache.js <USER_ID>");
  process.exit(1);
}

clearCache(targetId).catch(err => {
  console.error("Erro ao conectar no Redis:", err.message);
  process.exit(1);
});
