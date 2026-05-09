const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const playerStateService = require("./playerStateService");
const inventoryService = require("./inventoryService");
const { getIO } = require("../socketHandler");
const { HEIST_TYPES, GUARDIAN_TYPES, DAILY_SPECIAL, ITEM_LOOT_POOL, REWARDS } = require("../utils/contractConstants");

class ContractService {
  /**
   * Renegado: Realiza um roubo.
   */
  async performHeist(userId, heistId) {
    const LOCK_KEY = `lock:contract:heist:${userId}`;
    const hasLock = await redisClient.setNXAsync(LOCK_KEY, "1", 3000);
    if (!hasLock) throw new Error("Aguarde o processamento da operação anterior.");

    try {
      let heist = HEIST_TYPES.find(h => h.id === heistId);
      let isDaily = false;

      if (heistId === DAILY_SPECIAL.id) {
        heist = DAILY_SPECIAL;
        isDaily = true;
      }

      if (!heist) throw new Error("Roubo inválido.");

      const state = await playerStateService.getPlayerState(userId);
      if (!state) throw new Error("Jogador não encontrado.");

      if (state.level < heist.level) throw new Error(`Nível insuficiente. Requer nível ${heist.level}.`);
      if (state.action_points < heist.costPA) throw new Error("PA insuficiente.");
      if (state.energy < heist.costEnergy) throw new Error("Energia insuficiente.");

      if (isDaily) {
        const lastDaily = state.last_daily_special_at ? new Date(state.last_daily_special_at) : null;
        const now = new Date();
        if (lastDaily && lastDaily.toDateString() === now.toDateString()) {
          throw new Error("Você já realizou o Golpe de Mestre hoje.");
        }
      }

      // Calcular ganhos
      const moneyGained = REWARDS.money(heist.money[0], heist.money[1]);
      const xpGained = REWARDS.xp(heist.xp[0], heist.xp[1]);
      
      const updates = {
        action_points: -heist.costPA,
        energy: -heist.costEnergy,
        money: moneyGained,
        total_xp: xpGained,
        corruption: Math.floor(heist.level * 2)
      };

      if (isDaily) {
        updates.last_daily_special_at = new Date().toISOString();
      }

      // Ganho de Atributos
      const attributes = ['attack', 'defense', 'focus', 'intimidation', 'discipline'];
      const attrGained = [];
      attributes.forEach(attr => {
        const gain = REWARDS.attr(heist.attrChance);
        if (gain > 0) {
          updates[attr] = (updates[attr] || 0) + gain;
          attrGained.push({ attr, gain });
        }
      });

      // Itens (Farming)
      const lootGained = [];
      if (Math.random() < heist.lootChance) {
        const randomItem = ITEM_LOOT_POOL[Math.floor(Math.random() * ITEM_LOOT_POOL.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        await inventoryService.addItem(userId, randomItem, qty);
        lootGained.push({ code: randomItem, quantity: qty });
      }

      const newState = await playerStateService.updatePlayerState(userId, updates);

      // Registrar atividade para interceptação (5 minutos)
      await redisClient.setAsync(`heist_activity:${userId}`, JSON.stringify({
        username: state.username,
        heistName: heist.name,
        loot: lootGained
      }), "EX", 300);

      const message = `Sucesso! Você completou ${heist.name}. Ganhou $${moneyGained.toLocaleString()} e ${xpGained} XP.`;
      
      await this.logEvent({
        user_id: userId,
        username: state.username,
        faction: 'gangsters',
        event_type: 'heist_success',
        message: `${state.username} realizou ${heist.name} e levou $${moneyGained.toLocaleString()}!`,
        territory_name: 'Metrópole'
      });

      return {
        message,
        moneyGained,
        xpGained,
        attrGained,
        lootGained,
        player: newState
      };
    } finally {
      await redisClient.delAsync(LOCK_KEY);
    }
  }

  /**
   * Guardião: Realiza um serviço.
   */
  async performGuardianTask(userId, taskId) {
    const task = GUARDIAN_TYPES.find(t => t.id === taskId);
    if (!task) throw new Error("Tarefa inválida.");

    const state = await playerStateService.getPlayerState(userId);
    if (state.level < task.level) throw new Error(`Nível insuficiente. Requer nível ${task.level}.`);
    if (state.action_points < task.costPA) throw new Error("PA insuficiente.");
    if (state.energy < task.costEnergy) throw new Error("Energia insuficiente.");

    const moneyGained = REWARDS.money(task.salary[0], task.salary[1]);
    const meritGained = REWARDS.xp(task.merit[0], task.merit[1]);

    const updates = {
      action_points: -task.costPA,
      energy: -task.costEnergy,
      money: moneyGained,
      merit: meritGained
    };

    // Chance de Interceptação Automática
    let interception = null;
    if (Math.random() < task.interceptChance) {
      const keys = await redisClient.keysAsync("heist_activity:*");
      const filteredKeys = keys.filter(k => k !== `heist_activity:${userId}`);
      
      if (filteredKeys.length > 0) {
        const targetKey = filteredKeys[Math.floor(Math.random() * filteredKeys.length)];
        const targetId = targetKey.split(":")[1];
        const activityRaw = await redisClient.getAsync(targetKey);
        
        if (activityRaw) {
          const activity = JSON.parse(activityRaw);
          
          // Gerar loot interceptado (uma parte do que o renegado pegou ou itens aleatórios)
          const interceptedItems = [
            { code: ITEM_LOOT_POOL[Math.floor(Math.random() * ITEM_LOOT_POOL.length)], quantity: Math.floor(Math.random() * 2) + 1 }
          ];

          interception = {
            targetId,
            targetName: activity.username,
            heistName: activity.heistName,
            items: interceptedItems
          };

          // Armazenar na ficha do guardião
          updates.pending_interception = interception;

          // Notificar renegado
          const io = getIO();
          if (io) {
            io.emit(`player:${targetId}:notification`, {
              type: 'intercepted',
              message: `Você foi interceptado pelo Guardião ${state.username} durante ${activity.heistName}!`
            });
          }

          // Remover rastro
          await redisClient.delAsync(targetKey);
        }
      }
    }

    const newState = await playerStateService.updatePlayerState(userId, updates);

    await this.logEvent({
      user_id: userId,
      username: state.username,
      faction: 'guardas',
      event_type: 'guardian_service',
      message: `O Guardião ${state.username} completou ${task.name}.`,
      territory_name: 'Metrópole'
    });

    return {
      message: `Tarefa '${task.name}' concluída. Recebido $${moneyGained.toLocaleString()} e ${meritGained} de Mérito.`,
      moneyGained,
      meritGained,
      interception,
      player: newState
    };
  }

  /**
   * Guardião: Resolve a interceptação (Vender ou Corregedoria)
   */
  async resolveInterception(userId, action) {
    const state = await playerStateService.getPlayerState(userId);
    if (!state.pending_interception) throw new Error("Nenhuma interceptação pendente.");

    const interception = state.pending_interception;
    const updates = { pending_interception: null };
    let message = "";

    if (action === 'sell') {
      // Vender: Ganha dinheiro mas aumenta corrupção e perde mérito
      const value = 5000 * interception.items.length; // Valor fixo por lote por enquanto
      updates.money = value;
      updates.corruption = 50;
      updates.merit = -100;
      message = `Você vendeu os itens confiscados no mercado negro por $${value.toLocaleString()}. Sua conduta foi reportada internamente.`;
    } else {
      // Corregedoria: Ganha Mérito e XP bônus
      updates.merit = 500;
      updates.total_xp = 2000;
      message = `Você entregou os itens à Corregedoria. Recebeu 500 de Mérito e 2000 XP de bônus por sua integridade.`;
    }

    const newState = await playerStateService.updatePlayerState(userId, updates);
    return { message, player: newState };
  }

  async getActiveContract(userId) {
    // Mantido por compatibilidade, mas o sistema novo é mais baseado em ações instantâneas
    return null;
  }

  async getDistricts() {
    const { rows } = await query(`SELECT * FROM map_territories`);
    return rows;
  }

  async logEvent(data) {
    await query(
      `INSERT INTO contract_logs (user_id, username, faction, event_type, message, territory_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.user_id, data.username, data.faction, data.event_type, data.message, data.territory_name]
    );
    
    const io = getIO();
    if (io) {
      io.emit("contract:log", {
        ...data,
        created_at: new Date().toISOString()
      });
    }
  }

  async getLogs() {
    const { rows } = await query(
      `SELECT * FROM contract_logs ORDER BY created_at DESC LIMIT 20`
    );
    return rows;
  }
}

module.exports = new ContractService();
