const { query } = require('./backend/config/database');
const redisClient = require('./backend/config/redisClient');

async function fixXP() {
  try {
    console.log("Iniciando correção de XP máximo para 70...");

    // 1. Atualizar daily_card_pools
    const updatePools = await query(`
      UPDATE daily_card_pools 
      SET reward_value = 70 
      WHERE reward_type = 'xp' AND reward_value > 70
      RETURNING *;
    `);
    console.log(`Atualizados ${updatePools.rowCount} pools de cartas de XP.`);

    // 2. Atualizar player_daily_cards ativos (JSONB)
    const activeCards = await query(`
      SELECT id, card_option_1, card_option_2, card_option_3 
      FROM player_daily_cards 
      WHERE expires_at > CURRENT_TIMESTAMP AND chosen_option IS NULL
    `);

    let updatedCards = 0;
    for (const row of activeCards.rows) {
      let changed = false;
      const opts = [row.card_option_1, row.card_option_2, row.card_option_3];
      
      for (let i = 0; i < 3; i++) {
        if (opts[i] && opts[i].reward_type === 'xp' && opts[i].reward_value > 70) {
          opts[i].reward_value = 70;
          changed = true;
        }
      }

      if (changed) {
        await query(`
          UPDATE player_daily_cards 
          SET card_option_1 = $1, card_option_2 = $2, card_option_3 = $3
          WHERE id = $4
        `, [opts[0], opts[1], opts[2], row.id]);
        updatedCards++;
      }
    }
    console.log(`Atualizados ${updatedCards} cartas diárias ativas de jogadores.`);

    // 3. Limpar cache do pool de cartas
    await redisClient.delAsync("daily_card_pool_active");
    console.log("Cache do pool limpo.");

    console.log("Correção de XP finalizada com sucesso.");
    process.exit(0);
  } catch (e) {
    console.error("Erro:", e);
    process.exit(1);
  }
}

setTimeout(fixXP, 1500);
