const { query } = require("../config/database");
const playerStateService = require("./playerStateService");
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

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getHintPhrase(level) {
  return spectroEngine.generateSpectroTalk("detection");
}

function censorName(name) {
  if (!name) return "****";
  // Se já for um bot marcado, não censura
  if (name.includes("[BOT]")) return name;
  
  if (name.length <= 2) return name.charAt(0) + "***" + (name.length > 1 ? name.charAt(name.length-1) : "");
  return name.charAt(0) + "*****" + name.charAt(name.length - 1);
}

function getNpcData(targetId, attacker) {
  const isRare = targetId.includes("_rare");
  const seedStr = targetId.replace("npc_", "").replace("_rare", "");
  
  // Simple hash to pick name and variations deterministically
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  
  const attackerFaction = String(attacker.faction || '').toLowerCase();
  let pool = [];
  let botFaction = "Neutral";
  
  if (attackerFaction === 'guardioes' || attackerFaction === 'guardas') {
    botFaction = "Renegados";
    pool = RENEGADO_BOT_NAMES;
  } else if (attackerFaction === 'renegados' || attackerFaction === 'gangsters') {
    botFaction = "Guardiões";
    pool = GUARDIAO_BOT_NAMES;
  } else {
    pool = [...RENEGADO_BOT_NAMES, ...GUARDIAO_BOT_NAMES];
  }

  const nameIndex = Math.abs(hash) % pool.length;
  const rawName = pool[nameIndex];
  const name = isRare ? `[BOSS] ${rawName}` : `[BOT] ${rawName}`;

  // Deterministic level based on hash: level +/- 2
  const levelOff = (Math.abs(hash * 31) % 5) - 2; // -2 to +2
  const level = Math.max(1, Number(attacker.level) + levelOff);

  const isRenegado = botFaction.toLowerCase().includes("renegado") || botFaction.toLowerCase().includes("gangster");
  const isGuardiao = botFaction.toLowerCase().includes("guard") || botFaction.toLowerCase().includes("sentinela");

  // Base variation: 85% to 105% of player stats (common)
  let atkMult = isRare ? 1.3 : 0.85 + (Math.abs(hash % 21) / 100);
  let defMult = isRare ? 1.3 : 0.85 + (Math.abs((hash * 13) % 21) / 100);
  let focMult = isRare ? 1.3 : 0.85 + (Math.abs((hash * 7) % 21) / 100);

  // Faction Balancing: NPCs shift their "cloned" stats slightly to match their class
  if (isRenegado) {
    atkMult *= 1.1; // Renegades hit slightly harder
    defMult *= 0.9; // Renegades have slightly less HP
  } else if (isGuardiao) {
    atkMult *= 0.9; // Guardians hit slightly softer
    defMult *= 1.1; // Guardians have slightly more HP
  }

  return {
    username: name,
    level: level,
    attack:  Math.max(1, attacker.attack  * atkMult),
    defense: Math.max(1, attacker.defense * defMult),
    focus:   Math.max(1, attacker.focus   * focMult),
    intimidation: isRenegado ? 35.0 : 0.0,
    discipline: isGuardiao ? 40.0 : 0.0,
    energy: 100,
    money: isRare ? 500 : 0,
    faction: botFaction,
    is_npc: true,
    is_rare: isRare
  };
}

// ─── Motor de Decisão de Resultado ───────────────────────────────────────────

/**
 * Simula 3 turnos de dano detalhado para determinar o resultado e fornecer feedback numérico.
 *
 * @param {object} attacker - estado completo do atacante
 * @param {object} defender - estado completo do defensor
 * @returns {object} { outcome, turns, totals, metrics }
 */
