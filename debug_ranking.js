const { query } = require("./backend/config/database");
const rankingService = require("./backend/services/rankingCacheService");
const redisClient = require("./backend/config/redisClient");

async function debug() {
  console.log("--- DIAGNÓSTICO DE RANKING ---");
  
  try {
    console.log("\n1. Testando conexão com o Banco...");
    const dbTest = await query("SELECT current_database(), now()");
    console.log("✅ Conectado ao banco:", dbTest.rows[0]);

    console.log("\n2. Verificando se a coluna member_count existe em 'clans'...");
    const colTest = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clans' AND column_name = 'member_count'
    `);
    if (colTest.rows.length > 0) {
      console.log("✅ Coluna member_count ENCONTRADA.");
    } else {
      console.log("❌ Coluna member_count NÃO EXISTE no banco atual.");
    }

    console.log("\n3. Verificando quantidade de jogadores em 'user_profiles'...");
    const userCount = await query("SELECT count(*) FROM user_profiles");
    console.log("📊 Jogadores no banco:", userCount.rows[0].count);

    console.log("\n4. Forçando inicialização do ZSET de ranking...");
    await rankingService.initializeRankingZSet();
    
    console.log("\n5. Forçando warmup dos rankings...");
    await rankingService.warmupRankings();

    console.log("\n✅ Diagnóstico concluído. Verifique se os rankings voltaram.");
  } catch (err) {
    console.error("\n❌ ERRO DURANTE DIAGNÓSTICO:", err);
  } finally {
    process.exit();
  }
}

debug();
