const redisClient = require('./backend/config/redisClient');
const gameLogic = require('./backend/utils/gameLogic');
const playerStateService = require('./backend/services/playerStateService');
const trainingService = require('./backend/services/trainingService');
const { query } = require('./backend/config/database');
const crypto = require('crypto');

async function testUpdate() {
  await redisClient.redisReadyPromise;
  
  const uuid = crypto.randomUUID();
  console.log('UUID:', uuid);
  
  await query('INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [uuid, 'offlinetest3', `offline-${uuid}@test.com`, 'abc']);
  await query('INSERT INTO user_profiles (user_id, total_xp, level, action_points, money, energy, active_training_type, training_ends_at) VALUES ($1, 0, 1, 1000, 1000, 100, $2, NOW() + interval \'5 seconds\') ON CONFLICT (user_id) DO UPDATE SET active_training_type=$2, total_xp=0, level=1, training_ends_at=NOW() + interval \'5 seconds\'', [uuid, 'pequeno']);
  
  await playerStateService.deletePlayerState(uuid);
  const state = await playerStateService.getPlayerState(uuid);
  console.log('INIT STATE:', state.level, state.total_xp, state.training_ends_at);
  
  const updates = {
      attack           : 1,
      defense          : 1,
      focus            : 3,
      total_xp         : 120,
      daily_training_count: 1,
      training_ends_at : "",
      active_training_type: "",
  };
  
  console.log('UPDATING STATE...');
  const newState = await playerStateService.updatePlayerState(uuid, updates);
  console.log('NEW STATE LEVEL/XP:', newState.level, newState.total_xp);
  
  process.exit(0);
}
testUpdate();
