const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const playerStateService = require("./playerStateService");
const inventoryService = require("./inventoryService");
const actionLogService = require("./actionLogService");
const { HEIST_TYPES, GUARDIAN_TYPES, DAILY_SPECIAL, SPECIAL_ITEMS_POOL, REWARDS } = require("../utils/contractConstants");
const phraseGenerator = require("../utils/phraseGenerator");

/**
 * contractService.js
 * 
 * Sistema de Contratos (Roubos e Tarefas) otimizado para escala massiva.
 */
class ContractService {
  /**
   * Calcula o Golpe de Mestre dinâmico baseado no nível do usuário.
   * Multiplica os ganhos do melhor roubo disponível por 4x.
   */
  getDynamicDailySpecial(userLevel) {
    const gameLogic = require("../utils/gameLogic");
    const unlockedHeists = HEIST_TYPES.filter(h => h.level <= userLevel);
    const bestHeist = unlockedHeists[unlockedHeists.length - 1] || HEIST_TYPES[0];
    
    const multiplier = 4;
    
    return {
      ...DAILY_SPECIAL,
      level: bestHeist.level, // SÊNIOR: Nível dinâmico baseado no melhor roubo
      costPA: Math.floor(bestHeist.costPA * 1.5), // SÊNIOR: Custo 50% maior que o melhor roubo atual
      costEnergy: Math.floor(bestHeist.costEnergy * 1.5),
      money: [bestHeist.money[0] * multiplier, bestHeist.money[1] * multiplier],
      xp: [bestHeist.xp[0] * multiplier, bestHeist.xp[1] * multiplier]
    };
  }

