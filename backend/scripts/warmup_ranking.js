/**
 * warmup_ranking.js
 * 
 * SÊNIOR: Script de manutenção para reconstruir os Sorted Sets do Redis.
 * Útil após limpezas de cache ou migrações de dados.
 */
const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const rankingCacheService = require("../services/rankingCacheService");

async function run() {
  console.log("🚀 [Warmup] Iniciando reconstrução dos índices de ranking...");
  
  try {
    // SÊNIOR: Aguarda a conexão do Redis estar pronta
    let attempts = 0;
    while (!redisClient.client.isReady && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (!redisClient.client.isReady) {
      console.error("❌ [Warmup] Redis não está pronto.");
      process.exit(1);
    }

    // Forçamos o warmup independente do ZCARD atual para garantir integridade
    await rankingCacheService.initializeRankingZSet();
    
    console.log("✅ [Warmup] Índices reconstruídos com sucesso.");
    process.exit(0);
  } catch (err) {
    console.error("❌ [Warmup] Erro fatal:", err.message);
    process.exit(1);
  }
}

run();
