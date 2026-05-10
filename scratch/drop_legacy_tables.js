const { query } = require("../backend/config/database");

async function dropTables() {
  console.log("🚀 Iniciando remoção das tabelas redundantes...");
  try {
    await query("DROP TABLE IF EXISTS action_logs CASCADE");
    console.log("✅ Tabela 'action_logs' removida.");
    
    await query("DROP TABLE IF EXISTS contract_logs CASCADE");
    console.log("✅ Tabela 'contract_logs' removida.");
    
    await query("DROP TABLE IF EXISTS chat_messages CASCADE");
    console.log("✅ Tabela 'chat_messages' removida.");
    
    console.log("🎊 Limpeza concluída com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro ao remover tabelas:", err.message);
    process.exit(1);
  }
}

dropTables();