function simulateCombat(attacker, defender) {
  const pMaxHP = gameLogic.calculateMaxHP(attacker);
  const tMaxHP = gameLogic.calculateMaxHP(defender);
  let pHP = pMaxHP;
  let tHP = tMaxHP;

  const turns = [];
  let outcome = "loss_ko"; // Fallback
  let finishedTurn = 3;
  
  let playerMomentum = 1.0;
  let targetMomentum = 1.0;

  for (let i = 0; i < 3; i++) {
    const pAtk = gameLogic.resolveCombatHit(attacker, defender, playerMomentum);
    const tAtk = gameLogic.resolveCombatHit(defender, attacker, targetMomentum);
    
    const pPrevHP = pHP;
    const tPrevHP = tHP;
    
    // Aplica danos principais
    tHP = Math.max(0, tHP - pAtk.damage);
    pHP = Math.max(0, pHP - tAtk.damage);

    // Aplica Incidentes (Novos Eventos)
    if (pAtk.incident) {
      if (pAtk.incident.selfDmgPct) pHP = Math.max(0, pHP - (pMaxHP * pAtk.incident.selfDmgPct));
      if (pAtk.incident.globalDmg) { tHP = Math.max(0, tHP - pAtk.incident.globalDmg); pHP = Math.max(0, pHP - pAtk.incident.globalDmg); }
    }
    if (tAtk.incident) {
      if (tAtk.incident.selfDmgPct) tHP = Math.max(0, tHP - (tMaxHP * tAtk.incident.selfDmgPct));
      if (tAtk.incident.globalDmg) { pHP = Math.max(0, pHP - tAtk.incident.globalDmg); tHP = Math.max(0, tHP - tAtk.incident.globalDmg); }
    }

    // Aplica Contra-Ataques (Real Data: Disciplina em ação)
    if (pAtk.isCounter) pHP = Math.max(0, pHP - pAtk.counterDamage);
    if (tAtk.isCounter) tHP = Math.max(0, tHP - tAtk.counterDamage);

    turns.push({
      attacker: { ...pAtk, hpBefore: tPrevHP, hpAfter: tHP, maxHP: tMaxHP },
      defender: { ...tAtk, hpBefore: pPrevHP, hpAfter: pHP, maxHP: pMaxHP }
    });

    // Calcula Momentum para o próximo round (+15% para quem causou mais dano)
    if (pAtk.damage > tAtk.damage) {
      playerMomentum = 1.15;
      targetMomentum = 0.90;
    } else if (pAtk.damage < tAtk.damage) {
      playerMomentum = 0.90;
      targetMomentum = 1.15;
    }

    // Check KO
    if (pHP <= 0 || tHP <= 0) {
      finishedTurn = i + 1;
      if (pHP <= 0 && tHP <= 0) outcome = "draw_dko";
      else if (tHP <= 0) outcome = "win_ko";
      else outcome = "loss_ko";
      break; 
    }
  }

  // Se ninguém morreu em 3 turnos, decide por pontos (HP restante)
  if (pHP > 0 && tHP > 0) {
    const pPct = pHP / pMaxHP;
    const tPct = tHP / tMaxHP;
    if (Math.abs(pPct - tPct) < 0.03) { // Janela reduzida para 3% para minimizar empates por decisão
      outcome = "draw_flee";
    } else {
      outcome = pPct > tPct ? "win_decision" : "loss_bleeding";
    }
  }

  return {
    outcome,
    turns,
    finishedTurn,
    totals: { 
      atkRemainingHP: pHP, 
      defRemainingHP: tHP,
      atkMaxHP: pMaxHP,
      defMaxHP: tMaxHP
    },
    metrics: {
      atkAura: turns[0].attacker.auraModifier,
      defAura: turns[0].defender.auraModifier,
      atkCritChance: turns[0].attacker.critChancePct,
      defCritChance: turns[0].defender.critChancePct
    }
  };
}

// ─── Emulador de Turnos Falsos para NPCs (Matriz de Probabilidade) ────────
function generateFauxTurns(attacker, defender, outcome) {
  const pMaxHP = gameLogic.calculateMaxHP(attacker);
  const tMaxHP = gameLogic.calculateMaxHP(defender);
  let pHP = pMaxHP;
  let tHP = tMaxHP;

  const turns = [];
  for (let i = 0; i < 3; i++) {
    let pDmg = 0;
    let tDmg = 0;
    
    if (outcome === "win_pure") {
       pDmg = Math.floor(tMaxHP / 3);
       tDmg = Math.floor(pMaxHP * 0.05);
    } else if (outcome === "win_bleeding") {
       pDmg = Math.floor(tMaxHP / 3);
       tDmg = Math.floor(pMaxHP * 0.25);
    } else if (outcome === "draw_flee") {
       pDmg = Math.floor(tMaxHP * 0.1);
       tDmg = Math.floor(pMaxHP * 0.1);
    } else if (outcome === "draw_dko") {
       pDmg = Math.floor(tMaxHP / 3);
       tDmg = Math.floor(pMaxHP / 3);
    } else { // loss_ko
       pDmg = Math.floor(tMaxHP * 0.05);
       tDmg = Math.floor(pMaxHP / 3);
    }

    if (i === 2) {
       if (outcome.startsWith("win")) pDmg = tHP;
       if (outcome === "loss_ko") tDmg = pHP;
       if (outcome === "draw_dko") { pDmg = tHP; tDmg = pHP; }
    }

    const tPrevHP = tHP;
    const pPrevHP = pHP;
    tHP = Math.max(0, tHP - pDmg);
    pHP = Math.max(0, pHP - tDmg);

    turns.push({
      attacker: { damage: pDmg, isCrit: (Math.random() < 0.2), isBreach: false, isEvaded: false, isCounter: false, hpBefore: tPrevHP, hpAfter: tHP, maxHP: tMaxHP, critChancePct: 15 },
      defender: { damage: tDmg, isCrit: (Math.random() < 0.2), isBreach: false, isEvaded: false, isCounter: false, hpBefore: pPrevHP, hpAfter: pHP, maxHP: pMaxHP, critChancePct: 10 }
    });
  }

  return { outcome, turns, finishedTurn: 3, totals: { atkRemainingHP: pHP, defRemainingHP: tHP, atkMaxHP: pMaxHP, defMaxHP: tMaxHP }, metrics: { atkAura: 1, defAura: 1, atkCritChance: 15, defCritChance: 10 } };
}

