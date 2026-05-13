const path = require("path");
const fs = require("fs");

/**
 * SÊNIOR: Script de Backup Universal libSQL
 * Localiza o módulo @libsql/client automaticamente na pasta backend
 */
function loadLibSql() {
    const rootModule = path.join(process.cwd(), "node_modules", "@libsql/client");
    const backendModule = path.join(process.cwd(), "backend", "node_modules", "@libsql/client");
    
    if (fs.existsSync(rootModule)) return require(rootModule);
    if (fs.existsSync(backendModule)) return require(backendModule);
    
    console.error("❌ Erro: Módulo '@libsql/client' não encontrado em /node_modules ou /backend/node_modules.");
    process.exit(1);
}

const { createClient } = loadLibSql();

async function run() {
    const dbFile = process.argv[2];
    const backupFile = process.argv[3];

    if (!dbFile || !backupFile) {
        console.error("❌ Uso: node backup_db.js <arquivo_origem> <arquivo_destino>");
        process.exit(1);
    }

    const fullPath = path.isAbsolute(dbFile) ? dbFile : path.join(process.cwd(), dbFile);
    const fullDest = path.isAbsolute(backupFile) ? backupFile : path.join(process.cwd(), backupFile);

    // Garante que o diretório de destino existe
    const destDir = path.dirname(fullDest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    if (fs.existsSync(fullDest)) fs.unlinkSync(fullDest);

    console.log(`📡 [libSQL Backup] Snapshot de: ${fullPath}...`);
    const client = createClient({ url: `file:${fullPath}` });

    try {
        await client.execute(`VACUUM INTO '${fullDest}'`);
        console.log(`✅ [libSQL Backup] Sucesso: ${backupFile}`);
        process.exit(0);
    } catch (err) {
        console.error(`❌ [libSQL Backup] FALHA:`, err.message);
        process.exit(1);
    }
}

run();
