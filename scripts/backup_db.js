const path = require("path");
const fs = require("fs");

function loadLibSql() {
    const rootModule = path.join(process.cwd(), "node_modules", "@libsql/client");
    const backendModule = path.join(process.cwd(), "backend", "node_modules", "@libsql/client");
    
    if (fs.existsSync(rootModule)) return require(rootModule);
    if (fs.existsSync(backendModule)) return require(backendModule);
    
    console.error("❌ Erro: Módulo '@libsql/client' não encontrado.");
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

    if (!fs.existsSync(path.dirname(fullDest))) fs.mkdirSync(path.dirname(fullDest), { recursive: true });
    if (fs.existsSync(fullDest)) fs.unlinkSync(fullDest);

    console.log(`📡 [libSQL Backup] Snapshot de: ${fullPath}...`);
    const client = createClient({ url: `file:${fullPath}` });

    try {
        // SÊNIOR: Forçamos um checkpoint antes do backup para garantir que os dados do WAL entrem no arquivo principal
        try { await client.execute("PRAGMA wal_checkpoint(FULL);"); } catch(e) {}
        
        await client.execute(`VACUUM INTO '${fullDest}'`);
        
        // O VACUUM INTO garante uma cópia perfeita em nível binário.

        console.log(`✅ [libSQL Backup] Sucesso: ${backupFile}`);
        process.exit(0);
    } catch (err) {
        console.error(`❌ [libSQL Backup] FALHA:`, err.message);
        process.exit(1);
    }
}

run();
