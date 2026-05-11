
const { query } = require("../config/database");
const redisClient = require("../config/redisClient");

async function resetState() {
  try {
    // 1. Busca o último usuário modificado (provavelmente você)
    const res = await query("SELECT user_id, username FROM user_profiles ORDER BY updated_at DESC LIMIT 1");
    if (res.rows.length === 0) {
      console.log("Nenhum usuário encontrado no banco dev.");
      process.exit(0);
    }

    const { user_id, username } = res.rows[0];
    console.log(`🧹 Iniciando limpeza para o usuário: ${username} (${user_id})`);

    // 2. Aguarda conexão do Redis
    await redisClient.redisReadyPromise;

    // 3. Remove chaves do Redis
    const keys = [
      `playerState:${user_id}`,
      `lock:training:${user_id}`,
      `lock:player:action:${user_id}`
    ];

    for (const key of keys) {
      await redisClient.delAsync(key);
      console.log(`   - Chave removida: ${key}`);
    }

    // 4. Reseta status no Banco de Dados
    await query(
      "UPDATE user_profiles SET status = 'Operacional', active_training_type = '', training_ends_at = NULL WHERE user_id = ?",
      [user_id]
    );
    console.log("✅ Status resetado para 'Operacional' no Banco de Dados.");

    console.log("\n🚀 Operação concluída. Atualize a página do jogo.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro ao resetar estado:", err.message);
    process.exit(1);
  }
}

resetState();
