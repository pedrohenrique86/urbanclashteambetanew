require("dotenv").config();
const { connectDB, query } = require('../config/database');
const redisClient = require('../config/redisClient');

async function run() {
  try {
    console.log("⏳ Conectando aos bancos de dados...");
    await connectDB();
    await redisClient.redisReadyPromise;

    const nowStr = new Date(Date.now() - 60000).toISOString(); // 1 minuto atrás
    
    // 1. Force expiration in Database just in case
    console.log("⏳ Atualizando Banco de Dados...");
    const res = await query(`
      UPDATE user_profiles 
      SET training_ends_at = datetime('now', '-1 minute') 
      WHERE training_ends_at > datetime('now') AND active_training_type IS NOT NULL
    `);
    console.log(`✅ ${res.rowCount} perfis atualizados no DB.`);

    // 2. Force expiration in Redis immediately
    console.log("⏳ Atualizando chaves do Redis...");
    const rawClient = redisClient.getRawClient();
    const keys = await rawClient.keys('playerState:*');
    let updatedCount = 0;
    
    for (const key of keys) {
      const state = await redisClient.hGetAllAsync(key);
      if (state && state.training_ends_at) {
         const endsAtTimestamp = new Date(state.training_ends_at).getTime();
         if (endsAtTimestamp > Date.now()) {
            await redisClient.hSetAsync(key, 'training_ends_at', nowStr);
            updatedCount++;
         }
      }
    }

    console.log(`✅ ${updatedCount} treinos adiantados (expirados) no Redis.`);
    console.log("🏁 Pronto! Pressione F5 na página ou vá para 'Treinamentos'. O 'Lazy Completion' no backend irá ver que expirou e automaticamente finalizar o treino atualizando XP e Status.");
    
  } catch (error) {
    console.error("❌ Erro ao finalizar treinos:", error);
  } finally {
    process.exit(0);
  }
}

run();
