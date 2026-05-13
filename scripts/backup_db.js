const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

/**
 * SÊNIOR: Script de Backup Universal libSQL
 * Utiliza 'VACUUM INTO' para criar um clone perfeito do banco ativo
 * sem precisar de binários externos (sqlite3/libsql-shell).
 */
async function run() {
    const dbFile = process.argv[2];
    const backupFile = process.argv[3];

    if (!dbFile || !backupFile) {
        console.error("❌ Uso: node backup_db.js <arquivo_origem> <arquivo_destino>");
        process.exit(1);
    }

    const fullPath = path.isAbsolute(dbFile) ? dbFile : path.join(process.cwd(), dbFile);
    const fullDest = path.isAbsolute(backupFile) ? backupFile : path.join(process.cwd(), backupFile);

    // O VACUUM INTO exige que o arquivo de destino NÃO exista
    if (fs.existsSync(fullDest)) {
        try {
            fs.unlinkSync(fullDest);
        } catch (e) {
            console.error(`❌ Não foi possível remover backup antigo: ${e.message}`);
        }
    }

    console.log(`📡 [libSQL Backup] Iniciando snapshot de: ${dbFile}...`);
    
    // Conexão local simples
    const client = createClient({ url: `file:${fullPath}` });

    try {
        const start = Date.now();
        // Comando mágico do libSQL/SQLite para backup a quente
        await client.execute(`VACUUM INTO '${fullDest}'`);
        const duration = Date.now() - start;
        
        console.log(`✅ [libSQL Backup] Sucesso: ${backupFile} (${duration}ms)`);
        process.exit(0);
    } catch (err) {
        console.error(`❌ [libSQL Backup] FALHA CRÍTICA:`, err.message);
        process.exit(1);
    }
}

run();
