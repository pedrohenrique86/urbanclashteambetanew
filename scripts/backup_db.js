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
        
        // Verificação de sanidade pós-backup
        const verifyClient = createClient({ url: `file:${fullDest}` });
        const tables = await verifyClient.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='items'");
        
        if (tables.rows.length === 0) {
            console.warn("⚠️ [libSQL Backup] Alerta: Tabela 'items' não encontrada no snapshot gerado!");
        } else {
            console.log("✅ [libSQL Backup] Integridade verificada (Tabela 'items' presente).");
        }
        
        console.log(`✅ [libSQL Backup] Sucesso: ${backupFile}`);
        process.exit(0);
    } catch (err) {
        console.error(`❌ [libSQL Backup] FALHA:`, err.message);
        process.exit(1);
    }
}

run();