// ─── Serviço Principal ────────────────────────────────────────────────────────

class CombatService {

  async getRadarTargets(userId) {
    const attacker = await playerStateService.getPlayerState(userId);
    if (!attacker) throw new Error("Jogador não encontrado.");

    const attackerLevel = Number(attacker.level || 1);

    const result = await query(
      `SELECT p.user_id, p.level, p.faction, p.status, p.recovery_ends_at, p.shield_ends_at, u.username
       FROM user_profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id != $1
         AND p.level >= $2 AND p.level <= $3
         AND (p.status IS NULL OR p.status != 'Recondicionamento')
         AND (p.recovery_ends_at IS NULL OR p.recovery_ends_at < NOW())
         AND (p.shield_ends_at IS NULL OR p.shield_ends_at < NOW())
       ORDER BY RANDOM() LIMIT 20`,
      [userId, attackerLevel - 5, attackerLevel + 5]
    );

    const targets = result.rows.map(row => ({
      id:      row.user_id,
      level:   row.level,
      faction: row.faction,
      name:    censorName(row.username),
      online:  true,
      is_npc:  false
    }));

    // Lógica de NPCs: Se houver < 5 targets, gerar NPCs
    if (targets.length < 5) {
      const npcCount = 5 - targets.length;
      
      for (let i = 0; i < npcCount; i++) {
        const isRare = Math.random() < 0.05; // HVT: 5% de chance
        const npcId = `npc_${Math.random().toString(36).substr(2, 9)}${isRare ? '_rare' : ''}`;
        const npcData = getNpcData(npcId, attacker);

        const npc = {
          id:      npcId,
          level:   npcData.level,
          faction: npcData.faction,
          name:    npcData.username,
          online:  true,
          is_npc:  true,
          is_rare: isRare
        };

        if (isRare) {
          npc.expires_at = new Date(Date.now() + 60000).toISOString(); // 60 segundos
        }

        targets.push(npc);
      }
    }

    return targets;
  }

  async getPreCombatStatus(userId, targetId) {
    const attacker = await playerStateService.getPlayerState(userId);
    let defender;

    if (targetId.startsWith("npc_")) {
      defender = getNpcData(targetId, attacker);
    } else {
      defender = await playerStateService.getPlayerState(targetId);
    }

    if (!attacker || !defender) throw new Error("Jogadores indisponíveis.");

    const defLevel = Number(defender.level || 1);

    return {
      spectroHint: spectroEngine.generateSpectroTalk("detection"),
      targetInfo: {
        level:   defLevel,
        faction: defender.faction,
        name:    censorName(defender.username)
      }
    };
  }

