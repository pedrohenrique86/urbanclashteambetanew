const db = require("./config/database");

async function verify() {
  try {
    console.log("🔍 Verificando conexão libSQL via config/database.js...");
    await db.connectDB();
    
    const clans = await db.query("SELECT COUNT(*) as count FROM clans");
    console.log(`✅ Conexão OK. Total de clãs: ${clans.rows[0].count}`);

    const factions = await db.query("SELECT name FROM factions");
    console.log(`✅ Facções encontradas: ${factions.rows.map(f => f.name).join(", ")}`);

    console.log("🚀 MIGRACÃO CONCLUÍDA COM SUCESSO!");
  } catch (err) {
    console.error("❌ Erro na verificação final:", err.message);
  }
}

verify();
