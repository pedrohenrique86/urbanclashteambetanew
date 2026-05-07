const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const playerStateService = require("./playerStateService");
const actionLogService = require("./actionLogService");
const gameLogic = require("../utils/gameLogic");
const spectroEngine = require("../utils/spectroEngine");

const CYBER_SETORS = [
  "Setor 7", "Beco Cromado", "Distrito Neon", "Periferia 404", "Mainframe Central", 
  "Vazio de Dados", "Submercado 9", "Torre de Cristal", "Nó de Segregação", 
  "Zona de Quarentena", "Porto Seco", "Viaduto Industrial", "Pátio de Sucata", 
  "Eixo Norte", "Quadrante Sombrio"
];

const CYBER_WEAPONS = [
  "Lâmina Térmica", "Canhão de Pulso", "Neural Linker", "Mono-molécula", 
  "Dreno de Energia", "Injetor de Vírus", "Sabre de Plasma", "Rifle de Gauss",
  "Adaga de Frequência", "Bastão Eletrificado", "Granada de Pulso EM",
  "Nervo Óptico Hackeado", "Exo-punho Hidráulico", "Lançador de Nanites", "Dispositivo de Sobrecarga"
];

const RENEGADO_BOT_NAMES = [
  "VandaLo_Ne0n", "Sombra_Ativ4", "Cr4ck_H3ad", "Ghost_Protocol", "Glitch_Stalker",
  "Rogue_Unit_01", "Cypher_Punk", "Void_Runner", "Chaos_Node", "Null_Pointer",
  "Static_Rebel", "Data_Thief", "Neural_Bandit", "Pixel_Wraith", "Overclock_Kid",
  "Broken_Link", "Night_Crawler", "Shadow_Script", "Hex_Ghost", "Zero_Day"
];

const GUARDIAO_BOT_NAMES = [
  "Sentinela_XV", "Pax_CorpHQ", "Vigilante_System", "Aegis_Prime", "Iron_Law",
  "Order_Enforcer", "Cyber_Shield", "PeaceKeeper_Alpha", "Guardian_Z", "Unity_Beacon",
  "System_Admin", "Protocol_X", "Core_Defender", "Nexus_Guard", "Vector_Prime",
  "Law_Giver", "Sentinel_Omega", "Avalaunch_Unit", "Grid_Keeper", "Secure_Shell"
];

function censorName(name) {
  if (!name) return "****";
  if (name.includes("[BOT]") || name.includes("[BOSS]")) return name;
  if (name.length <= 2) return name.charAt(0) + "***" + (name.length > 1 ? name.charAt(name.length-1) : "");
  return name.charAt(0) + "*****" + name.charAt(name.length - 1);
}

function getNpcData(targetId, attacker) {
  const isRare = targetId.includes("_rare");
  const isElite = targetId.includes("_elite");
  const seedStr = targetId.replace("npc_", "").replace("_rare", "");
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const attackerFaction = String(attacker?.faction || 'gangsters').toLowerCase().trim();
  let pool = [], botFaction = "Neutral";
  if (attackerFaction.includes('guard')) { botFaction = "Renegados"; pool = RENEGADO_BOT_NAMES; }
  else if (attackerFaction.includes('renegad') || attackerFaction.includes('gangster')) { botFaction = "Guardiões"; pool = GUARDIAO_BOT_NAMES; }
  else pool = [...RENEGADO_BOT_NAMES, ...GUARDIAO_BOT_NAMES];

  const rawName = pool[Math.abs(hash) % pool.length];
  let name = `[BOT] ${rawName}`;
  if (isRare) name = `[BOSS] ${rawName}`;
  const attackerLevel = Number(attacker?.level || 10);
  const level = Math.max(1, attackerLevel + (Math.abs(hash * 31) % 5) - 2);

  const playerPower = Number(attacker?.attack || 10) + Number(attacker?.defense || 10) + Number(attacker?.focus || 10);
  const difficultyMod = 1.0 + ((level - attackerLevel) * 0.10);
  let totalStatPool = playerPower * difficultyMod * (isRare ? 1.35 : 0.92);

  const isRenegado = botFaction.includes("Renegado");
  const atkPct = isRenegado ? 0.42 : 0.28, defPct = isRenegado ? 0.28 : 0.42, focPct = 0.30;
  const jitter = (h, salt) => 0.90 + (Math.abs(h * salt) % 11) / 100; // Varre entre 0.90 e 1.00 para ser justo

  return {
    username: name, level, attack: Math.max(1, Math.round(totalStatPool * atkPct * jitter(hash, 3))),
    defense: Math.max(1, Math.round(totalStatPool * defPct * jitter(hash, 7))),
    focus: Math.max(1, Math.round(totalStatPool * focPct * jitter(hash, 13))),
    crit_chance_pct: Math.min(60, level * 0.4),
    crit_damage_mult: Math.min(4.0, 1.5 + (level * 0.02)),
    faction: botFaction, is_npc: true, is_rare: isRare, money: isRare ? 500 : 0
  };
}

