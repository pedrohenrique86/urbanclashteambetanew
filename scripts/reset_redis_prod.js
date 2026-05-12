/**
 * reset_redis_prod.js
 * Script utilitário para resetar o cache de produção via túnel Tailscale.
 */
const path = require('path');
// SÊNIOR: Resolvemos o módulo do Redis a partir da pasta backend
const redisPath = path.resolve(__dirname, '../backend/node_modules/redis');
const { createClient } = require(redisPath);

async function resetAll() {
    const dbs = [0, 1]; // 0 = Dev, 1 = Prod
    
    for (const db of dbs) {
        const client = createClient({
            url: `redis://127.0.0.1:6380/${db}`
        });

        client.on('error', () => {});

        try {
            await client.connect();
            const label = db === 0 ? 'DESENVOLVIMENTO' : 'PRODUÇÃO';
            console.log(`\x1b[35m[Redis-${label}]\x1b[0m 📡 Conectado...`);
            
            await client.flushDb();
            console.log(`\x1b[32m[Redis-${label}]\x1b[0m ✅ Cache (DB ${db}) resetado!`);
            
            await client.disconnect();
        } catch (err) {
            const label = db === 0 ? 'DEV' : 'PROD';
            console.error(`\x1b[31m[Redis-${label}] ❌ Erro:\x1b[0m`, err.message);
        }
    }
}

resetAll();
