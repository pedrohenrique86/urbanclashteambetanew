const { query, transaction } = require("../config/database");
const playerStateService = require("./playerStateService");
const redisClient = require("../config/redisClient");

class DailyCardService {
  /**
   * Obtém as opções de cartas do dia para o usuário.
   * Se ainda não existirem para hoje, gera 3 novas opções baseadas no pool.
   */
  async getDailyOptions(userId) {
    const cacheKey = `daily_cards:${userId}`;
    
    // 1. Tentar buscar do Cache (Redis) para evitar query no BD Neon
    const cached = await redisClient.getAsync(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. Verificar se o jogador já tem sorteio ativo (não expirado) no BD
    const existing = await query(
      `SELECT * FROM player_daily_cards 
       WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
       ORDER BY presented_at DESC LIMIT 1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      const data = existing.rows[0];
      // Salvar no cache antes de retornar
      const ttl = Math.max(0, Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000));
      if (ttl > 0) await redisClient.setAsync(cacheKey, JSON.stringify(data), "EX", ttl);
      return data;
    }

    // 2. Se não existir, gera 3 opções aleatórias do pool
    const pool = await this._getPool();
    if (pool.length < 3) {
      // Se o pool estiver vazio, cria itens básicos de emergência (fallback)
      await this._seedBasicPool();
    }

    const options = this._drawFromPool(await this._getPool(), 3);
    
    // 3. Salvar as opções geradas com validade de 24 horas exatas
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const insertResult = await query(
      `INSERT INTO player_daily_cards (user_id, expires_at, card_option_1, card_option_2, card_option_3)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, expiresAt, options[0], options[1], options[2]]
    );

    const result = insertResult.rows[0];

    // 4. Salvar no cache (24h)
    await redisClient.setAsync(cacheKey, JSON.stringify(result), "EX", 24 * 60 * 60);

    return result;
  }

  /**
   * Processa a escolha de uma das 3 cartas.
   */
  async chooseCard(userId, optionIndex) {
    if (![1, 2, 3].includes(optionIndex)) {
      throw new Error("Opção de carta inválida.");
    }

    return await transaction(async (client) => {
      // 1. Buscar o sorteio ativo
      const dailyCardResult = await client.query(
        `SELECT * FROM player_daily_cards 
         WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
         ORDER BY presented_at DESC LIMIT 1`,
        [userId]
      );

      if (dailyCardResult.rows.length === 0) {
        throw new Error("Nenhum sorteio de cartas encontrado para hoje.");
      }

      const dailyCard = dailyCardResult.rows[0];

      if (dailyCard.chosen_option) {
        throw new Error("Você já escolheu sua carta hoje.");
      }

      // 2. Pegar a opção escolhida
      const optionKey = `card_option_${optionIndex}`;
      const chosenCard = dailyCard[optionKey];

      if (!chosenCard) {
        throw new Error("Opção selecionada não contém dados.");
      }

      // 3. Marcar como escolhida
      await client.query(
        `UPDATE player_daily_cards SET chosen_option = $1, chosen_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [optionIndex, dailyCard.id]
      );

      // 4. Registrar a recompensa
      const rewardResult = await client.query(
        `INSERT INTO card_rewards (daily_card_id, user_id, reward_type, item_id, reward_value, rarity, delivered, delivered_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP)
         RETURNING *`,
        [dailyCard.id, userId, chosenCard.reward_type, chosenCard.item_id, chosenCard.reward_value, chosenCard.rarity]
      );

      // 5. Aplicar a recompensa no estado do jogador
      await this._applyReward(userId, chosenCard, client);

      // 6. Atualizar cache para refletir que a carta foi escolhida
      const cacheKey = `daily_cards:${userId}`;
      const updatedDailyCard = { ...dailyCard, chosen_option: optionIndex, chosen_at: new Date().toISOString() };
      const ttl = Math.max(0, Math.floor((new Date(dailyCard.expires_at).getTime() - Date.now()) / 1000));
      if (ttl > 0) await redisClient.setAsync(cacheKey, JSON.stringify(updatedDailyCard), "EX", ttl);

      return {
        card: chosenCard,
        reward: rewardResult.rows[0]
      };
    });
  }

  // ─── Métodos Privados ──────────────────────────────────────────────────────────

  async _getPool() {
    const cacheKey = "daily_card_pool_active";
    const cached = await redisClient.getAsync(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await query("SELECT * FROM daily_card_pools WHERE is_active = TRUE");
    const data = result.rows;
    
    if (data.length > 0) {
      await redisClient.setAsync(cacheKey, JSON.stringify(data), "EX", 3600); // 1 hora de cache
    }
    
    return data;
  }

  _drawFromPool(pool, count) {
    const selected = [];
    const poolCopy = [...pool];

    for (let i = 0; i < count; i++) {
      if (poolCopy.length === 0) break;

      const totalWeight = poolCopy.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.floor(Math.random() * totalWeight);
      
      for (let j = 0; j < poolCopy.length; j++) {
        random -= poolCopy[j].weight;
        if (random < 0) {
          selected.push(poolCopy[j]);
          // Para garantir 3 opções diferentes, podemos remover do pool temporário
          poolCopy.splice(j, 1);
          break;
        }
      }
    }
    return selected;
  }

  async _applyReward(userId, card, client) {
    const updates = {};

    switch (card.reward_type) {
      case 'money':
        updates.money = card.reward_value;
        break;
      case 'xp':
        // SÊNIOR: Cap de 100 XP para evitar desbalanceamento (Solicitação do Usuário)
        updates.total_xp = Math.min(100, card.reward_value);
        break;
      case 'action_points':
        updates.action_points = card.reward_value;
        break;
      case 'premium_coins':
        updates.premium_coins = card.reward_value;
        break;
      case 'item':
        // Lógica de inventário
        await client.query(
          `INSERT INTO player_inventory (user_id, item_id, quantity, acquired_via)
           VALUES ($1, $2, 1, 'card')`,
          [userId, card.item_id]
        );
        break;
    }

    if (Object.keys(updates).length > 0) {
      await playerStateService.updatePlayerState(userId, updates);
    }
  }

  async _seedBasicPool() {
    console.log("[daily-cards] Populando pool básico de emergência...");
    
    // Busca os chips recém criados
    const chips = await query("SELECT id, name FROM items WHERE type = 'chip'");
    
    const basicCards = [
      { type: 'money', value: 2500, weight: 100, rarity: 'common', name: 'Cache de Créditos' },
      { type: 'money', value: 12000, weight: 30, rarity: 'rare', name: 'Maleta de Luxo' },
      { type: 'xp', value: 100, weight: 100, rarity: 'common', name: 'Dados de Treino' },
      { type: 'action_points', value: 1500, weight: 100, rarity: 'common', name: 'Bateria de PA' }
    ];

    for (const card of basicCards) {
      await query(
        `INSERT INTO daily_card_pools (reward_type, reward_value, weight, rarity)
         VALUES ($1, $2, $3, $4)`,
        [card.type, card.value, card.weight, card.rarity]
      );
    }

    // Adiciona Chips ao pool com peso médio
    for (const chip of chips.rows) {
      await query(
        `INSERT INTO daily_card_pools (reward_type, item_id, weight, rarity)
         VALUES ($1, $2, $3, $4)`,
        ['item', chip.id, 40, 'rare']
      );
    }
  }
}

module.exports = new DailyCardService();
