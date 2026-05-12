/**
 * reset_redis_prod.js
 * Script inteligente para reset de cache (Soft vs Hard)
 */
const path = require('path');
const redisPath = path.resolve(__dirname, '../backend/node_modules/redis');
const { createClient } = require(redisPath);

const mode = process.argv.includes('--hard') ? 'hard' : 'soft';

async function resetAll() {
    const dbs = [0, 1]; // 0 = Dev, 1 = Prod
    
    for (const db of dbs) {
        const client = createClient({ url: `redis://127.0.0.1:6380/${db}` });
        client.on('error', () => {});

        try {
            await client.connect();
            const label = db === 0 ? 'DESENVOLVIMENTO' : 'PRODUÇÃO';
            console.log(`\x1b[35m[Redis-${label}]\x1b[0m 📡 Conectado (Modo: ${mode.toUpperCase()})...`);
            
            if (mode === 'hard') {
                await client.flushDb();
                console.log(`\x1b[31m[Redis-${label}]\x1b[0m 🔥 Hard Reset concluído (Tudo apagado).`);
            } else {
                // SOFT RESET: Limpa apenas o necessário para a UI, preservando os jogadores
                const keysToClear = [
                    'cache:public_logs_stream',
                    'cache:contract_logs:major',
                    'global:heist_activity'
                ];
                
                // Limpa chaves específicas
                for (const key of keysToClear) {
                    await client.del(key);
                }

                // Limpa padrões (Snapshots de combate e Rankings)
                const patterns = ['combat:snapshot:*', 'cache:ranking:*'];
                for (const pattern of patterns) {
                    const keys = await client.keys(pattern);
                    if (keys.length > 0) await client.del(keys);
                }

                console.log(`\x1b[32m[Redis-${label}]\x1b[0m ✨ Soft Reset concluído (Jogadores preservados).`);
            }
            
            await client.disconnect();
        } catch (err) {
            const label = db === 0 ? 'DEV' : 'PROD';
            console.error(`\x1b[31m[Redis-${label}] ❌ Erro:\x1b[0m`, err.message);
        }
    }
}

resetAll();
