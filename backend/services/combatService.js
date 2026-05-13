/**
 * combatService.js
 * 
 * SÊNIOR: Orquestrador de Combate Refatorado.
 * Focado em Snapshots de Performance e Atomicidade.
 */

const redisClient = require("../config/redisClient");
const playerStateService = require("./playerStateService");
const radarService = require("./combatRadarService");
const combatLogService = require("./combatLogService");
const gameLogic = require("../utils/gameLogic");
const spectroEngine = require("../utils/spectroEngine");
const { COMBAT_CONFIG } = require("./combatConstants");

class CombatService {
  /**
   * Radar de Alvos (Delegado ao RadarService)
   */
  async getRadarTargets(userId) {
    return radarService.getRadarTargets(userId);
  }

  /**
   * SÊNIOR: Retorna o status pré-combate (Dica do Spectro e dados do alvo)
   */
  async getPreCombatStatus(userId, targetId) {
    const attacker = await playerStateService.getCombatSnapshot(userId);
    const defender = await this._getDefenderSnapshot(targetId, attacker);

    if (!attacker || !defender) throw new Error("Alvos não encontrados na rede.");

    return {
      spectroHint: spectroEngine.generateSpectroTalk("detection"),
      targetInfo: { 
        level: defender.level, 
        faction: defender.faction, 
        name: defender.username, 
        hp: 100, 
        maxHP: 100 
      },
      playerInfo: { hp: 100, maxHP: 100 }
    };
  }

  /**
   * Ataque Estratégico (Legado/Tradicional)
   */
  async executeAttack(userId, targetId, tactic = 'technological') {
    // Por simplicidade e performance, redirecionamos para o motor instantâneo
    // Mas preservamos a assinatura para não quebrar o frontend.
    return this.executeInstantAttack(userId, targetId);
  }

  /**
   * Ataque Instantâneo (Resolução Rápida)
   * SÊNIOR: Usa Snapshots para evitar recálculos durante o processamento.
   */
  async executeInstantAttack(userId, targetId) {
    const COOLDOWN = `combat:cooldown:${userId}`;

    // 1. Verificações de Segurança e Trava
    const onCooldown = await redisClient.getAsync(COOLDOWN);
    if (onCooldown) throw new Error("Sistemas em resfriamento. Aguarde a sincronização.");

    return redisClient.withLock(`combat:${userId}`, COMBAT_CONFIG.LOCK_TTL * 1000, async () => {
      // 2. Snapshot de Combate (Atributos Finais)
      const attacker = await playerStateService.getCombatSnapshot(userId);
      if (!attacker) throw new Error("Atacante não encontrado.");

      if (attacker.status !== 'Operacional' && attacker.status !== 'Ruptura') {
        throw new Error(`Sistemas em modo ${attacker.status}. Combate bloqueado.`);
      }

      // 3. Carregar Defensor (Real ou NPC)
      const defender = await this._getDefenderSnapshot(targetId, attacker);
      const isNpc = targetId.startsWith("npc_");

      if (!defender) throw new Error("Defensor não encontrado.");

      // 4. Resolução da Luta (Matemática Pura no Motor)
      const pIsCrit = Math.random() * 100 < attacker.critChance;
      const dIsCrit = Math.random() * 100 < defender.critChance;

      const pPower = Math.floor(attacker.powerSolo * (pIsCrit ? attacker.critMult : 1));
      const dPower = Math.floor(defender.powerSolo * (dIsCrit ? (defender.critMult || 1.5) : 1));

      const ratio = pPower / Math.max(1, dPower);
      const effectiveRatio = ratio * (0.85 + Math.random() * 0.3);

      let outcome = "DRAW";
      if (effectiveRatio >= 2.0) outcome = "WIN_KO";
      else if (effectiveRatio > 1.1) outcome = "WIN";
      else if (effectiveRatio < 0.5) outcome = "LOSS_KO";
      else if (effectiveRatio < 0.9) outcome = "LOSS";

      // 5. Recompensas e Penalidades (Write-Through ao Redis)
      const report = await this._resolveLootAndStatus(attacker, defender, outcome, pPower, dPower, pIsCrit, dIsCrit);

      // 6. Atualização de Metas e Cooldowns
      await this._updateCombatLimits(userId, isNpc && !targetId.includes("_elite"));
      await redisClient.setAsync(COOLDOWN, "1", "EX", COMBAT_CONFIG.COOLDOWN_TTL);
      await redisClient.delAsync(`radar_lock:${userId}`);

      // 7. Log de Combate
      await combatLogService.saveReport(userId, report);

      return report;
    });
  }

