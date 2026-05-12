const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

/**
 * SÊNIOR: Script de Migração Remota (via Tailscale/libSQL)
 * Este script agora ignora arquivos locais e atualiza diretamente a VM
 * se a LIBSQL_URL estiver configurada no .env.
 */

async function setup() {
  const databaseUrl = process.env.LIBSQL_URL;
  const authToken = process.env.LIBSQL_AUTH_TOKEN || "";

  if (!databaseUrl) {
    console.error("❌ Erro: LIBSQL_URL não encontrada no seu .env!");
    return;
  }

  const initSqlPath = path.join(__dirname, "../database/init_sqlite.sql");
  const initSql = fs.readFileSync(initSqlPath, "utf8");

  console.log(`🚀 [Migração Remota] Alvo: ${databaseUrl}`);
  
  const client = createClient({
    url: databaseUrl,
    authToken: authToken,
  });

  try {
    const cleanSql = initSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanSql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📦 Executando ${statements.length} instruções SQL...`);

    for (const statement of statements) {
      let safeStatement = statement;
      if (statement.toUpperCase().startsWith("CREATE TABLE ")) {
        if (!statement.toUpperCase().includes("IF NOT EXISTS")) {
          safeStatement = statement.replace(/CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ");
        }
      }
      await client.execute(safeStatement);
    }
    
    console.log(`✅ [Migração Remota] Banco na VM sincronizado com sucesso.`);
  } catch (err) {
    console.error(`❌ [Migração Remota] Erro:`, err.message);
  }
}

setup();