class CombatService {
  async _getEquippedChips(userId) {
    const res = await query(
      `SELECT i.* FROM items i
       JOIN player_inventory pi ON i.id = pi.item_id
       WHERE pi.user_id = $1 AND pi.is_equipped = TRUE AND i.type = 'chip'`,
      [userId]
    );
    return res.rows.map(chip => {
      let effect_type = 'power_boost', effect_value = Number(chip.base_attack_bonus) || 10;
      if (chip.base_focus_bonus > 0) { effect_type = 'xp_boost'; effect_value = Number(chip.base_focus_bonus); }
      else if (chip.base_defense_bonus > 0) { effect_type = 'money_shield'; effect_value = Number(chip.base_defense_bonus); }
      return { id: chip.id, name: chip.name, effect_type, effect_value };
    });
  }

  async getRadarTargets(userId) {
    const CACHE_KEY = `radar_lock:${userId}`;
    try {
      const cached = await redisClient.getAsync(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch(e) {}

    const attacker = await playerStateService.getPlayerState(userId);
    if (!attacker) throw new Error("Atacante não encontrado.");
    const attackerLevel = Number(attacker.level || 1);
    if (attackerLevel < 10) throw new Error("Nível 10 necessário para o Radar.");

    const myFaction = (attacker.faction || "").toLowerCase().trim();
    const enemyFactionKey = myFaction.includes('guard') ? 'gangsters' : 'guardas';
    const ENEMY_SET_KEY = `online_players_set:${enemyFactionKey}`;

    let targets = [];
    try {
      const rawIds = await redisClient.sRandMemberAsync(ENEMY_SET_KEY, 30);
      const onlineIds = (rawIds || []).filter(id => id !== String(userId));
      if (onlineIds.length > 0) {
        const multi = redisClient.pipeline();
        onlineIds.forEach(id => multi.hmGet(`${playerStateService.PLAYER_STATE_PREFIX}${id}`, ['username', 'level', 'status', 'shield_ends_at']));
        const results = await multi.exec();
        onlineIds.forEach((id, idx) => {
          const [username, level, status, shield] = results[idx];
          const targetLevel = Number(level || 1);
          if (targetLevel >= (attackerLevel - 3) && targetLevel <= (attackerLevel + 3) && 
              (status === 'Operacional' || status === 'Ruptura') && 
              (!shield || new Date(shield) < new Date())) {
            targets.push({ id, level: targetLevel, faction: enemyFactionKey === 'gangsters' ? 'Renegados' : 'Guardiões', name: censorName(username), online: true, is_npc: false, status });
          }
        });
      }
    } catch (e) {}

    const RESET_KEY = `combat:reset_at:${userId}`;
    const pvpKey = `combat:count:pvp:${userId}`;
    const pveKey = `combat:count:pve:${userId}`;

    const resetAt = await redisClient.getAsync(RESET_KEY);
    const pvpLimit = await redisClient.getAsync(pvpKey) || 0;
    const pveLimit = await redisClient.getAsync(pveKey) || 0;

    const pveExhausted = parseInt(pveLimit) >= 5;
    const hasRealPlayers = targets.some(t => !t.is_npc);
    const usedNames = new Set(targets.map(t => t.name));

    while (targets.length < 6) {
      // SÊNIOR: BOSS (Rare) aparece apenas no PvE (se não esgotado). ELITE aparece para suprir o PvP.
      const shouldForceElite = pveExhausted && !hasRealPlayers;
      const isRare = !pveExhausted && Math.random() < 0.05;
      const isElite = shouldForceElite;

      let npcData;
      let npcId;
      let attempts = 0;

      // SÊNIOR: Garante que o nome do bot seja único no radar atual
      do {
        npcId = `npc_${Math.random().toString(36).substr(2, 5)}_${attempts}${isRare ? '_rare' : ''}${isElite ? '_elite' : ''}`;
        npcData = getNpcData(npcId, attacker);
        attempts++;
      } while (usedNames.has(npcData.username) && attempts < 15);

      usedNames.add(npcData.username);
      targets.push({ 
        id: npcId, 
        level: npcData.level, 
        faction: npcData.faction, 
        name: npcData.username, 
        online: true, 
        is_npc: true, 
        is_rare: isRare,
        is_elite: isElite 
      });
    }

    const response = {
      targets,
      limits: {
        pvp: parseInt(pvpLimit),
        pve: parseInt(pveLimit),
        reset_at: resetAt ? parseInt(resetAt) : null
      }
    };

    await redisClient.setAsync(CACHE_KEY, JSON.stringify(response), "EX", 18);
    
    return response;
  }

  async getPreCombatStatus(userId, targetId) {
    const attacker = await playerStateService.getPlayerState(userId);
    const defender = targetId.startsWith("npc_") ? getNpcData(targetId, attacker) : await playerStateService.getPlayerState(targetId);
    if (!attacker || !defender) throw new Error("Dados indisponíveis.");
    return {
      spectroHint: spectroEngine.generateSpectroTalk("detection"),
      targetInfo: { level: defender.level, faction: defender.faction, name: censorName(defender.username), hp: 100, maxHP: 100 },
      playerInfo: { hp: 100, maxHP: 100 }
    };
  }

  async executeInstantAttack(userId, targetId) {
    const LOCK = `combat:lock:${userId}`;
    const COOLDOWN = `combat:cooldown:${userId}`;

    // SÊNIOR: Verificação de resfriamento para evitar spam/trapaças via refresh
    const onCooldown = await redisClient.getAsync(COOLDOWN);
    if (onCooldown) throw new Error("Sistemas em resfriamento. Aguarde a sincronização da matriz.");

    const hasLock = await redisClient.setNXAsync(LOCK, "1", 15000);
    if (!hasLock) throw new Error("Aguarde a resolução do ataque atual.");

    try {
      const attacker = await playerStateService.getPlayerState(userId);
      const isNpc = targetId.startsWith("npc_");
      
      const pvpKey = `combat:count:pvp:${userId}`;
      const pveKey = `combat:count:pve:${userId}`;
      const isElite = isNpc && targetId.includes("_elite");
      const RESET_KEY = `combat:reset_at:${userId}`;

      // 1. Verifica se está em cooldown de 24h
      const resetAt = await redisClient.getAsync(RESET_KEY);
      if (resetAt && parseInt(resetAt) > Date.now()) {
        throw new Error("Matriz de combate em reidratação energética. Aguarde o reset de 24h.");
      }

      // 2. Verifica limites individuais
      const limitType = (isNpc && !isElite) ? "pve" : "pvp";
      const currentCount = parseInt(await redisClient.getAsync(limitType === "pvp" ? pvpKey : pveKey) || 0);
      
      if (currentCount >= 5) {
        throw new Error(`Limite de ataques ${limitType.toUpperCase()} (5/5) atingido.`);
      }

      const defender = isNpc ? getNpcData(targetId, attacker) : await playerStateService.getPlayerState(targetId);

      if (!attacker || !defender) throw new Error("Alvo não encontrado.");
      if (attacker.energy < 10) throw new Error("Nível de energia crítico. Recarregue.");
      if (attacker.action_points < 250) throw new Error("Pontos de Ação insuficientes (Requer 250).");
      if (attacker.status !== 'Operacional' && attacker.status !== 'Ruptura') throw new Error(`Sistema em modo ${attacker.status}. Combate bloqueado.`);

      const pChips = await this._getEquippedChips(userId);
      const dChips = isNpc ? [] : await this._getEquippedChips(targetId);

      // SÊNIOR: Pegamos as chances reais de crit e multiplicadores baseados nos atributos e treinos
      const pCritChance = gameLogic.calcCritChance(attacker);
      const pCritMult = gameLogic.calcCritDamageMultiplier(attacker);
      const dCritChance = gameLogic.calcCritChance(defender);
      const dCritMult = gameLogic.calcCritDamageMultiplier(defender);

      let pPower = gameLogic.calculateTotalPower(attacker, pChips).powerSolo;
      let oPower = gameLogic.calculateTotalPower(defender, dChips).powerSolo;

      // SÊNIOR: Sorteio de Crítico
      const pIsCrit = (Math.random() * 100) < pCritChance;
      const oIsCrit = (Math.random() * 100) < dCritChance;

      const pFinalPower = Math.floor(pPower * (pIsCrit ? pCritMult : 1));
      const oFinalPower = Math.floor(oPower * (oIsCrit ? dCritMult : 1));

      const baseRatio = pFinalPower / Math.max(1, oFinalPower);
      const effectiveRatio = baseRatio * (0.85 + Math.random() * 0.3);

      let outcome = "DRAW";
      if (effectiveRatio >= 2.0) outcome = "WIN_KO";
      else if (effectiveRatio <= 0.5) outcome = "LOSS_KO";
      else if (effectiveRatio >= 0.9 && effectiveRatio <= 1.1) outcome = "DRAW";
      else if (effectiveRatio > 1.1) outcome = "WIN";
      else outcome = "LOSS";

      let loot = { xp: 0, money: 0, stats: {} };
      let msg = "";
      const statsList = ['attack', 'defense', 'focus'];

      // Cálculos Dinâmicos Sênior
      const targetLevel = Number(defender.level || 1);
      const targetMoney = Number(defender.money || 0);
      
      // Recompensas de Vitória
      const winXp = Math.floor(targetLevel * 2 + (baseRatio * 5) + Math.random() * 10);
      const winMoneyBase = isNpc ? Math.floor(targetLevel * 10 + Math.random() * 50) : Math.floor(targetMoney * 0.08);
      const winStatVal = Math.max(1, Math.floor(baseRatio * 0.8));

      // Penalidades de Derrota (Geral)
      const lossXp = Math.floor(targetLevel * 0.5 + 5);
      const lossMoneyAtk = Math.floor(Number(attacker.money || 0) * 0.20); // Atacante perde 20%
      const lossMoneyDef = Math.floor(targetMoney * 0.05); // Defensor perde apenas 5%

      if (outcome === "WIN_KO") {
        const hospitalTime = 5; // Defensor atacado volta rápido (5 min)
        msg = "VITÓRIA ESMAGADORA! O alvo foi obliterado e enviado para a base de recuperação.";
        loot.xp = Math.floor(winXp * 1.5);
        // SÊNIOR: Bônus Total de CASH MONEY em K.O (1.5x bônus sobre os 8% base = 12%)
        loot.money = Math.floor(winMoneyBase * 1.5); 
        loot.energyLost = 5;
        loot.apLost = 250;
        loot.stats[statsList[Math.floor(Math.random() * 3)]] = winStatVal + 1;
        if (Math.random() < 0.5) loot.stats[statsList[Math.floor(Math.random() * 3)]] = 1;

        const updateData = { energy: -loot.energyLost, action_points: -loot.apLost, money: loot.money, total_xp: loot.xp, victories: 1 };
        Object.entries(loot.stats).forEach(([stat, val]) => {
          const currentVal = Number(attacker[stat]) || 0;
          updateData[stat] = currentVal + val;
        });
        await playerStateService.updatePlayerState(userId, updateData);

        if (!isNpc) {
          await playerStateService.updatePlayerState(targetId, {
            money: -lossMoneyDef, total_xp: 0, defeats: 1, // Defensor não perde XP em PvP
            status: 'Recondicionamento', status_ends_at: new Date(Date.now() + hospitalTime * 60000).toISOString(),
            recon_reason: "Derrota Crítica (KO)",
            recon_phrase: "Sua unidade foi neutralizada por um invasor. Protocolo de reparo rápido iniciado.",
            recon_loss_credits: lossMoneyDef,
            recon_loss_xp: 0,
            recon_power_result: `${oFinalPower} vs ${pFinalPower}`
          });
        }
      } 
      else if (outcome === "WIN") {
        msg = "VITÓRIA! Combate intenso, mas seus sistemas prevaleceram.";
        loot.xp = winXp;
        loot.money = winMoneyBase;
        loot.energyLost = 5;
        loot.apLost = 250;
        loot.stats[statsList[Math.floor(Math.random() * 3)]] = winStatVal;

        const updateData = { energy: -loot.energyLost, action_points: -loot.apLost, money: loot.money, total_xp: loot.xp, victories: 1 };
        Object.entries(loot.stats).forEach(([stat, val]) => {
          const currentVal = Number(attacker[stat]) || 0;
          updateData[stat] = currentVal + val;
        });
        await playerStateService.updatePlayerState(userId, updateData);

        if (!isNpc) await playerStateService.updatePlayerState(targetId, { money: -lossMoneyDef, total_xp: 0, defeats: 1 });
      } 
      else if (outcome === "DRAW") {
        const rupturaTime = Math.min(25, Math.floor(10 + (1 / baseRatio) * 10));
        msg = "EMPATE TÁTICO! Forças equivalentes. Ambos os sistemas entraram em RUPTURA!";
        loot.xp = Math.floor(winXp * 0.8);
        loot.energyLost = 10;
        loot.apLost = 250;
        loot.stats[statsList[Math.floor(Math.random() * 3)]] = 1;

        const updateData = { 
          energy: -loot.energyLost, action_points: -loot.apLost, total_xp: loot.xp,
          status: 'Ruptura', status_ends_at: new Date(Date.now() + rupturaTime * 60000).toISOString()
        };
        Object.entries(loot.stats).forEach(([stat, val]) => {
          const currentVal = Number(attacker[stat]) || 0;
          updateData[stat] = currentVal + val;
        });
        await playerStateService.updatePlayerState(userId, updateData);

        if (!isNpc) {
          await playerStateService.updatePlayerState(targetId, {
            total_xp: Math.floor(lossXp * 0.5),
            status: 'Ruptura', status_ends_at: new Date(Date.now() + rupturaTime * 60000).toISOString()
          });
        }
      } 
      else if (outcome === "LOSS") {
        const hospitalTime = Math.min(45, Math.floor(15 + (1 / baseRatio) * 5));
        msg = "DERROTA! O inimigo superou suas defesas. Sistemas avariados.";
        loot.moneyLost = lossMoneyAtk;
        loot.xp = -lossXp;
        loot.energyLost = 15;
        loot.apLost = 250;

        const updateData = { 
          energy: -loot.energyLost, action_points: -loot.apLost, money: -loot.moneyLost, total_xp: loot.xp, defeats: 1,
          status: 'Recondicionamento', status_ends_at: new Date(Date.now() + hospitalTime * 60000).toISOString(),
          recon_reason: "Derrota em Combate Direto",
          recon_phrase: gameLogic.getRandomDefeatPhrase(),
          recon_loss_credits: loot.moneyLost,
          recon_loss_xp: Math.abs(loot.xp),
          recon_power_result: `${pFinalPower} vs ${oFinalPower}`
        };

        if (!isNpc) {
          const lossStatVal = Math.max(1, Math.floor((1/baseRatio) * 0.5));
          const statLost = statsList[Math.floor(Math.random() * 3)];
          loot.stats[statLost] = -lossStatVal;
          updateData[statLost] = Math.max(1, (Number(attacker[statLost]) || 1) - lossStatVal);
        }

        await playerStateService.updatePlayerState(userId, updateData);

        if (!isNpc) {
          const targetXpGain = Math.floor(winXp * 0.5);
          const targetStatGain = Math.max(1, Math.floor((1/baseRatio) * 0.5));
          const targetUpdate = { money: Math.floor(lossMoneyAtk * 0.25), victories: 1, total_xp: targetXpGain };
          const defenderStat = statsList[Math.floor(Math.random() * 3)];
          targetUpdate[defenderStat] = (Number(defender[defenderStat]) || 0) + targetStatGain;
          await playerStateService.updatePlayerState(targetId, targetUpdate);
        }
      } 
      else if (outcome === "LOSS_KO") {
        const hospitalTime = Math.min(45, Math.floor(30 + (1 / baseRatio) * 6));
        msg = "DERROTA SUICIDA! Você atacou um alvo impossível e foi dizimado.";
        loot.moneyLost = lossMoneyAtk;
        loot.xp = Math.floor(-lossXp * 1.5);
        loot.energyLost = 15;
        loot.apLost = 250;

        const updateData = { 
          energy: -loot.energyLost, action_points: -loot.apLost, money: -loot.moneyLost, total_xp: loot.xp, defeats: 1,
          status: 'Recondicionamento', status_ends_at: new Date(Date.now() + hospitalTime * 60000).toISOString(),
          recon_reason: "Derrota Crítica (Suicida)",
          recon_phrase: gameLogic.getRandomDefeatPhrase(),
          recon_loss_credits: loot.moneyLost,
          recon_loss_xp: Math.abs(loot.xp),
          recon_power_result: `${pFinalPower} vs ${oFinalPower}`
        };

        if (!isNpc) {
          const lossStatVal = Math.max(1, Math.floor((1/baseRatio) * 0.8));
          const statLost = statsList[Math.floor(Math.random() * 3)];
          loot.stats[statLost] = -lossStatVal;
          updateData[statLost] = Math.max(1, (Number(attacker[statLost]) || 1) - lossStatVal);
        }

        await playerStateService.updatePlayerState(userId, updateData);

        if (!isNpc) {
          const targetXpGain = Math.floor(winXp * 0.7);
          const targetStatGain = Math.max(1, Math.floor((1/baseRatio) * 0.8));
          const targetUpdate = { money: Math.floor(lossMoneyAtk * 0.25), victories: 1, total_xp: targetXpGain };
          const defenderStat = statsList[Math.floor(Math.random() * 3)];
          targetUpdate[defenderStat] = (Number(defender[defenderStat]) || 0) + targetStatGain;
          await playerStateService.updatePlayerState(targetId, targetUpdate);
        }
      }

      // SÊNIOR: Limpa o cache do radar para forçar novo sorteio após o combate
      await redisClient.delAsync(`radar_lock:${userId}`);
      
      // SÊNIOR: Incrementa limite e verifica se completou as 10 para disparar o reset de 24h
      const limitKey = limitType === "pvp" ? pvpKey : pveKey;
      const newCount = await redisClient.incrAsync(limitKey);
      
      const otherCount = parseInt(await redisClient.getAsync(limitType === "pvp" ? pveKey : pvpKey) || 0);
      
      if (newCount + otherCount >= 10) {
        // Dispara o cooldown de 24h
        const resetTimestamp = Date.now() + 86400000;
        await redisClient.setAsync(RESET_KEY, String(resetTimestamp), "EX", 86400);
        await redisClient.delAsync(pvpKey);
        await redisClient.delAsync(pveKey);
      }

      await redisClient.setAsync(COOLDOWN, "1", "EX", 10);

      return { 
        outcome, 
        message: msg, 
        loot,
        battleReport: {
          pPower: pFinalPower,
          oPower: oFinalPower,
          pIsCrit,
          oIsCrit
        }
      };
    } finally {
      await redisClient.delAsync(LOCK);
    }
  }

  async executeAttack(userId, targetId, tactic = 'technological') {
    const LOCK = `combat:lock:${userId}`;
    const hasLock = await redisClient.setNXAsync(LOCK, "1", 15000); // 15s em ms
    if (!hasLock) throw new Error("Sincronização tática em andamento. Aguarde a conclusão da sequência.");

    try {
      const attacker = await playerStateService.getPlayerState(userId);
      const defender = targetId.startsWith("npc_") ? getNpcData(targetId, attacker) : await playerStateService.getPlayerState(targetId);
      const isNpc = targetId.startsWith("npc_");

      if (!attacker || !defender) {
        await redisClient.delAsync(LOCK);
        throw new Error("Alvos não encontrados na rede.");
      }
      
      if (attacker.energy < 10) {
        await redisClient.delAsync(LOCK);
        throw new Error("Nível de energia crítico. Recarregue antes de engajar.");
      }

      if (attacker.status !== 'Operacional' && attacker.status !== 'Ruptura') {
        await redisClient.delAsync(LOCK);
        throw new Error(`Sistema em modo ${attacker.status}. Protocolo de ataque bloqueado.`);
      }

      const chips = await this._getEquippedChips(userId);
      const result = gameLogic.resolveWinOutcome(attacker, defender, chips, tactic);
      const { isAttackerWin, isDraw, isKO, willBleed, rounds, xpBonus, moneyProtection } = result;

      const turns = rounds.map(r => ({
        round: r.round,
        segment: `ROUND ${r.round}`,
        label: r.log,
        effect: r.impact,
        attacker: { damage: r.playerDamage, hpAfter: r.opponentHP },
        defender: { damage: r.opponentDamage, hpAfter: r.playerHP },
        playerRancor: r.playerRancor
      }));

      let loot = null;
      let challengeMod = 1.0;
      const attStats = (Number(attacker.attack) || 1) + (Number(attacker.defense) || 1);
      const defStats = (Number(defender.attack) || 1) + (Number(defender.defense) || 1);
      
      if (attStats > 0) challengeMod = Math.min(2.5, Math.max(0.5, defStats / attStats));
      if (isNaN(challengeMod) || !isFinite(challengeMod)) challengeMod = 1.0;

      if (isAttackerWin) {
        // SÊNIOR: Implementação do "Bônus Total" para K.O (Ratio >= 2.0)
        const koMultiplier = isKO ? 1.5 : 1.0;
        const xpGain = Math.round(gameLogic.COMBAT.XP_WIN_BASE * challengeMod * xpBonus * koMultiplier * (0.9 + Math.random() * 0.2));
        
        // Em K.O, o saque de CASH MONEY é maior (Bônus Total 12% vs Base 8%)
        let moneyBase = isNpc ? Math.floor(50 + defender.level * 15) : Math.floor(defender.money * 0.08); 
        let money = Math.floor(moneyBase * koMultiplier);

        let statGain = isNpc ? (0.1 * challengeMod) : (0.5 + Math.random() * 1.0) * challengeMod;
        
        loot = { 
          xp: xpGain, money, outcome: isKO ? "VITÓRIA K.O" : "VITÓRIA",
          stats: { attack: Number((statGain * 0.4).toFixed(2)), defense: Number((statGain * 0.4).toFixed(2)), focus: Number((statGain * 0.2).toFixed(2)) }
        };
      } else if (isDraw) {
        loot = { xp: 5, money: 0, stats: { attack: 0.01, defense: 0.01, focus: 0.01 }, outcome: "EMPATE" };
      } else {
        const moneyLost = Math.floor(attacker.money * 0.10 * (1 - moneyProtection/100)); 
        loot = { xp: -15, moneyLost, status: "Recondicionamento", outcome: "DERROTA" };
      }

      await playerStateService.updatePlayerState(userId, { 
        energy: isAttackerWin ? -10 : (isDraw ? -15 : -20), 
        action_points: -300 
      });

      setTimeout(async () => {
        try {
          if (isAttackerWin) {
            let newStatus = 'Operacional';
            let statusEndsAt = null;
            if (willBleed) {
              newStatus = 'Ruptura';
              statusEndsAt = new Date(Date.now() + 10 * 60000).toISOString();
            }

            await playerStateService.updatePlayerState(userId, { 
              money: loot.money, total_xp: loot.xp, victories: 1,
              attack: loot.stats.attack, defense: loot.stats.defense, focus: loot.stats.focus,
              status: newStatus, status_ends_at: statusEndsAt
            });

            if (!isNpc) {
              await playerStateService.updatePlayerState(targetId, { 
                money: -loot.money, status: "Recondicionamento", 
                status_ends_at: new Date(Date.now() + 20 * 60000).toISOString(), defeats: 1,
                recon_reason: "Derrota por Invasão Hostil",
                recon_phrase: "Seus sistemas foram invadidos e neutralizados.",
                recon_loss_credits: loot.money,
                recon_loss_xp: 0,
                recon_power_result: "Defesa Superada"
              });
            }
          } else if (isDraw) {
            await playerStateService.updatePlayerState(userId, { 
              total_xp: loot.xp, attack: loot.stats.attack, defense: loot.stats.defense, focus: loot.stats.focus
            });
            if (!isNpc) await playerStateService.updatePlayerState(targetId, { total_xp: 5 });
          } else {
            const pPower = gameLogic.calculateTotalPower(attacker).powerSolo;
            const oPower = gameLogic.calculateTotalPower(defender).powerSolo;
            await playerStateService.updatePlayerState(userId, { 
              money: -loot.moneyLost, total_xp: loot.xp, defeats: 1,
              status: "Recondicionamento", status_ends_at: new Date(Date.now() + 20 * 60000).toISOString(),
              recon_reason: "Derrota em Combate Estratégico",
              recon_phrase: gameLogic.getRandomDefeatPhrase(),
              recon_loss_credits: loot.moneyLost,
              recon_loss_xp: Math.abs(loot.xp),
              recon_power_result: `${pPower} vs ${oPower}`
            });
          }

          await actionLogService.log(userId, 'combat', 'player', isNpc ? 'npc' : targetId, {
            target_name: defender.username, outcome: isAttackerWin ? 'win' : (isDraw ? 'draw' : 'loss'),
            xp_gain: loot.xp || -15, money_gain: loot.money || 0, money_loss: loot.moneyLost || 0,
            stats_gained: loot.stats || null, is_rare: defender.is_rare
          });
        } catch (err) {
          console.error(`[Combat_Delayed_Update] Erro:`, err.message);
        }
      }, 30000);

      let finalOutcome = isAttackerWin ? "win" : "loss";
      if (isDraw) finalOutcome = "draw";
      else if (isKO) finalOutcome = isAttackerWin ? "win_ko" : "loss_ko";
      else if (willBleed) finalOutcome = "win_bleeding";

      return {
        outcome: finalOutcome, 
        winner: isAttackerWin,
        details: { turns },
        loot, 
        spectroComment: spectroEngine.generateSpectroTalk(isAttackerWin ? "victory" : "detection")
      };
    } catch (err) {
      await redisClient.delAsync(LOCK);
      throw err;
    }
  }
  async startActiveCombat(userId, targetId) {
    const attacker = await playerStateService.getPlayerState(userId);
    const defender = targetId.startsWith("npc_") ? getNpcData(targetId, attacker) : await playerStateService.getPlayerState(targetId);
    
    if (!attacker || !defender) throw new Error("Alvos não encontrados.");
    if (attacker.energy < 10) throw new Error("Nível de energia crítico.");
    if (attacker.action_points < 300) throw new Error("Pontos de Ação insuficientes.");

    await playerStateService.updatePlayerState(userId, { energy: -10, action_points: -300 });

    const chips = await this._getEquippedChips(userId);
    const state = {
      targetId,
      isNpc: targetId.startsWith("npc_"),
      attacker: {
        id: userId,
        name: attacker.username,
        hp: 100,
        stagger: 100,
        attack: Number(attacker.attack) || 1,
        defense: Number(attacker.defense) || 1,
        focus: Number(attacker.focus) || 1,
        level: Number(attacker.level) || 1,
        money: Number(attacker.money) || 0,
        chips
      },
      defender: {
        id: targetId,
        name: defender.username,
        hp: 100,
        stagger: 100,
        attack: Number(defender.attack) || 1,
        defense: Number(defender.defense) || 1,
        focus: Number(defender.focus) || 1,
        level: Number(defender.level) || 1,
        money: Number(defender.money) || 0,
        isRare: defender.is_rare || false
      },
      turn: 1,
      rancor: 0
    };

    await redisClient.setAsync(`active_combat:${userId}`, JSON.stringify(state), "EX", 300); // 5 min expire
    
    return {
      status: "combat_started",
      playerHP: 100,
      enemyHP: 100,
      playerStagger: 100,
      enemyStagger: 100,
      enemyName: state.defender.name
    };
  }

  async processActiveTurn(userId, action) {
    const rawState = await redisClient.getAsync(`active_combat:${userId}`);
    if (!rawState) throw new Error("Nenhum combate ativo ou a sessão expirou.");

    const state = JSON.parse(rawState);
    const { attacker, defender } = state;

    // Resolvendo Turno Dinâmico via GameLogic
    const turnResult = gameLogic.resolveActiveTurn(state, action);

    state.attacker.hp = turnResult.playerHP;
    state.defender.hp = turnResult.enemyHP;
    state.attacker.stagger = turnResult.playerStagger;
    state.defender.stagger = turnResult.enemyStagger;
    state.rancor = turnResult.rancor;
    state.turn += 1;

    let finalResult = {
      turnLog: turnResult.log,
      playerHP: state.attacker.hp,
      enemyHP: state.defender.hp,
      playerStagger: state.attacker.stagger,
      enemyStagger: state.defender.stagger,
      rancor: state.rancor,
      isFinished: false
    };

    if (state.attacker.hp <= 0 || state.defender.hp <= 0) {
      finalResult.isFinished = true;
      const isAttackerWin = state.defender.hp <= 0 && state.attacker.hp > 0;
      const isDraw = state.attacker.hp <= 0 && state.defender.hp <= 0;
      
      let xpBonus = 1.0;
      let moneyProtection = 0;
      state.attacker.chips.forEach(c => {
        if (c.effect_type === 'xp_boost') xpBonus += (c.effect_value / 100);
        if (c.effect_type === 'money_shield') moneyProtection += c.effect_value;
      });

      const attStats = state.attacker.attack + state.attacker.defense;
      const defStats = state.defender.attack + state.defender.defense;
      let challengeMod = 1.0;
      if (attStats > 0) challengeMod = Math.min(2.5, Math.max(0.5, defStats / attStats));
      
      let loot = null;
      if (isAttackerWin) {
        // SÊNIOR: Bônus Total em K.O (Ratio >= 2.0)
        const isKO = state.defender.stagger <= 0;
        const koMultiplier = isKO ? 1.5 : 1.0;
        const pFinalPower = state.attacker.attack + state.attacker.defense;
        const oFinalPower = state.defender.attack + state.defender.defense;
        const xpGain = Math.round(gameLogic.COMBAT.XP_WIN_BASE * (1 + (pFinalPower - oFinalPower) / (oFinalPower || 1)) * koMultiplier * xpBonus);
        let money = state.isNpc ? Math.floor(50 + state.defender.level * 15) : Math.floor(state.defender.money * 0.12 * koMultiplier);
        let statGain = state.isNpc ? (0.1 * challengeMod) : (0.5 + Math.random() * 1.0) * challengeMod;
        
        loot = {
          xp: xpGain, money, outcome: isKO ? "VITÓRIA K.O" : "VITÓRIA",
          stats: { attack: Number((statGain * 0.4).toFixed(2)), defense: Number((statGain * 0.4).toFixed(2)), focus: Number((statGain * 0.2).toFixed(2)) }
        };

        const willBleed = state.attacker.hp <= 20;
        await playerStateService.updatePlayerState(userId, { 
          money: loot.money, total_xp: loot.xp, victories: 1,
          attack: loot.stats.attack, defense: loot.stats.defense, focus: loot.stats.focus,
          status: willBleed ? 'Ruptura' : 'Operacional',
          status_ends_at: willBleed ? new Date(Date.now() + 10 * 60000).toISOString() : null
        });

        if (!state.isNpc) {
          await playerStateService.updatePlayerState(state.defender.id, { 
            money: -loot.money, status: "Recondicionamento", 
            status_ends_at: new Date(Date.now() + 20 * 60000).toISOString(), defeats: 1,
            recon_reason: "Derrota em Combate Ativo",
            recon_phrase: "Sua estratégia falhou contra o invasor.",
            recon_loss_credits: loot.money,
            recon_loss_xp: 0,
            recon_power_result: "KO"
          });
        }
        finalResult.outcome = willBleed ? "win_bleeding" : "win_ko";

      } else if (isDraw) {
        loot = { xp: 5, money: 0, stats: { attack: 0.01, defense: 0.01, focus: 0.01 }, outcome: "EMPATE" };
        await playerStateService.updatePlayerState(userId, { total_xp: loot.xp, attack: loot.stats.attack, defense: loot.stats.defense, focus: loot.stats.focus });
        finalResult.outcome = "draw";

      } else {
        const moneyLost = Math.floor(state.attacker.money * 0.10 * (1 - moneyProtection/100));
        loot = { xp: -15, moneyLost, status: "Recondicionamento", outcome: "DERROTA" };
        await playerStateService.updatePlayerState(userId, { 
          money: -loot.moneyLost, total_xp: loot.xp, defeats: 1,
          status: "Recondicionamento", status_ends_at: new Date(Date.now() + 20 * 60000).toISOString(),
          recon_reason: "Derrota em Combate Ativo",
          recon_phrase: gameLogic.getRandomDefeatPhrase(),
          recon_loss_credits: loot.moneyLost,
          recon_loss_xp: Math.abs(loot.xp),
          recon_power_result: `HP Final: ${Math.floor(finalResult.playerHP)} vs ${Math.floor(finalResult.enemyHP)}`
        });
        finalResult.outcome = "loss_ko";
      }

      await actionLogService.log(userId, 'combat', 'player', state.isNpc ? 'npc' : state.defender.id, {
        target_name: state.defender.name, outcome: isAttackerWin ? 'win' : (isDraw ? 'draw' : 'loss'),
        xp_gain: loot.xp || -15, money_gain: loot.money || 0, money_loss: loot.moneyLost || 0,
        stats_gained: loot.stats || null, is_rare: state.defender.isRare
      });

      finalResult.loot = loot;
      await redisClient.delAsync(`active_combat:${userId}`);
    } else {
      await redisClient.setAsync(`active_combat:${userId}`, JSON.stringify(state), "EX", 300);
    }

    return finalResult;
  }
}

module.exports = new CombatService();
