const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ 
  path: path.join(__dirname, '../.env.production'),
  override: true 
});

const databaseUrl = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function killSessions() {
  try {
    console.log("⚔️ Tentando derrubar sessões zumbis em PROD...");
    const res = await pool.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = current_database() 
      AND pid <> pg_backend_pid();
    `);
    console.log(`✅ ${res.rowCount} sessões derrubadas.`);
  } catch (err) {
    console.error("❌ Não foi possível derrubar sessões (provavelmente falta de permissão):", err.message);
    console.log("💡 Tentando apenas liberar locks da própria sessão...");
    await pool.query("SELECT pg_advisory_unlock_all()");
  } finally {
    await pool.end();
  }
}

killSessions();
