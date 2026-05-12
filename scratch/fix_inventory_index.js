const { query } = require("../backend/config/database");

async function fixSchema() {
  try {
    console.log("🛠️ Criando índice único em player_inventory(user_id, item_id)...");
    await query("CREATE UNIQUE INDEX IF NOT EXISTS idx_player_inventory_user_item ON player_inventory(user_id, item_id);");
    console.log("✅ Índice criado com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao criar índice:", err.message);
    if (err.message.includes("UNIQUE constraint failed")) {
      console.warn("⚠️ Existem registros duplicados no banco. Limpando duplicatas primeiro...");
      // Opcional: Limpar duplicatas antes de criar o índice
    }
  } finally {
    process.exit();
  }
}

fixSchema();
