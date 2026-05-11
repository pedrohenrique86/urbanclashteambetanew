const pss = require('./backend/services/playerStateService');
const userId = '1a88ff6b-8f98-4ff0-a7f4-e80d90e3025d';

async function test() {
  const s1 = await pss.getPlayerState(userId);
  console.log('BEFORE:', JSON.stringify({ xp: s1.total_xp, money: s1.money }));
  
  await pss.updatePlayerState(userId, { total_xp: 100, money: 50 });
  
  const s2 = await pss.getPlayerState(userId);
  console.log('AFTER :', JSON.stringify({ xp: s2.total_xp, money: s2.money }));
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
