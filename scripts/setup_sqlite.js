const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

async function setup() {
  const dbs = ["dev.db", "prod.db"];
  const initSql = fs.readFileSync(path.join(__dirname, "../database/init_sqlite.sql"), "utf8");

  for (const dbName of dbs) {
    const dbPath = path.join(__dirname, "../", dbName);
    
    if (fs.existsSync(dbPath)) {
      console.log(`⚠️  Removendo banco existente: ${dbName}`);
      fs.unlinkSync(dbPath);
    }

    console.log(`🚀 Inicializando banco: ${dbName}...`);
    const client = createClient({
      url: `file:${dbPath}`,
    });

    try {
      // Remove comentários de linha (--) e blocos vazios
      const cleanSql = initSql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');

      const statements = cleanSql
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await client.execute(statement);
      }
      
      console.log(`✅ Banco ${dbName} inicializado com sucesso.`);
    } catch (err) {
      console.error(`❌ Erro ao inicializar ${dbName}:`, err.message);
    }
  }
}

setup();
