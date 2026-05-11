
const { query } = require('./backend/config/database');
const redisClient = require('./backend/config/redisClient');
const playerStateService = require('./backend/services/playerStateService');
const gameLogic = require('./backend/utils/gameLogic');

async function test() {
  console.log('Aguardando Redis...');
  await redisClient.redisReadyPromise;
  console.log('Redis pronto:', redisClient.client.isReady);

  const userId = '33370224-6b8a-40dc-b9c5-fe4d0653f752';
  console.log('--- Testando getPlayerState ---');
  try {
    const profile = await playerStateService.getPlayerState(userId);
    console.log('Profile retrieved:', profile ? 'YES' : 'NULL');
    
    if (profile) {
      console.log('--- Testando convertProfileData logic ---');
      const level    = parseInt(profile.level, 10) || 1;
      const total_xp = parseInt(profile.total_xp || 0, 10);
      const xpLevelPure = gameLogic.calculateLevelFromXp(total_xp);
      const xpStatus    = gameLogic.deriveXpStatus(total_xp, xpLevelPure);
      
      console.log('Level:', level);
      console.log('Total XP:', total_xp);
      console.log('XpLevelPure:', xpLevelPure);
      console.log('XpStatus:', xpStatus);

      const converted = {
        ...profile,
        id: profile.user_id || profile.id,
        username: profile.username || profile.display_name,
        level,
        total_xp,
        current_xp: xpStatus.currentXp,
        xp_required: xpStatus.xpRequired,
        crit_chance_pct : gameLogic.calcCritChance(profile),
        crit_damage_mult: gameLogic.calcCritDamageMultiplier(profile),
      };
      console.log('Converted successfully');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

test();
