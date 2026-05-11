const { query } = require('../backend/config/database');
const playerStateService = require('../backend/services/playerStateService');
const redisClient = require('../backend/config/redisClient');

async function repopulate() {
    try {
        console.log("Repopulating rankings...");
        const { rows } = await query(
            `SELECT user_id, level, total_xp, faction FROM user_profiles ORDER BY level DESC, total_xp DESC LIMIT 2000`
        );
        
        console.log(`Found ${rows.length} players.`);
        
        for (const row of rows) {
            await playerStateService._updateRankingScore(row.user_id, row);
        }
        
        console.log("Ranking sets repopulated successfully.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

repopulate();