  async executeAttack(userId, targetId) {
    const attacker = await playerStateService.getPlayerState(userId);
    let defender;
    let isNpc = false;
    let isRare = false;

    if (targetId.startsWith("npc_")) {
      isNpc = true;
      isRare = targetId.includes("_rare");
      defender = getNpcData(targetId, attacker);
    } else {
      defender = await playerStateService.getPlayerState(targetId);
    }

    if (!attacker) throw new Error("Atacante não encontrado.");
    if (!defender) throw new Error("Alvo não encontrado.");

    if (Number(attacker.level || 1) < 10)
      throw new Error("Você precisa estar no nível 10 para acessar o Acerto de Contas.");
    if (Number(attacker.energy || 0) < 50)
      throw new Error("Energia insuficiente (requer 50% para iniciar protocolo de combate).");
    if (Number(attacker.action_points || 0) < 300)
      throw new Error("Pontos de Ação (PA) insuficientes (requer 300 PA).");
    
    if (!isNpc) {
      if (defender.status === "Recondicionamento")
        throw new Error("O alvo já está em recondicionamento.");
      if (defender.shield_ends_at && new Date(defender.shield_ends_at) > new Date())
        throw new Error("O alvo está sob proteção de escudo.");
    }

    // ── Decisão do resultado (win / loss / draw_dko / draw_flee) ──────────────
    let combatData;
    let outcome;

    if (isNpc) {
      const roll = Math.random() * 100;
      if (isRare) {
        if (roll < 35) outcome = "win_pure";
        else if (roll < 65) outcome = "win_bleeding"; // 30%
        else if (roll < 75) outcome = "draw_flee"; // 10%
        else if (roll < 80) outcome = "draw_dko"; // 5%
        else outcome = "loss_ko"; // 20%
      } else {
        if (roll < 60) outcome = "win_pure";
        else if (roll < 75) outcome = "win_bleeding"; // 15%
        else if (roll < 85) outcome = "draw_flee"; // 10%
        else if (roll < 90) outcome = "draw_dko"; // 5%
        else outcome = "loss_ko"; // 10%
      }
      combatData = generateFauxTurns(attacker, defender, outcome);
    } else {
      combatData = simulateCombat(attacker, defender);
      outcome = combatData.outcome;
    }

    const isWin   = outcome.startsWith("win");
    const isLoss  = outcome.startsWith("loss");
    const isKO    = outcome.endsWith("_ko");

    // ── Geração Narrativa do Spectro (Anti-Repetição 15^4) ────────────────────
    const contextBase = {
      player_name: attacker.username,
      setor_cidade: CYBER_SETORS[Math.floor(Math.random() * CYBER_SETORS.length)],
      arma_equipada: CYBER_WEAPONS[Math.floor(Math.random() * CYBER_WEAPONS.length)],
      is_rare: isRare,
      is_draw_dko: outcome === "draw_dko",
      is_draw_flee: outcome === "draw_flee",
      is_loss: isLoss,
      is_bleeding: outcome === "loss_bleeding",
      is_ko: isKO
    };

    // ── 1. Cálculo do Loot Antes dos Logs ──────────────────────────────────────
    let loot = null;

    if (isWin) {
      let xpGain = Math.round(gameLogic.COMBAT.XP_WIN_BASE * (defender.level / attacker.level));
      if (isRare) xpGain *= 1.5;
      if (defender.level > attacker.level) xpGain *= 2;

      let moneyReceived = 0;
      let spectroTax = 0;

      if (isNpc) {
        moneyReceived = isRare ? 500 : 0;
      } else {
        const defMoney = Number(defender.money || 0);
        const moneyLoot = Math.floor(defMoney * 0.1);
        spectroTax = Math.floor(moneyLoot * 0.1);
        moneyReceived = moneyLoot - spectroTax;
      }

      let atkGain, defGain, focGain;
      if (isNpc) {
        atkGain = isRare ? 0.50 : 0.25;
        defGain = isRare ? 0.50 : 0.25;
        focGain = isRare ? 0.50 : 0.25;
      } else {
        const attDiffRatio = 0.001;
        atkGain = (Number(defender.attack  || 0) * attDiffRatio) || 1;
        defGain = (Number(defender.defense || 0) * attDiffRatio) || 1;
        focGain = (Number(defender.focus   || 0) * attDiffRatio) || 1;
      }

      loot = {
        xp:    xpGain,
        money: moneyReceived,
        tax:   spectroTax,
        stats: { attack: atkGain, defense: defGain, focus: focGain },
        rare_drop: isRare ? "Nucleo_Sombrio" : null,
        outcome: outcome === "win_ko" ? "K.O. - Vitória Esmagadora" : 
                 (outcome === "win_bleeding" ? "Vitória Custo Alto (Sangrando)" : "Decisão - Vitória Tática"),
        status: outcome === "win_bleeding" ? "Sangrando" : null,
        recoveryDuration: outcome === "win_bleeding" ? 15 : null,
        shieldDuration: outcome === "win_bleeding" ? 15 : null
      };

    } else if (isLoss) {
      const attackerMoney  = Number(attacker.money || 0);
      const moneyLost      = Math.floor(attackerMoney * 0.05);
      
      const isBleeding = outcome === "loss_bleeding";
      const recoveryDuration = isBleeding ? 15 : 30;
      const shieldDuration   = isBleeding ? 15 : 45;

      loot = {
        xp:        -gameLogic.COMBAT.XP_LOSE_BASE,
        moneyLost: moneyLost,
        status:    isBleeding ? "Sangrando" : "Recondicionamento",
        recoveryDuration,
        shieldDuration,
        outcome:   isBleeding ? "Derrota (Sangrando)" : "K.O. - Derrota Crítica"
      };

    } else if (outcome === "draw_dko") {
      loot = {
        xp:         0,
        energyLost: 100,
        status:     "Recondicionamento",
        outcome:    "D.K.O. - Empate Crítico"
      };
    } else { // draw_flee
      loot = {
        xp:         0,
        energyLost: 100,
        outcome:    "Fuga - Contato Interrompido"
      };
    }

    const targetNameCensored = censorName(defender.username);
    const targetNameReal     = defender.username;

    // Logs com valores reais
    const log = [];
    const hpLog = [];
    const usedFrags = new Set();

    combatData.turns.forEach((turn, index) => {
      const isLast = (index + 1) === combatData.finishedTurn;
      const targetName = isLast ? targetNameReal : targetNameCensored;
      
      let narrative = spectroEngine.construirNarrativa(index + 1, { 
        ...contextBase, 
        target_name: targetName,
        usedFrags 
      });
      
      // Detalhes Técnicos (HP e Críticos)
      const atkDmg = turn.attacker.damage;
      const defDmg = turn.defender.damage;
      const atkCrit = turn.attacker.isCrit ? ` [CRÍTICO! ${turn.attacker.critChancePct}%]` : "";
      const defCrit = turn.defender.isCrit ? ` [CRÍTICO! ${turn.defender.critChancePct}%]` : "";
      
      // Novos Eventos Robustos
      const atkBreach = turn.attacker.isBreach ? " [BREACH: Defesa Rompida!]" : "";
      const defBreach = turn.defender.isBreach ? " [BREACH: Defesa Inimiga Rompida!]" : "";
      const atkEvade = turn.attacker.isEvaded ? " [EVASÃO: Passou Raspando!]" : "";
      const defEvade = turn.defender.isEvaded ? " [EVASÃO: Alvo Desviou!]" : "";
      const atkCounter = turn.attacker.isCounter ? ` [CONTRA-GOLPE: +${turn.attacker.counterDamage} Dano!]` : "";
      const defCounter = turn.defender.isCounter ? ` [RECHAÇO: -${turn.defender.counterDamage} Vida!]` : "";
      
      const pIncident = turn.defender.incident ? ` [EVENTO: ${turn.defender.incident.label}]` : "";
      const aIncident = turn.attacker.incident ? ` [ALERTA: ${turn.attacker.incident.label}]` : "";

      const pHP = turn.defender.hpAfter;
      const tHP = turn.attacker.hpAfter;
      const pMax = turn.defender.maxHP;
      const tMax = turn.attacker.maxHP;

      const pMomentum = turn.defender.modifiers?.momentum > 1 ? " [Inimigo Dominando]" : "";
      const aMomentum = turn.attacker.modifiers?.momentum > 1 ? " [Você no Ataque!]" : "";

      narrative += `\n>> DANO: Você causou ${atkDmg}${atkCrit}${atkBreach}${defEvade}${atkCounter}${aIncident}`;
      narrative += `\n>> DANO: Recebeu ${defDmg}${defCrit}${defBreach}${atkEvade}${defCounter}${pIncident}`;
      narrative += `\n>> HP: Você [${pHP}/${pMax}]${pMomentum} | Oponente [${tHP}/${tMax}]${aMomentum}`;
      
      // EXIBIÇÃO DE RECOMPENSAS NO ÚLTIMO TURNO
      if (isLast && loot) {
        narrative += `\n\n=== [ PROTOCOLO ENCERRADO: ${loot.outcome?.toUpperCase()} ] ===`;
        if (isWin) {
          narrative += `\n+ ${loot.xp} XP`;
          if (loot.money > 0) narrative += `\n+ $${loot.money} Dinheiro (Taxa Spectro: $${loot.tax})`;
          narrative += `\n+ ATRIBUTOS: ATK +${Number(loot.stats.attack).toFixed(2)} | DEF +${Number(loot.stats.defense).toFixed(2)} | FOC +${Number(loot.stats.focus).toFixed(2)}`;
          if (loot.rare_drop) narrative += `\n+ ITEM RARO ENCONTRADO: [${loot.rare_drop}]`;
        } else if (isLoss) {
          narrative += `\n- PERDA: ${Math.abs(loot.xp)} XP`;
          if (loot.moneyLost > 0) narrative += `\n- MULTA: $${loot.moneyLost} Dinheiro`;
          narrative += `\n! STATUS: Seu kernel está em [${loot.status}] por ${loot.recoveryDuration} min.`;
        } else {
           narrative += `\n! RESULTADO: Sem ganhos expressivos. Conexão perdida.`;
        }
      }

      log.push(narrative);

      hpLog.push({
        defenderHP: pHP,
        attackerHP: tHP,
        defenderMaxHP: pMax,
        attackerMaxHP: tMax
      });
    });

    // ── 2. Persistência no Banco (DB Updates) ──────────────────────────────────
    if (isWin) {
      let stateUpdate = {
        action_points: -300,
        energy:    -50,
        money:     loot.money,
        total_xp:  loot.xp,
        attack:    loot.stats.attack,
        defense:   loot.stats.defense,
        focus:     loot.stats.focus,
        victories: 1
      };
      
      if (outcome === "win_bleeding") {
         stateUpdate.status = "Sangrando";
         stateUpdate.status_ends_at = new Date(Date.now() + 15 * 60000).toISOString();
         stateUpdate.recovery_ends_at = new Date(Date.now() + 15 * 60000).toISOString();
         stateUpdate.shield_ends_at = new Date(Date.now() + 15 * 60000).toISOString();
      }

      await playerStateService.updatePlayerState(userId, stateUpdate);

      if (!isNpc) {
        const recoveryEndsAt = new Date(Date.now() + 15 * 60000).toISOString();
        const shieldEndsAt   = new Date(Date.now() + 45 * 60000).toISOString();

        await playerStateService.updatePlayerState(targetId, {
          money:            -Number(loot.money + loot.tax),
          energy:           -10,
          status:           "Recondicionamento",
          status_ends_at:   recoveryEndsAt,
          recovery_ends_at: recoveryEndsAt,
          shield_ends_at:   shieldEndsAt,
          defeats:          1
        });
      }
    } else if (isLoss) {
      const recoveryEndsAt = new Date(Date.now() + loot.recoveryDuration * 60000).toISOString();
      const shieldEndsAt   = new Date(Date.now() + loot.shieldDuration * 60000).toISOString();

      await playerStateService.updatePlayerState(userId, {
        action_points:    -300,
        energy:           isKO ? -(Number(attacker.energy || 0)) : -50,
        money:            -loot.moneyLost,
        status:           loot.status,
        status_ends_at:   recoveryEndsAt,
        recovery_ends_at: recoveryEndsAt,
        shield_ends_at:   shieldEndsAt,
        defeats:          1
      });
    } else if (outcome === "draw_dko") {
      const halfRecovery = new Date(Date.now() + 7.5 * 60000).toISOString();
      const halfShield   = new Date(Date.now() + 22.5 * 60000).toISOString();

      await playerStateService.updatePlayerState(userId, {
        action_points:    -300,
        energy:           -50,
        status:           "Recondicionamento",
        status_ends_at:   halfRecovery,
        recovery_ends_at: halfRecovery,
        shield_ends_at:   halfShield
      });

      if (!isNpc) {
        await playerStateService.updatePlayerState(targetId, {
          energy:           -10,
          status:           "Recondicionamento",
          status_ends_at:   halfRecovery,
          recovery_ends_at: halfRecovery,
          shield_ends_at:   halfShield
        });
      }
    } else { // draw_flee
      await playerStateService.updatePlayerState(userId,   { action_points: -300, energy: -50 });
      if (!isNpc) await playerStateService.updatePlayerState(targetId, { energy: -10 });
    }

    return {
      outcome,
      winner: isWin,
      log,
      hpLog,
      loot,
      details: {
        totals: combatData.totals,
        metrics: combatData.metrics
      },
      targetRealName: isNpc ? defender.username : defender.username,
      spectroComment: isWin ? spectroEngine.generateSpectroTalk("victory") : (outcome.startsWith("draw") ? spectroEngine.generateSpectroTalk("timeout") : spectroEngine.generateSpectroTalk("detection"))
    };
  }
}

module.exports = new CombatService();