  /**
   * Renegado: Realiza um roubo.
   */
  async performHeist(userId, heistId) {
    if (!redisClient.client.isReady) throw new Error("Sistema de cache indisponível.");

    const LOCK_KEY = `lock:contract:heist:${userId}`;
    const hasLock = await redisClient.setNXAsync(LOCK_KEY, "1", 3000);
    if (!hasLock) throw new Error("Aguarde o processamento da operação anterior (Cooldown).");

    try {
      const state = await playerStateService.getPlayerState(userId);
      if (!state) throw new Error("Jogador não encontrado.");

      let heist = HEIST_TYPES.find(h => h.id === heistId);
      let isDaily = false;

      if (heistId === DAILY_SPECIAL.id) {
        const dynamicLevel = require("../utils/gameLogic").calculateDynamicLevel(state);
        heist = this.getDynamicDailySpecial(dynamicLevel);
        isDaily = true;
      }

      if (!heist) throw new Error("Roubo inválido.");

      const gameLogic = require("../utils/gameLogic");
      const dynamicLevel = gameLogic.calculateDynamicLevel(state);

      if (dynamicLevel < heist.level) throw new Error(`Nível insuficiente. Requer nível ${heist.level}.`);
      if (state.action_points < heist.costPA) throw new Error("PA insuficiente.");
      if (state.energy < heist.costEnergy) throw new Error("Energia insuficiente.");

      // SÊNIOR: Enforce de balanceamento (Só pode fazer a melhor tarefa do seu nível atual)
      if (!isDaily) {
        const unlockedHeists = HEIST_TYPES.filter(h => h.level <= dynamicLevel);
        const bestHeist = unlockedHeists[unlockedHeists.length - 1];
        if (heist.id !== bestHeist.id) {
          throw new Error(`Operação obsoleta. Para o seu nível, foque em: ${bestHeist.name}.`);
        }
      }

      if (isDaily) {
        const lastDaily = state.last_daily_special_at ? new Date(state.last_daily_special_at) : null;
        const now = new Date();
        if (lastDaily) {
          const diffMs = now.getTime() - lastDaily.getTime();
          const hours24 = 24 * 60 * 60 * 1000;
          if (diffMs < hours24) {
            const remainingMs = hours24 - diffMs;
            const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
            const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            throw new Error(`O Golpe de Mestre estará disponível em ${remainingHours}h ${remainingMinutes}m.`);
          }
        }
      }

      const moneyGained = REWARDS.money(heist.money[0], heist.money[1]);
      const xpGained = REWARDS.xp(heist.xp[0], heist.xp[1]);
      const infamyGained = Math.floor(heist.level * 2);
      
      const updates = {
        action_points: -heist.costPA,
        energy: -heist.costEnergy,
        money: moneyGained,
        total_xp: xpGained,
        corruption: infamyGained
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

      // SORTE -> INSTINTO (INST): Chance de 20% (1 em cada 5)
      let instinctGainText = "";
      if (Math.random() < 0.20) {
        const instinctGain = parseFloat((Math.random() * (0.06 - 0.01) + 0.01).toFixed(2));
        updates.instinct = (updates.instinct || 0) + instinctGain;
        attrGained.push({ attr: 'instinct', gain: instinctGain });
        instinctGainText = ` | +${instinctGain} INST`;
      }

      const lootGained = [];
      if (Math.random() < heist.lootChance) {
        const itemObj = SPECIAL_ITEMS_POOL[Math.floor(Math.random() * SPECIAL_ITEMS_POOL.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        await inventoryService.addItem(userId, itemObj.code, qty);
        lootGained.push({ code: itemObj.code, quantity: qty, rarity: itemObj.rarity });
      }

      const now = Date.now();
      const ACTIVITY_KEY = "global:heist_activity";
      const newState = await playerStateService.updatePlayerState(userId, updates);

      const isMajor = moneyGained > 50000 || isDaily;
      
      // Mensagem Dinâmica (Motor Combinatório) - EXCLUSIVO PARA O FEED PÚBLICO
      const phraseData = {
        target: heist.name,
        money: `$${moneyGained.toLocaleString()}`
      };
      const publicMessage = phraseGenerator.generate('gangsters', { ...phraseData, name: state.username });

      // Toast Simples e Completo para o Jogador
      const attrGains = attrGained.filter(a => a.attr !== 'instinct').map(a => {
        const labels = { attack: 'ATK', defense: 'DEF', focus: 'FOC' };
        return `+${a.gain} ${labels[a.attr] || a.attr.substring(0,3).toUpperCase()}`;
      }).join(" ");

      const lootMsg = lootGained.length > 0 
        ? ` [LOOT: ${lootGained.map(l => `§${l.rarity}:${l.code.replace(/_/g, ' ')}§`).join(", ")}]` 
        : "";

      const message = `SUCESSO! +$${moneyGained.toLocaleString()} | +${xpGained} XP | +${infamyGained} INF | ${attrGains}${instinctGainText}${lootMsg}`;

      // SÊNIOR: Tracking do Maior Ganho do Dia (Ranking de Destaque)
      const DAILY_MAX_KEY = `stats:daily_max:gangsters`;
      const currentMax = await redisClient.getAsync(DAILY_MAX_KEY);
      if (!currentMax || moneyGained > JSON.parse(currentMax).amount) {
        await redisClient.setAsync(DAILY_MAX_KEY, JSON.stringify({
          userId,
          username: state.username,
          amount: moneyGained,
          target: heist.name,
          timestamp: Date.now()
        }));
      }

      // SÊNIOR: Registra via ActionLog (Redis-Only) com flag de visibilidade pública
      await actionLogService.log(userId, 'HEIST_SUCCESS', 'contract', heist.id, {
        public_message: publicMessage,
        is_master: isDaily,
        is_major: isMajor,
        faction: 'gangsters',
        heist_name: heist.name,
        money_gain: moneyGained,
        xp_gain: xpGained,
        corruption_gain: infamyGained,
        stats_gained: attrGained.reduce((acc, a) => ({ ...acc, [a.attr]: a.gain }), {}),
        items_looted: lootGained.map(l => ({ code: l.code, quantity: l.quantity, rarity: l.rarity })),
      }, true, null);

      // Adiciona ao feed de atividades (Redis) para interceptação (janela de 3min)
      const activity = {
        userId,
        username: state.username,
        heistId: heist.id,
        heistName: heist.name,
        timestamp: now,
        isMaster: isDaily,
        level: require("../utils/gameLogic").calculateDynamicLevel(state),
        renegadeStats: { attack: state.attack, focus: state.focus, instinct: state.instinct },
        loot: lootGained
      };
      await redisClient.zAddAsync(ACTIVITY_KEY, now, JSON.stringify(activity));

      let hasGuardiansOnline = false;

      // Se for Golpe de Mestre, envia alerta prioritário para os Guardiões
      if (isDaily) {
        const { getIO, hasFactionOnline } = require('../socketHandlerNative');
        hasGuardiansOnline = hasFactionOnline('guardas');
        
        const io = getIO();
        io.emit('contract:master_heist_alert', {
          username: state.username,
          expiresAt: now + (3 * 1000) // Janela de 3 segundos (tempo real)
        });
      }

      return {
        message,
        moneyGained,
        xpGained,
        attrGained,
        lootGained,
        hasGuardiansOnline,
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
      const gameLogic = require("../utils/gameLogic");
      const dynamicLevel = gameLogic.calculateDynamicLevel(state);

      if (dynamicLevel < task.level) throw new Error(`Nível insuficiente.`);
      if (state.action_points < task.costPA) throw new Error("PA insuficiente.");
      if (state.energy < task.costEnergy) throw new Error("Energia insuficiente.");

      // SÊNIOR: Enforce de balanceamento (Só pode fazer a melhor tarefa do seu nível atual)
      const unlockedTasks = GUARDIAN_TYPES.filter(t => t.level <= dynamicLevel);
      const bestTask = unlockedTasks[unlockedTasks.length - 1];
      if (task.id !== bestTask.id) {
        throw new Error(`Tarefa obsoleta. Para o seu nível, foque em: ${bestTask.name}.`);
      }

      const moneyGained = REWARDS.money(task.salary[0], task.salary[1]);
      const meritGained = REWARDS.xp(task.merit[0], task.merit[1]);
      const xpGained = REWARDS.xp(task.xp[0], task.xp[1]);

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

      // SORTE -> INSTINTO (INST): Chance de 20% (1 em cada 5)
      let instinctGainText = "";
      if (Math.random() < 0.20) {
        const instinctGain = parseFloat((Math.random() * (0.06 - 0.01) + 0.01).toFixed(2));
        updates.instinct = (updates.instinct || 0) + instinctGain;
        attrGained.push({ attr: 'instinct', gain: instinctGain });
        instinctGainText = ` | +${instinctGain} INST`;
      }

      const lootGained = [];
      if (Math.random() < task.lootChance) {
        const itemObj = SPECIAL_ITEMS_POOL[Math.floor(Math.random() * SPECIAL_ITEMS_POOL.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        await inventoryService.addItem(userId, itemObj.code, qty);
        lootGained.push({ code: itemObj.code, quantity: qty, rarity: itemObj.rarity });
      }

      let interception = null;
      // SÊNIOR: Verificação de rastro no Redis para interceptação (usando ZSET global:heist_activity)
      const ACTIVITY_KEY = "global:heist_activity";
      const threeSecondsAgo = Date.now() - (3 * 1000);
      
      // Limpa rastros antigos (lixo)
      await redisClient.zRemRangeByScoreAsync(ACTIVITY_KEY, '-inf', threeSecondsAgo - 1);
      
      // Busca rastros recentes (janela de 3 segundos para "Tempo Real")
      const rawActivities = await redisClient.zRangeByScoreAsync(ACTIVITY_KEY, threeSecondsAgo, '+inf');
      
      const lastDaily = state.last_daily_special_at ? new Date(state.last_daily_special_at) : null;
      let canInterceptMaster = true;
      if (lastDaily) {
        if (Date.now() - lastDaily.getTime() < 24 * 60 * 60 * 1000) {
          canInterceptMaster = false;
        }
      }

      if (rawActivities && rawActivities.length > 0) {
        const activities = [];
        for (const raw of rawActivities) {
           const parsed = JSON.parse(raw);
           // Não intercepta a si mesmo e verifica se o roubo é vinculado ou se é Golpe de Mestre (respeitando o cooldown de 24h)
           if (parsed.userId !== userId) {
             if (parsed.isMaster && canInterceptMaster) {
               activities.push({ rawStr: raw, ...parsed });
             } else if (!parsed.isMaster && task.linkedHeists?.includes(parsed.heistId)) {
               activities.push({ rawStr: raw, ...parsed });
             }
           }
        }

        const target = activities.find(a => a.isMaster) || (activities.length > 0 ? activities[Math.floor(Math.random() * activities.length)] : null);
        
        if (target) {
          // SÊNIOR: Probabilidade Dinâmica Escalável
          let totalChance = 0.15; // Fallback
          const heistLevel = target.level || 0;

          if (target.isMaster) {
            totalChance = 0.50; // Golpe de Mestre é 50%
          } else if (heistLevel <= 20) {
            totalChance = 0.10;
          } else if (heistLevel <= 80) {
            totalChance = 0.20;
          } else {
            totalChance = 0.30;
          }

          if (Math.random() < totalChance) {
            const gScore = (state.defense * 0.5) + (state.focus * 0.3) + (state.instinct * 0.2);
            const rScore = (target.renegadeStats.attack * 0.5) + (target.renegadeStats.instinct * 0.3) + (target.renegadeStats.focus * 0.2);
            
            const gFinal = gScore * (0.9 + Math.random() * 0.2);
            const rFinal = rScore * (0.9 + Math.random() * 0.2);

              if (gFinal >= rFinal * 2 && target.isMaster) {
              // SÊNIOR: GUARDIÃO ESMAGA O RENEGADO
              interception = {
                targetId: target.userId,
                targetName: target.username,
                heistName: target.heistName,
                items: target.loot && target.loot.length > 0 ? target.loot : [{ code: SPECIAL_ITEMS_POOL[Math.floor(Math.random() * SPECIAL_ITEMS_POOL.length)].code, quantity: 1, rarity: 'common' }]
              };
              updates.pending_interception = interception;
              updates.last_daily_special_at = new Date().toISOString();
              
              updates.total_xp = (updates.total_xp || 0) + 1000;
              await redisClient.zRemAsync(ACTIVITY_KEY, target.rawStr);

              const targetState = await playerStateService.getPlayerState(target.userId);
              const moneyLoss = Math.floor((targetState.money || 0) * 0.1);
              const infamyLoss = Math.floor((targetState.corruption || 0) * 0.1);
              
              await playerStateService.updatePlayerState(target.userId, {
                money: -moneyLoss,
                corruption: -infamyLoss,
                status: 'Isolamento',
                status_ends_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
              });

              if (target.loot && target.loot.length > 0) {
                for (const l of target.loot) {
                  await inventoryService.removeItem(target.userId, l.code, l.quantity);
                }
              }

              // Log do Guardião (Público + Pessoal)
              await actionLogService.log(userId, 'interception', 'contract', task.id, {
                public_message: `<span class="text-purple-500 font-black">[GLOBAL]</span> <span class="text-cyan-400 font-bold">${state.username}</span> CONSEGUIU INTERCEPTAR <span class="text-orange-300 font-bold">${target.username}</span> COM SUCESSO! ISOLAMENTO É O SEU LUGAR PALAVRAS DELE... <span style="display:none">$</span>`,
                is_major: true,
                faction: 'guardas',
                role: 'guardian',
                outcome: 'critical_success',
                target_name: target.username,
                xp_gain: 1000,
                items_confiscated: interception.items
              }, true, null);

              // Log Pessoal do Renegado (Derrota Crítica)
              await actionLogService.log(target.userId, 'interception', 'contract', task.id, {
                role: 'renegade',
                outcome: 'critical_fail',
                guardian_name: state.username,
                money_loss: moneyLoss,
                infamy_loss: infamyLoss,
                items_lost: target.loot,
                penalty: 'Isolamento (10m)'
              }, false, null);

            } else if (gFinal > rFinal) {
              // SÊNIOR: INTERCEPTAÇÃO NORMAL (Guardião ganha)
              interception = {
                targetId: target.userId,
                targetName: target.username,
                heistName: target.heistName,
                items: target.loot && target.loot.length > 0 ? target.loot : [{ code: SPECIAL_ITEMS_POOL[Math.floor(Math.random() * SPECIAL_ITEMS_POOL.length)].code, quantity: 1, rarity: 'common' }]
              };
              updates.pending_interception = interception;
              if (target.isMaster) {
                updates.last_daily_special_at = new Date().toISOString();
              }
              await redisClient.zRemAsync(ACTIVITY_KEY, target.rawStr);

              if (target.loot && target.loot.length > 0) {
                for (const l of target.loot) {
                  await inventoryService.removeItem(target.userId, l.code, l.quantity);
                }
              }

              // Log do Guardião
              await actionLogService.log(userId, 'interception', 'contract', task.id, {
                role: 'guardian',
                outcome: 'success',
                target_name: target.username,
                items_confiscated: interception.items
              }, false, null);

              // Log do Renegado
              await actionLogService.log(target.userId, 'interception', 'contract', task.id, {
                role: 'renegade',
                outcome: 'fail',
                guardian_name: state.username,
                items_lost: target.loot
              }, false, null);

            } else if (rFinal >= gFinal * 2 && target.isMaster) {
              // SÊNIOR: RENEGADO ESMAGA O GUARDIÃO
              const moneyLoss = Math.floor((state.money || 0) * 0.1);
              const meritLoss = Math.floor((state.merit || 0) * 0.1);
              
              updates.money = (updates.money || 0) - moneyLoss;
              updates.merit = (updates.merit || 0) - meritLoss;
              updates.status = 'Recuperação';
              updates.status_ends_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

              await redisClient.zRemAsync(ACTIVITY_KEY, target.rawStr);

              await playerStateService.updatePlayerState(target.userId, {
                total_xp: 1000
              });

              // Log Público + Pessoal do Renegado
              await actionLogService.log(target.userId, 'interception', 'contract', task.id, {
                public_message: `<span class="text-purple-500 font-black">[GLOBAL]</span> <span class="text-orange-300 font-bold">${target.username}</span> ESCAPOU DA INTERCEPTACAO COM SUCESSO, <span class="text-cyan-400 font-bold">${state.username}</span>, NÃO FOI DESSA VEZ, PALAVRAS DELE... <span style="display:none">$</span>`,
                is_major: true,
                faction: 'gangsters',
                role: 'renegade',
                outcome: 'critical_success',
                guardian_name: state.username,
                xp_gain: 1000
              }, true, null);

              // Log Pessoal do Guardião
              await actionLogService.log(userId, 'interception', 'contract', task.id, {
                role: 'guardian',
                outcome: 'critical_fail',
                target_name: target.username,
                money_loss: moneyLoss,
                merit_loss: meritLoss,
                penalty: 'Recuperação (10m)'
              }, false, null);

            } else {
              // SÊNIOR: FUGA NORMAL (Renegado escapa)
              // Log Guardião
              await actionLogService.log(userId, 'interception', 'contract', task.id, {
                role: 'guardian',
                outcome: 'fail',
                target_name: target.username
              }, false, null);

              // Log Renegado
              await actionLogService.log(target.userId, 'interception', 'contract', task.id, {
                role: 'renegade',
                outcome: 'success',
                guardian_name: state.username
              }, false, null);
            }

            }
          }
        }

      const newState = await playerStateService.updatePlayerState(userId, updates);

      // Mensagem Dinâmica (Motor Combinatório Militar) - EXCLUSIVO PARA O FEED PÚBLICO
      const phraseData = {
        target: task.name,
        money: `$${moneyGained.toLocaleString()}`
      };
      const publicMessage = phraseGenerator.generate('guardas', { ...phraseData, name: state.username });

      // Toast Simples e Completo para o Jogador
      const attrGains = attrGained.filter(a => a.attr !== 'instinct').map(a => {
        const labels = { attack: 'ATK', defense: 'DEF', focus: 'FOC' };
        return `+${a.gain} ${labels[a.attr] || a.attr.substring(0,3).toUpperCase()}`;
      }).join(" ");

      const lootMsg = lootGained.length > 0 
        ? ` [LOOT: ${lootGained.map(l => `§${l.rarity}:${l.code.replace(/_/g, ' ')}§`).join(", ")}]` 
        : "";

      const message = `SUCESSO! +$${moneyGained.toLocaleString()} | +${xpGained} XP | +${meritGained} MER | ${attrGains}${instinctGainText}${lootMsg}`;

      // SÊNIOR: Tracking do Maior Ganho do Dia (Ranking de Destaque)
      const DAILY_MAX_KEY = `stats:daily_max:guardas`;
      const currentMax = await redisClient.getAsync(DAILY_MAX_KEY);
      if (!currentMax || moneyGained > JSON.parse(currentMax).amount) {
        await redisClient.setAsync(DAILY_MAX_KEY, JSON.stringify({
          userId,
          username: state.username,
          amount: moneyGained,
          target: task.name,
          timestamp: Date.now()
        }));
      }

      // Log Unificado (Individual + Público)
      await actionLogService.log(userId, 'guardian_task', 'contract', task.id, {
        money_gain: moneyGained,
        merit_gain: meritGained,
        xp_gain: xpGained,
        stats_gained: attrGained.reduce((acc, a) => ({ ...acc, [a.attr]: a.gain }), {}),
        items_looted: lootGained.map(l => ({ code: l.code, quantity: l.quantity, rarity: l.rarity })),
        interception: !!interception,
        is_major: meritGained > 500 || !!interception,
        faction: 'guardas',
        public_message: publicMessage
      }, true, null);

      return {
        message,
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
    const cacheKey = onlyMajor ? "cache:contract_logs:major" : "cache:public_logs_stream";
    
    try {
      if (onlyMajor) {
        const cached = await redisClient.getAsync(cacheKey);
        if (cached) return JSON.parse(cached);
        return [];
      } else {
        const cachedList = await redisClient.lRangeAsync(cacheKey, 0, 99);
        if (cachedList && cachedList.length > 0) {
          return cachedList.map(l => {
            const log = JSON.parse(l);
            const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
            
            // SÊNIOR: Filtra logs que não possuem valor (SÓ DEIXE ONDE MOSTRA O VALOR QUE GANHOU)
            if (!metadata.money_gain && !metadata.public_message?.includes('$')) return null;

            let faction = metadata.faction || null;
            // SÊNIOR: Se já existe uma public_message no metadado, USAMOS ELA.
            // Não re-sorteamos a frase, para manter a consistência entre o Toast e o Feed.
            let displayMessage = "";
            if (metadata.public_message) {
              displayMessage = metadata.public_message;
            } else if (log.actionType === 'HEIST_SUCCESS' || log.actionType === 'heist') {
              // FALLBACK para logs legados sem public_message
              faction = 'gangsters';
              const money = metadata.money_gain ? `$${metadata.money_gain.toLocaleString()}` : (displayMessage.includes('$') ? '$' + displayMessage.split('$')[1] : "");
              const name = metadata.public_message?.split(' ')[0] || "Agente";
              let target = metadata.heist_name || (displayMessage.includes(': ') ? displayMessage.split(': ')[1] : (displayMessage.includes('realizou ') ? displayMessage.split('realizou ')[1].split(' e')[0] : "OPERACAO"));
              
              const phrases = [
                "{name} FEZ UM ASSALTO A {target} E ESCAPOU COM {money}",
                "{name} EXECUTOU O PLANO EM {target} COM {money} DE LUCRO",
                "{name} PASSOU PELO CERCO EM {target} E SAIU COM {money}"
              ];
              const p = phrases[Math.abs(log.createdAt.length % phrases.length)];
              displayMessage = p.replace("{name}", name).replace("{target}", target.toUpperCase()).replace("{money}", money);
            } else if (log.actionType === 'guardian_task') {
              // FALLBACK para logs legados
              faction = 'guardas';
              const money = metadata.money_gain ? `$${metadata.money_gain.toLocaleString()}` : (displayMessage.includes('$') ? '$' + displayMessage.split('$')[1] : "");
              const name = metadata.public_message?.split(' ')[0] || "Guardião";
              let target = displayMessage.includes('completou ') ? displayMessage.split('completou ')[1].replace('.', '') : "PATRULHA";
              
              const phrases = [
                "{name} GARANTIU A ORDEM EM {target} E RECEBEU {money}",
                "{name} COMPLETOU A MISSÃO EM {target} PELO MERITO DE {money}",
                "{name} INTERCEPTOU O CRIME EM {target} E FOI RECOMPENSADO COM {money}"
              ];
              const p = phrases[Math.abs(log.createdAt.length % phrases.length)];
              displayMessage = p.replace("{name}", name).replace("{target}", target.toUpperCase()).replace("{money}", money);
            }

            return {
              id: log.createdAt + "-" + log.userId,
              message: displayMessage,
              event_type: log.actionType,
              created_at: log.createdAt,
              is_major: metadata.is_major || metadata.is_master || false,
              faction: faction
            };
          }).filter(Boolean);
        }
        return [];
      }
    } catch (err) {
      console.error("[contractService] Erro ao buscar logs do Redis:", err.message);
      return [];
    }
  }
}

module.exports = new ContractService();
