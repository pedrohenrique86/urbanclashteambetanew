const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const playerStateService = require("./playerStateService");
const inventoryService = require("./inventoryService");
const logService = require("./logService");
const actionLogService = require("./actionLogService");
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

      // SÊNIOR: Ganho de Atributos OBRIGATÓRIO
      const attrGained = [];
      
      // Atributos Base (0.25 a 1.25)
      ['attack', 'focus'].forEach(attr => {
        const gain = parseFloat((Math.random() * (1.25 - 0.25) + 0.25).toFixed(2));
        updates[attr] = (updates[attr] || 0) + gain;
        attrGained.push({ attr, gain });
      });

      // SORTE -> INSTINTO (INS): Ganho Micro (0.01 a 0.20)
      const instinctGain = parseFloat((Math.random() * (0.20 - 0.01) + 0.01).toFixed(2));
      updates.luck = (updates.luck || 0) + instinctGain;
      attrGained.push({ attr: 'instinct', gain: instinctGain });

      const lootGained = [];
      if (Math.random() < heist.lootChance) {
        const randomItem = SPECIAL_ITEMS_POOL[Math.floor(Math.random() * SPECIAL_ITEMS_POOL.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        await inventoryService.addItem(userId, randomItem, qty);
        lootGained.push({ code: randomItem, quantity: qty });
      }

      const newState = await playerStateService.updatePlayerState(userId, updates);

      // Registrar atividade para interceptação (5 minutos)
      // SÊNIOR: Se for Golpe de Mestre, o sinal é "FORTE" (dura mais e é prioritário)
      const activityData = {
        username: state.username,
        heistId: heist.id,
        heistName: heist.name,
        loot: lootGained,
        isMaster: isDaily,
        renegadeStats: {
          defense: newState.defense,
          luck: newState.luck,
          focus: newState.focus
        }
      };

      await redisClient.setAsync(`heist_activity:${userId}`, JSON.stringify(activityData), "EX", isDaily ? 600 : 300);

      // BROADCAST: Alerta para Guardiões se for Golpe de Mestre
      if (isDaily) {
        const sseService = require("./sseService");
        sseService.broadcast("player:status:alert", {
          type: "MASTER_HEIST_IN_PROGRESS",
          message: `ALERTA NÍVEL 5: Golpe de Mestre detectado! Guardião, caça liberada para interceptar ${state.username}.`
        });
      }

      const message = `Sucesso! Você completou ${heist.name}. Ganhou $${moneyGained.toLocaleString()} e ${xpGained} XP.`;
      
      const isMajor = moneyGained > 50000 || isDaily;
      await logService.addLog({
        user_id: userId,
        username: state.username,
        faction: 'gangsters',
        event_type: 'heist_success',
        message: `${state.username} realizou ${heist.name} e levou $${moneyGained.toLocaleString()}!`,
        territory_name: 'Metrópole',
        is_major: isMajor
      });

      // Log Individual (Network Logs)
      await actionLogService.log(userId, 'heist', 'contract', heist.id, {
        money_gain: moneyGained,
        xp_gain: xpGained,
        stats_gained: attrGained.reduce((acc, a) => ({ ...acc, [a.attr]: a.gain }), {}),
        loot: lootGained,
        is_master: isDaily
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
      const xpGained = REWARDS.xp(task.xp[0], task.xp[1]);

      const lootGained = [];
      if (Math.random() < task.lootChance) {
        const randomItem = SPECIAL_ITEMS_POOL[Math.floor(Math.random() * SPECIAL_ITEMS_POOL.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        await inventoryService.addItem(userId, randomItem, qty);
        lootGained.push({ code: randomItem, quantity: qty });
      }

      const updates = {
        action_points: -task.costPA,
        energy: -task.costEnergy,
        money: moneyGained,
        merit: meritGained,
        total_xp: xpGained
      };

      // Ganho de Atributos OBRIGATÓRIO
      const attrGained = [];
      
      // Atributos Base (0.25 a 1.25)
      ['defense', 'focus'].forEach(attr => {
        const gain = parseFloat((Math.random() * (1.25 - 0.25) + 0.25).toFixed(2));
        updates[attr] = (updates[attr] || 0) + gain;
        attrGained.push({ attr, gain });
      });

      // SORTE -> INSTINTO (INS): Ganho Micro (0.01 a 0.20)
      const instinctGain = parseFloat((Math.random() * (0.20 - 0.01) + 0.01).toFixed(2));
      updates.luck = (updates.luck || 0) + instinctGain;
      attrGained.push({ attr: 'instinct', gain: instinctGain });

      let interception = null;
      if (Math.random() < task.interceptChance) {
        const keys = await redisClient.keysAsync("heist_activity:*");
        const filteredKeys = keys.filter(k => k !== `heist_activity:${userId}`);
        
        if (filteredKeys.length > 0) {
          const activities = [];
          for (const k of filteredKeys) {
             const raw = await redisClient.getAsync(k);
             if (raw) {
               const parsed = JSON.parse(raw);
               // SÊNIOR: Só intercepta se o roubo for vinculado à tarefa ou for Golpe de Mestre
               if (task.linkedHeists.includes(parsed.heistId) || parsed.isMaster) {
                 activities.push({ key: k, ...parsed });
               }
             }
          }

          const target = activities.find(a => a.isMaster) || activities[Math.floor(Math.random() * activities.length)];
          
          if (target) {
            // SÊNIOR: Probabilidade adicional de encontro (15%) para não ser 1x1 garantido
            // E verificação de "Janela de Simultaneidade" (60 segundos)
            if (Math.random() < 0.15) {
              const gScore = (state.attack * 0.5) + (state.focus * 0.3) + (state.luck * 0.2);
              const rScore = (target.renegadeStats.defense * 0.5) + (target.renegadeStats.luck * 0.3) + (target.renegadeStats.focus * 0.2);
              
              const gFinal = gScore * (0.9 + Math.random() * 0.2);
              const rFinal = rScore * (0.9 + Math.random() * 0.2);

              if (gFinal > rFinal) {
                interception = {
                  targetId: target.key.split(":")[1],
                  targetName: target.username,
                  heistName: target.heistName,
                  items: target.loot.length > 0 ? target.loot : [{ code: SPECIAL_ITEMS_POOL[Math.floor(Math.random() * SPECIAL_ITEMS_POOL.length)], quantity: 1 }]
                };
                updates.pending_interception = interception;
                await redisClient.delAsync(target.key);
              } else {
                console.log(`[Interception] ${state.username} falhou ao capturar ${target.username} (G:${gFinal.toFixed(1)} vs R:${rFinal.toFixed(1)})`);
                await logService.addLog({
                  user_id: userId,
                  username: state.username,
                  faction: 'guardas',
                  event_type: 'interception_fail',
                  message: `O Guardião ${state.username} detectou o rastro de um crime, mas o suspeito conseguiu escapar da abordagem!`,
                  territory_name: 'Metrópole'
                });
              }
            }
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

      // Log Individual (Network Logs)
      await actionLogService.log(userId, 'guardian_task', 'contract', task.id, {
        money_gain: moneyGained,
        merit_gain: meritGained,
        xp_gain: xpGained,
        stats_gained: attrGained.reduce((acc, a) => ({ ...acc, [a.attr]: a.gain }), {}),
        loot: lootGained,
        interception: !!interception
      });

      return {
        message: `Tarefa concluída. Recebido $${moneyGained.toLocaleString()}, ${meritGained} Mérito e ${xpGained} XP.`,
        moneyGained,
        meritGained,
        attrGained,
        lootGained,
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
