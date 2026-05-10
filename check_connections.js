const { query } = require("./backend/config/database");

async function checkConnectionHistory() {
  try {
    console.log("🔍 Analisando histórico de atividade das conexões...");
    const { rows } = await query(`
      SELECT 
        pid, 
        state, 
        now() - state_change AS idle_duration,
        query,
        application_name,
        client_addr
      FROM pg_stat_activity
      WHERE pid <> pg_backend_pid()
      ORDER BY state_change DESC;
    `);

    if (rows.length === 0) {
      console.log("✅ Nenhuma outra conexão encontrada.");
    } else {
      console.log(`🔌 Encontradas ${rows.length} conexões:`);
      rows.forEach(r => {
        console.log(`- PID: ${r.pid} | State: ${r.state} | Idle: ${r.idle_duration} | Last Query: ${r.query.substring(0, 50)}...`);
      });
    }

  } catch (err) {
    console.error("❌ Erro ao investigar conexões:", err.message);
  } finally {
    process.exit(0);
  }
}

checkConnectionHistory();
