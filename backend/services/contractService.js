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
        heist = this.getDynamicDailySpecial(state.level);
        isDaily = true;
      }

      if (!heist) throw new Error("Roubo inválido.");

      if (state.level < heist.level) throw new Error(`Nível insuficiente. Requer nível ${heist.level}.`);
      if (state.action_points < heist.costPA) throw new Error("PA insuficiente.");
      if (state.energy < heist.costEnergy) throw new Error("Energia insuficiente.");

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

      // SORTE -> INSTINTO (INS): Chance de 20% (1 em cada 5)
      if (Math.random() < 0.20) {
        const instinctGain = parseFloat((Math.random() * (0.06 - 0.01) + 0.01).toFixed(2));
        updates.instinct = (updates.instinct || 0) + instinctGain;
        attrGained.push({ attr: 'instinct', gain: instinctGain });
      }

      const lootGained = [];
      if (Math.random() < heist.lootChance) {
        const randomItem = SPECIAL_ITEMS_POOL[Math.floor(Math.random() * SPECIAL_ITEMS_POOL.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        await inventoryService.addItem(userId, randomItem, qty);
        lootGained.push({ code: randomItem, quantity: qty });
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
      const attrGains = attrGained.map(a => {
        const labels = { attack: 'ATK', defense: 'DEF', focus: 'FOC', instinct: 'INS' };
        return `+${a.gain} ${labels[a.attr] || a.attr.substring(0,3).toUpperCase()}`;
      }).join(" ");
      const lootMsg = lootGained.length > 0 ? ` [LOOT: ${lootGained.map(l => l.code).join(", ")}]` : "";
      const message = `SUCESSO! +$${moneyGained.toLocaleString()} | +${xpGained} XP | ${attrGains}${lootMsg}`;

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
        corruption_gain: updates.corruption,
        stats_gained: attrGained.reduce((acc, a) => ({ ...acc, [a.attr]: a.gain }), {}),
        items_looted: lootGained.map(l => ({ code: l.code, quantity: l.quantity })),
      }, true);

      // Adiciona ao feed de atividades (Redis) para interceptação (janela de 3min)
      const activity = {
        userId,
        username: state.username,
        heistId: heist.id,
        heistName: heist.name,
        timestamp: now,
        isMaster: isDaily
      };
      await redisClient.zAddAsync(ACTIVITY_KEY, now, JSON.stringify(activity));

      // Se for Golpe de Mestre, envia alerta prioritário para os Guardiões
      if (isDaily) {
        const io = require('../socketHandlerNative').getIO();
        io.emit('contract:master_heist_alert', {
          username: state.username,
          expiresAt: now + (180 * 1000) // 3 minutos de janela
        });
      }

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

      // SORTE -> INSTINTO (INS): Chance de 20% (1 em cada 5)
      if (Math.random() < 0.20) {
        const instinctGain = parseFloat((Math.random() * (0.06 - 0.01) + 0.01).toFixed(2));
        updates.instinct = (updates.instinct || 0) + instinctGain;
        attrGained.push({ attr: 'instinct', gain: instinctGain });
      }

      let interception = null;
      // SÊNIOR: Verificação de rastro no Redis para interceptação
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
                await actionLogService.log(userId, 'interception_fail', 'contract', task.id, {
                  public_message: `O Guardião ${state.username} detectou o rastro de um crime, mas o suspeito conseguiu escapar da abordagem!`,
                  target_name: target.username
                }, true);
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
      const attrGains = attrGained.map(a => {
        const labels = { attack: 'ATK', defense: 'DEF', focus: 'FOC', instinct: 'INS' };
        return `+${a.gain} ${labels[a.attr] || a.attr.substring(0,3).toUpperCase()}`;
      }).join(" ");
      const lootMsg = lootGained.length > 0 ? ` [LOOT: ${lootGained.map(l => l.code).join(", ")}]` : "";
      const message = `SUCESSO! +$${moneyGained.toLocaleString()} | +${xpGained} XP | ${attrGains}${lootMsg}`;

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
        items_looted: lootGained.map(l => ({ code: l.code, quantity: l.quantity })),
        interception: !!interception,
        is_major: meritGained > 500 || !!interception,
        faction: 'guardas',
        public_message: publicMessage
      }, true);

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
