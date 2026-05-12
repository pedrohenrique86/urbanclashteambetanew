const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

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

// SÊNIOR: Gerenciamento inteligente de conexão (Prioriza Remoto via Tailscale/VM)
const remoteUrl = process.env.LIBSQL_URL || process.env.TURSO_DATABASE_URL;
const localDbFile = isProduction ? "prod.db" : "dev.db";
const localDbPath = `file:${path.join(__dirname, "../../", localDbFile)}`;

const databaseUrl = remoteUrl || localDbPath;
const authToken = process.env.LIBSQL_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "";

if (remoteUrl) {
  console.log(`📡 [Database] Usando CONEXÃO REMOTA: ${remoteUrl}`);
} else {
  console.log(`📂 [Database] Usando BANCO LOCAL: ${localDbFile}`);
}

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
  // SÊNIOR: Verificação de saúde do arquivo físico (Crítico para VMs Linux/Oracle)
  if (databaseUrl.startsWith("file:")) {
    const filePath = databaseUrl.replace("file:", "");
    try {
      if (fs.existsSync(filePath)) {
        fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`📂 [Database] Arquivo ${localDbFile} detectado e com permissões OK.`);
      } else {
        console.warn(`⚠️ [Database] Arquivo ${localDbFile} não encontrado no caminho: ${filePath}`);
      }
    } catch (err) {
      console.error(`❌ [Database] ERRO DE PERMISSÃO no arquivo ${localDbFile}:`, err.message);
      console.error(`   -> DICA: Execute 'chmod 666 ${localDbFile}' na VM para liberar acesso.`);
    }
  }

  try {
    await client.execute("SELECT 1");
    console.log(`✅ Conectado ao banco [${localDbFile}] com sucesso.`);
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com libSQL:", error.message);
    
    // SÊNIOR: Detecção de Corrupção Crítica
    if (error.message.includes("malformed") || error.message.includes("corrupt")) {
      console.error("🚨 [CRITICAL] BANCO DE DADOS CORROMPIDO DETECTADO!");
      if (databaseUrl.startsWith("file:")) {
        const filePath = databaseUrl.replace("file:", "");
        const backupPath = `${filePath}.corrupt.${Date.now()}`;
        try {
          fs.renameSync(filePath, backupPath);
          console.error(`📦 Arquivo corrompido movido para: ${backupPath}`);
          console.error("💡 O servidor tentará criar um novo banco no próximo reinício. REINICIE O PROCESSO AGORA.");
          process.exit(1); // Força reinício para o libSQL criar o novo arquivo
        } catch (renameErr) {
          console.error("❌ Falha ao isolar arquivo corrompido:", renameErr.message);
        }
      }
    }
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
    // SÊNIOR: Auto-replace de $1, $2... para ? (Compatibilidade SQLite/libSQL)
    // Isso evita que o servidor caia se esquecermos algum placeholder do Postgres.
    const normalizedText = text.replace(/\$\d+/g, "?");
    const res = await client.execute({ sql: normalizedText, args: params });
    
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