  /**
   * Lógica interna de recompensas (Snapshot -> StateService)
   */
  async _resolveLootAndStatus(attacker, defender, outcome, pP, dP, pC, dC) {
    let loot = { xp: 0, money: 0, stats: {} };
    let msg = "";
    
    const diffMod = Math.min(2.0, Math.max(0.5, defender.level / attacker.level));

    if (outcome.startsWith("WIN")) {
      msg = outcome === "WIN_KO" ? "VITÓRIA ESMAGADORA!" : "VITÓRIA!";
      loot.xp = Math.floor(50 * diffMod * (outcome === "WIN_KO" ? 1.5 : 1));
      loot.money = Math.floor(defender.level * 20 * (outcome === "WIN_KO" ? 1.5 : 1));
      
      const updateAtk = { total_xp: loot.xp, money: loot.money, victories: 1, energy: -5, action_points: -250 };
      await playerStateService.updatePlayerState(attacker.userId, updateAtk);
      
      if (defender.userId) {
        await playerStateService.updatePlayerState(defender.userId, { 
          money: -Math.floor(loot.money * 0.5), defeats: 1,
          status: outcome === "WIN_KO" ? "Recondicionamento" : "Operacional",
          status_ends_at: outcome === "WIN_KO" ? new Date(Date.now() + 15 * 60000).toISOString() : null
        });
      }
    } else if (outcome === "LOSS" || outcome === "LOSS_KO") {
        msg = "DERROTA!";
        loot.xp = -20;
        loot.moneyLost = Math.floor(attacker.money * 0.1);
        await playerStateService.updatePlayerState(attacker.userId, { 
            total_xp: loot.xp, money: -loot.moneyLost, defeats: 1, energy: -10, action_points: -250,
            status: "Recondicionamento", status_ends_at: new Date(Date.now() + 20 * 60000).toISOString()
        });
    } else {
        msg = "EMPATE!";
        await playerStateService.updatePlayerState(attacker.userId, { energy: -10, action_points: -250 });
    }

    return {
      outcome,
      message: msg,
      loot,
      battleReport: { pPower: pP, oPower: dP, pIsCrit: pC, oIsCrit: dC }
    };
  }

  async _updateCombatLimits(userId, isPve) {
    const limitKey = isPve ? `combat:count:pve:${userId}` : `combat:count:pvp:${userId}`;
    const count = await redisClient.incrAsync(limitKey);
    
    // SÊNIOR: Novos Limites: 10 Bots Comuns (PvE) + 5 Jogadores Reais/Elite (PvP)
    const pveLimit = 10;
    const pvpLimit = 5;

    const pveCount = isPve ? count : parseInt(await redisClient.getAsync(`combat:count:pve:${userId}`) || 0);
    const pvpCount = !isPve ? count : parseInt(await redisClient.getAsync(`combat:count:pvp:${userId}`) || 0);
    
    if (pveCount >= pveLimit && pvpCount >= pvpLimit) {
      await redisClient.setAsync(`combat:reset_at:${userId}`, String(Date.now() + 86400000), "EX", 86400);
      await redisClient.delAsync(`combat:count:pve:${userId}`);
      await redisClient.delAsync(`combat:count:pvp:${userId}`);
    }
  }

  // SÊNIOR: Os métodos de combate ativo (Turn-Based) podem seguir o mesmo padrão de Snapshotting
  async startActiveCombat(userId, targetId) {
    const attacker = await playerStateService.getCombatSnapshot(userId);
    const isNpc = targetId.startsWith("npc_");
    const defender = isNpc ? radarService.generateNpcData(targetId, attacker) : await playerStateService.getCombatSnapshot(targetId);

    if (!attacker || !defender) throw new Error("Alvos não encontrados.");
    
    const state = {
      attacker,
      defender,
      turn: 1,
      isNpc
    };

    await redisClient.setAsync(`active_combat:${userId}`, JSON.stringify(state), "EX", 300);
    return { status: "combat_started", enemyName: defender.username };
  }

  /**
   * Processa um turno do combate ativo (Turn-Based)
   */
  async processActiveTurn(userId, action) {
    return redisClient.withLock(`combat_turn:${userId}`, 3000, async () => {
      const rawState = await redisClient.getAsync(`active_combat:${userId}`);
      if (!rawState) throw new Error("Combate expirado ou inexistente.");

      const state = JSON.parse(rawState);
      
      // Resolvendo Turno via GameLogic
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
        const isAttackerWin = state.defender.hp <= 0;
        const isKO = state.defender.stagger <= 0;
        
        const outcome = isAttackerWin ? (isKO ? "WIN_KO" : "WIN") : "LOSS";
        const report = await this._resolveLootAndStatus(state.attacker, state.defender, outcome, 0, 0, false, false);
        
        finalResult.outcome = outcome;
        finalResult.loot = report.loot;
        await redisClient.delAsync(`active_combat:${userId}`);
      } else {
        // Salva o estado parcial do turno
        await redisClient.setAsync(`active_combat:${userId}`, JSON.stringify(state), "EX", 300);
      }

      return finalResult;
    });
  }

  /**
   * SÊNIOR: Gera um snapshot de combate para o defensor, seja ele NPC ou Jogador.
   * Garante que todas as propriedades (powerSolo, critChance, etc) estejam presentes.
   */
  async _getDefenderSnapshot(targetId, attackerSnapshot) {
    const isNpc = targetId.startsWith("npc_");
    if (isNpc) {
      const npcData = radarService.generateNpcData(targetId, attackerSnapshot);
      // Ajuste manual de atributos do BOT se for Elite/Rare
      if (targetId.includes("_rare")) npcData.attack *= 1.3;
      
      const powerData = gameLogic.calculateTotalPower(npcData);
      return {
        ...npcData,
        powerSolo: powerData.powerSolo,
        critChance: gameLogic.calcCritChance(npcData),
        critMult: gameLogic.calcCritDamageMultiplier(npcData),
        hp: 100,
        maxHp: 100,
        stagger: 100
      };
    }
    return playerStateService.getCombatSnapshot(targetId);
  }
}

module.exports = new CombatService();
