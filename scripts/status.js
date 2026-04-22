const path = require('path');
// Carrega o .env da pasta backend
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const { query, connectDB } = require('../backend/config/database');
const playerStateService = require('../backend/services/playerStateService');
const redisClient = require('../backend/config/redisClient');

async function run() {
    const [,, username, status, duration] = process.argv;

    if (!username || !status) {
        console.log("\n🚀 URBAN CLASH - FERRAMENTA DE ADMINISTRAÇÃO DE STATUS");
        console.log("--------------------------------------------------");
        console.log("Uso: node scripts/status.js <username> <status> [duração_segundos]");
        console.log("\nStatus válidos: Operacional, Isolamento, Recondicionamento, Aprimoramento");
        console.log("\nExemplos:");
        console.log("  node scripts/status.js pedro Operacional");
        console.log("  node scripts/status.js pedro Isolamento 600");
        console.log("--------------------------------------------------\n");
        process.exit(1);
    }

    try {
        console.log(`\n⏳ Conectando aos sistemas centrais...`);
        await connectDB();
        
        // 1. Resolve Username para ID
        const userRes = await query("SELECT id FROM users WHERE username = $1", [username]);
        if (userRes.rows.length === 0) {
            console.error(`\n❌ ERRO: Usuário '${username}' não encontrado no banco de dados.`);
            process.exit(1);
        }
        
        const userId = userRes.rows[0].id;
        const durat = duration ? parseInt(duration) : null;
        
        // 2. Executa a lógica de status (Redis + Postgres + Logs)
        console.log(`🎯 Atualizando status de '${username}' para '${status}'...`);
        await playerStateService.setPlayerStatus(userId, status, durat);
        
        console.log(`\n✅ SUCESSO ABSOLUTO!`);
        console.log(`👤 Jogador: ${username}`);
        console.log(`🆔 ID: ${userId}`);
        console.log(`📡 Novo Status: ${status.toUpperCase()}`);
        if (durat) console.log(`⏱️ Duração: ${durat} segundos`);
        
        console.log(`\n💡 DICA: O navegador deve atualizar em tempo real via SSE.`);
        console.log(`--------------------------------------------------\n`);
        
        process.exit(0);
    } catch (err) {
        console.error("\n❌ ERRO CRÍTICO NO SCRIPT:");
        console.error(err.message);
        process.exit(1);
    }
}

run();
