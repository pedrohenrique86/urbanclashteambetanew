const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const playerStateService = require("./playerStateService");
const inventoryService = require("./inventoryService");
const logService = require("./logService");
const { HEIST_TYPES, GUARDIAN_TYPES, DAILY_SPECIAL, SPECIAL_ITEMS_POOL, REWARDS } = require("../utils/contractConstants");

/**
 * contractService.js
 * 
 * Sistema de Contratos (Roubos e Tarefas) otimizado para escala massiva.
 */
class ContractService {
  /**
   * Renegado: Realiza um roubo.
   */
  async performHeist(userId, heistId) {
    if (!redisClient.client.isReady) throw new Error("Sistema de cache indisponível.");

    const LOCK_KEY = `lock:contract:heist:${userId}`;
    const hasLock = await redisClient.setNXAsync(LOCK_KEY, "1", 3000);
    if (!hasLock) throw new Error("Aguarde o processamento da operação anterior (Cooldown).");

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

      const moneyGained = REWARDS.money(heist.money[0], heist.money[1]);
      const xpGained = REWARDS.xp(heist.xp[0], heist.xp[1]);
      
      const updates = {
        action_points: -heist.costPA,
        energy: -heist.costEnergy,
        money: moneyGained,
        total_xp: xpGained,
        corruption: Math.floor(heist.level * 2)
      };

      if (isDaily) updates.last_daily_special_at = new Date().toISOString();

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

      const lootGained = [];
      if (Math.random() < heist.lootChance) {
        const randomItem = SPECIAL_ITEMS_POOL[Math.floor(Math.random() * SPECIAL_ITEMS_POOL.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        await inventoryService.addItem(userId, randomItem, qty);
        lootGained.push({ code: randomItem, quantity: qty });
      }

      const newState = await playerStateService.updatePlayerState(userId, updates);

      // Registrar atividade para interceptação
      await redisClient.setAsync(`heist_activity:${userId}`, JSON.stringify({
        username: state.username,
        heistName: heist.name,
        loot: lootGained
      }), "EX", 300);

      // SÊNIOR: Log de Alta Performance via LogService (Batch Dirty)
      const isMajor = moneyGained > 50000 || isDaily; // Exemplo de regra para major
      await logService.addLog({
        user_id: userId,
        username: state.username,
        faction: 'gangsters',
        event_type: 'heist_success',
        message: `${state.username} realizou ${heist.name} e levou $${moneyGained.toLocaleString()}!`,
        territory_name: 'Metrópole',
        is_major: isMajor
      });

      return {
        message: `Sucesso! Ganhou $${moneyGained.toLocaleString()} e ${xpGained} XP.`,
        moneyGained,
        xpGained,
        attrGained,
        lootGained,
        player: newState
      };
    } finally {
      // Lock expira naturalmente
    }
  }

  /**
   * Guardião: Realiza uma tarefa.
   */
  async performGuardianTask(userId, taskId) {
    if (!redisClient.client.isReady) throw new Error("Sistema de cache indisponível.");

    const LOCK_KEY = `lock:contract:task:${userId}`;
    const hasLock = await redisClient.setNXAsync(LOCK_KEY, "1", 3000);
    if (!hasLock) throw new Error("Aguarde o processamento da operação anterior.");

    try {
      const task = GUARDIAN_TYPES.find(t => t.id === taskId);
      if (!task) throw new Error("Tarefa inválida.");

      const state = await playerStateService.getPlayerState(userId);
      if (state.level < task.level) throw new Error(`Nível insuficiente.`);
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

      let interception = null;
      if (Math.random() < task.interceptChance) {
        const keys = await redisClient.keysAsync("heist_activity:*");
        const filteredKeys = keys.filter(k => k !== `heist_activity:${userId}`);
        
        if (filteredKeys.length > 0) {
          const targetKey = filteredKeys[Math.floor(Math.random() * filteredKeys.length)];
          const activityRaw = await redisClient.getAsync(targetKey);
          
          if (activityRaw) {
            const activity = JSON.parse(activityRaw);
            interception = {
              targetId: targetKey.split(":")[1],
              targetName: activity.username,
              heistName: activity.heistName,
              items: [{ code: SPECIAL_ITEMS_POOL[Math.floor(Math.random() * SPECIAL_ITEMS_POOL.length)], quantity: 1 }]
            };
            updates.pending_interception = interception;
            await redisClient.delAsync(targetKey);
          }
        }
      }

      const newState = await playerStateService.updatePlayerState(userId, updates);

      // Log de Alta Performance
      await logService.addLog({
        user_id: userId,
        username: state.username,
        faction: 'guardas',
        event_type: 'guardian_service',
        message: `O Guardião ${state.username} completou ${task.name}.`,
        territory_name: 'Metrópole',
        is_major: true
      });

      return {
        message: `Tarefa concluída. Recebido $${moneyGained.toLocaleString()} e ${meritGained} Mérito.`,
        moneyGained,
        meritGained,
        interception,
        player: newState
      };
    } finally {
      // Lock
    }
  }

  async resolveInterception(userId, action) {
    const state = await playerStateService.getPlayerState(userId);
    if (!state.pending_interception) throw new Error("Nenhuma interceptação pendente.");

    const interception = state.pending_interception;
    const updates = { pending_interception: null };
    let message = "";

    if (action === 'sell') {
      const value = 5000 * interception.items.length;
      updates.money = value;
      updates.corruption = 50;
      updates.merit = -100;
      message = `Confisco vendido por $${value.toLocaleString()}.`;
    } else {
      updates.merit = 500;
      updates.total_xp = 2000;
      message = `Confisco entregue. Recebeu Mérito e XP bônus.`;
    }

    const newState = await playerStateService.updatePlayerState(userId, updates);
    return { message, player: newState };
  }

  /**
   * SÊNIOR: Cache de Territórios (Redis).
   * Reduz acessos repetitivos ao banco para dados estáticos do mapa.
   */
  async getDistricts() {
    const CACHE_KEY = "map:districts";
    const cached = await redisClient.getAsync(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const { rows } = await query(`SELECT * FROM map_territories`);
    await redisClient.setAsync(CACHE_KEY, JSON.stringify(rows), "EX", 3600); // 1 hora
    return rows;
  }

  async getLogs(onlyMajor = false) {
    // SÊNIOR: Para os logs recentes, sempre buscamos no banco (onde são persistidos pelo LogService).
    // O LogService garante que o banco não seja sobrecarregado por escritas.
    const where = onlyMajor ? 'WHERE is_major = true' : '';
    const { rows } = await query(
      `SELECT * FROM contract_logs ${where} ORDER BY created_at DESC LIMIT 20`
    );
    return rows;
  }
}

module.exports = new ContractService();
