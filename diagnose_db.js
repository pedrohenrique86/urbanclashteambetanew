const { query } = require("./backend/config/database");

async function checkActiveQueries() {
  try {
    console.log("🔍 Investigando queries ativas no banco de dados...");
    const { rows } = await query(`
      SELECT pid, now() - query_start AS duration, query, state
      FROM pg_stat_activity
      WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%'
      ORDER BY duration DESC;
    `);

    if (rows.length === 0) {
      console.log("✅ Nenhuma query ativa encontrada no momento.");
    } else {
      console.log(`⚠️ Encontradas ${rows.length} queries ativas:`);
      rows.forEach(r => {
        console.log(`- [${r.duration}] (${r.state}): ${r.query.substring(0, 100)}`);
      });
    }

    // Também vamos ver o total de conexões
    const connResult = await query("SELECT count(*) FROM pg_stat_activity");
    console.log(`🔌 Total de conexões abertas: ${connResult.rows[0].count}`);

  } catch (err) {
    console.error("❌ Erro ao investigar queries:", err.message);
  } finally {
    process.exit(0);
  }
}

checkActiveQueries();
