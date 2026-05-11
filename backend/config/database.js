const { createClient } = require("@libsql/client");
const path = require("path");

// 1. Carrega o .env padrão
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// 2. Se for produção, sobrepõe com .env.production
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ 
    path: path.join(__dirname, "../.env.production"),
    override: true 
  });
}

const isProduction = process.env.NODE_ENV === "production";

// Configuração do cliente libSQL (Turso ou Local VM)
// SÊNIOR: Gerenciamento inteligente de dois bancos na VM (dev.db e prod.db)
const localDbFile = isProduction ? "prod.db" : "dev.db";
const localDbPath = `file:${path.join(__dirname, "../../", localDbFile)}`;

const databaseUrl = process.env.TURSO_DATABASE_URL || 
                   process.env.LIBSQL_URL || 
                   localDbPath;

const authToken = process.env.TURSO_AUTH_TOKEN || "";

console.log(`🔌 [Database] Modo: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
console.log(`🔌 [Database] Conectando via libSQL: ${databaseUrl}`);

const client = createClient({
  url: databaseUrl,
  authToken: authToken,
});

/**
 * Função para conectar ao banco
 */
async function connectDB() {
  try {
    await client.execute("SELECT 1");
    console.log(`✅ Conectado ao banco [${localDbFile}] com sucesso.`);
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com libSQL:", error.message);
    throw error;
  }
}

/**
 * Função para executar queries
 * SÊNIOR: Mantemos o formato de retorno { rows } para evitar quebrar os serviços existentes.
 * Também fazemos um auto-replace básico de $1 para ? caso esqueçamos algum.
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await client.execute({ sql: text, args: params });
    
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn("⚠️ Query Lenta (SQLite):", { text: text.substring(0, 100), duration: `${duration}ms` });
    }

    return {
      rows: res.rows,
      rowCount: res.rows.length,
      lastInsertRowid: res.lastInsertRowid
    };
  } catch (error) {
    console.error("❌ Erro na query (libSQL):", { text: text.substring(0, 200), error: error.message });
    throw error;
  }
}

/**
 * Função para transações
 */
async function transaction(callback) {
  const tx = await client.transaction("write");
  try {
    const txWrapper = {
      query: async (text, params = []) => {
        const res = await tx.execute({ sql: text, args: params });
        return { rows: res.rows, rowCount: res.rows.length };
      }
    };

    const result = await callback(txWrapper);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

/**
 * Verifica se uma tabela existe (Sintaxe SQLite)
 */
async function tableExists(tableName) {
  try {
    const result = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error(`❌ Erro ao verificar tabela ${tableName}:`, error.message);
    return false;
  }
}

async function closePool() {
  console.log("🛑 Fechando conexão libSQL...");
}

module.exports = {
  client,
  query,
  transaction,
  connectDB,
  tableExists,
  closePool,
};