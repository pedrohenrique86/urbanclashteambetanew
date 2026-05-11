const redisClient = require('../backend/config/redisClient');
const { RANKING_ALL, RANKING_RENEGADOS, RANKING_GUARDIOES } = require('../backend/services/playerStateConstants');

async function check() {
    try {
        await redisClient.redisReadyPromise;
        
        const all = await redisClient.zCardAsync(RANKING_ALL);
        const renegados = await redisClient.zCardAsync(RANKING_RENEGADOS);
        const guardioes = await redisClient.zCardAsync(RANKING_GUARDIOES);
        
        console.log(`RANKING_ALL: ${all}`);
        console.log(`RANKING_RENEGADOS: ${renegados}`);
        console.log(`RANKING_GUARDIOES: ${guardioes}`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
