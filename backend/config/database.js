const { Pool } = require("pg");

// Configuração do pool de conexões PostgreSQL
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Fallback para configuração local se DATABASE_URL não estiver definida
if (!process.env.DATABASE_URL) {
  Object.assign(pool.options, {
    user: "postgres",
    password: "W0rdPr355@@",
    host: "localhost",
    port: 5432,
    database: "urbanclash",
  });
}

// Função para conectar ao banco
async function connectDB() {
  try {
    const client = await pool.connect();
    console.log("🔗 Testando conexão com PostgreSQL...");

    const result = await client.query("SELECT NOW()");
    console.log("✅ Conexão com PostgreSQL estabelecida:", result.rows[0].now);

    client.release();
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com PostgreSQL:", error.message);
    throw error;
  }
}

// Função para executar queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("📊 Query executada:", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("❌ Erro na query:", { text, error: error.message });
    throw error;
  }
}

// Função para transações
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Função para verificar se uma tabela existe
async function tableExists(tableName) {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName],
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error(`❌ Erro ao verificar tabela ${tableName}:`, error.message);
    return false;
  }
}

// Função para limpar sessões expiradas
async function cleanExpiredSessions() {
  try {
    const result = await query(
      "DELETE FROM user_sessions WHERE expires_at < NOW()",
    );
    console.log(
      `🧹 Limpeza de sessões: ${result.rowCount} sessões expiradas removidas`,
    );
  } catch (error) {
    console.error("❌ Erro ao limpar sessões expiradas:", error.message);
  }
}

// Limpar sessões expiradas a cada hora
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

// Graceful shutdown function (to be called from server.js)
async function closePool() {
  console.log("🛑 Fechando pool de conexões PostgreSQL...");
  await pool.end();
}

module.exports = {
  pool,
  query,
  transaction,
  connectDB,
  tableExists,
  cleanExpiredSessions,
  closePool,
};
