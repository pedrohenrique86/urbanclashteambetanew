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
  // Se já for um bot marcado ou um boss, não censura
  if (name.includes("[BOT]") || name.includes("[BOSS]")) return name;
  
  if (name.length <= 2) return name.charAt(0) + "***" + (name.length > 1 ? name.charAt(name.length-1) : "");
  return name.charAt(0) + "*****" + name.charAt(name.length - 1);
}

function getNpcData(targetId, attacker) {
  const isRare = targetId.includes("_rare");
  const seedStr = targetId.replace("npc_", "").replace("_rare", "");
  
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  
  const rawFaction = attacker?.faction || 'gangsters';
  const attackerFaction = String(rawFaction).toLowerCase().trim();
  
  let pool = [];
  let botFaction = "Neutral";
  
  if (attackerFaction === 'guardioes' || attackerFaction === 'guardas' || attackerFaction.includes('guard')) {
    botFaction = "Renegados";
    pool = RENEGADO_BOT_NAMES;
  } else if (attackerFaction === 'renegados' || attackerFaction === 'gangsters' || attackerFaction.includes('renegad')) {
    botFaction = "Guardiões";
    pool = GUARDIAO_BOT_NAMES;
  } else {
    pool = [...RENEGADO_BOT_NAMES, ...GUARDIAO_BOT_NAMES];
  }

  const nameIndex = Math.abs(hash) % pool.length;
  const rawName = pool[nameIndex];
  const name = isRare ? `[BOSS] ${rawName}` : `[BOT] ${rawName}`;

  // Nível determinístico: +/- 2 do nível do atacante
  const attackerLevel = Number(attacker?.level || 10);
  const levelOff = (Math.abs(hash * 31) % 5) - 2; 
  const level = Math.max(1, (isNaN(attackerLevel) ? 10 : attackerLevel) + levelOff);

  const isRenegado = botFaction.toLowerCase().includes("renegado") || botFaction.toLowerCase().includes("gangster");
  const isGuardiao = botFaction.toLowerCase().includes("guard") || botFaction.toLowerCase().includes("sentinela");

  const playerAtk = Number(attacker?.attack || 10);
  const playerDef = Number(attacker?.defense || 10);
  const playerFoc = Number(attacker?.focus || 10);
  const playerPower = playerAtk + playerDef + playerFoc;
  const pLvl = Number(attacker?.level || 10);
  
  // Ratio de dificuldade baseado na diferença de nível
  const levelDiff = level - pLvl; 
  let difficultyMod = 1.0;

  if (levelDiff <= -3) {
    difficultyMod = 0.75; // Reduzido mas ainda perigoso
  } else if (levelDiff < 0) {
    difficultyMod = 0.88; // Um pouco mais desafiador
  } else if (levelDiff === 0) {
    difficultyMod = 0.98; // Praticamente um espelho do player
  } else {
    // Escala 15% de poder extra para cada nível acima do player
    difficultyMod = 1.0 + (levelDiff * 0.15);
  }

  let totalStatPool = playerPower * difficultyMod;
  if (isRare) totalStatPool *= 1.45;

  let atkPct = 0.33, defPct = 0.33, focPct = 0.34;

  if (isRenegado) {
    atkPct = 0.55; defPct = 0.20; focPct = 0.25;
  } else if (isGuardiao) {
    atkPct = 0.20; defPct = 0.55; focPct = 0.25;
  }

  // Jitter determinístico para variar a "build" do bot (+/- 15%)
  const jitter = (h, salt) => 0.85 + (Math.abs(h * salt) % 31) / 100;
  
  const finalAtk = Math.round(totalStatPool * atkPct * jitter(hash, 3));
  const finalDef = Math.round(totalStatPool * defPct * jitter(hash, 7));
  const finalFoc = Math.round(totalStatPool * focPct * jitter(hash, 13));

  return {
    username: name,
    level: level,
    attack:  Math.max(1, finalAtk),
    defense: Math.max(1, finalDef),
    focus:   Math.max(1, finalFoc),
    critical_chance: Math.max(1, Math.round(level * 0.2)),
    critical_damage: Math.max(1, Math.round(level * 0.4)),
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
/**
 * SIMULADOR TRI-CLASH v8 (Segmented Strategic Duel)
 * Resolve 3 conflitos diretos baseados em atributos.
 */
function simulateCombat(attacker, defender) {
  const result = gameLogic.resolveWinOutcome(attacker, defender);
  const { logs, isAttackerWin, isOverkill } = result;

  const turns = [];
  let pHP = 100;
  let tHP = 100;
  
  // Mapeia os 4 logs de segmento para turnos narrativos (SQUADRON CLASH)
  logs.forEach((log, index) => {
    const isAttWinSegment = log.winner === "attacker";
    
    // SÊNIOR: Dano Diluído para 4 rounds (24-34% por vitória)
    const pDmg = isAttWinSegment ? (24 + Math.floor(Math.random() * 10)) : (4 + Math.floor(Math.random() * 5)); 
    const tDmg = !isAttWinSegment ? (24 + Math.floor(Math.random() * 10)) : (4 + Math.floor(Math.random() * 5));
    
    const pBefore = pHP;
    const tBefore = tHP;

    tHP = Math.max(0, tHP - pDmg);
    pHP = Math.max(0, pHP - tDmg);

    // No último turno, finalizamos as barras conforme o veredito matemático
    if (index === logs.length - 1) {
      if (isAttackerWin) tHP = 0; else pHP = 0;
    }

    turns.push({
      round: index + 1,
      segment: log.segment,
      scoreText: log.score,
      attacker: { 
        damage: pDmg, 
        isCrit: isAttWinSegment && (isOverkill || pDmg > 30),
        hpBefore: tBefore,
        hpAfter: tHP,
        maxHP: 100
      },
      defender: { 
        damage: tDmg,
        isCrit: !isAttWinSegment && !isAttackerWin && tDmg > 30,
        hpBefore: pBefore,
        hpAfter: pHP,
        maxHP: 100
      }
    });
  });

  return {
    outcome: isAttackerWin ? "win_ko" : "loss_ko",
    turns,
    finishedTurn: logs.length,
    totals: { atkRemainingHP: pHP, defRemainingHP: tHP, atkMaxHP: 100, defMaxHP: 100 },
    metrics: {
      score: result.score,
      isOverkill: result.isOverkill
    }
  };
}

// ─── Emulador de Turnos Falsos para NPCs (Matriz de Probabilidade) ────────
// SÊNIOR: generateFauxTurns removido. Agora todos os combates usam o simulador real.


// ─── Serviço Principal ────────────────────────────────────────────────────────

/**
 * SÊNIOR: Verifica se duas facções são opostas (Guardiões x Renegados)
 */
function areFactionsOpposite(f1, f2) {
  if (!f1 || !f2) return false;
  const aliasMap = {
    'gangsters': 'R', 'gangster': 'R', 'renegados': 'R', 'renegado': 'R',
    'guardas': 'G', 'guarda': 'G', 'guardioes': 'G', 'guardiao': 'G', 'guardiões': 'G', 'guardião': 'G'
  };
  const type1 = aliasMap[String(f1).toLowerCase().trim()];
  const type2 = aliasMap[String(f2).toLowerCase().trim()];
  if (!type1 || !type2) return false;
  return type1 !== type2;
}

class CombatService {

  async getRadarTargets(userId) {
    const CACHE_KEY = `radar_lock:${userId}`;
    try {
      const cached = await redisClient.getAsync(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch(e) {
      console.warn(`[combat/radar] Erro ao ler cache do radar: ${e.message}`);
    }

    const attacker = await playerStateService.getPlayerState(userId);
    if (!attacker) {
      console.error(`[combat/radar] ❌ Estado do atacante não encontrado para UID: ${userId}`);
      throw new Error("Não foi possível carregar seu estado de jogador. Tente novamente em instantes.");
    }

    // SÊNIOR: Trava de Nível para o Radar
    const attackerLevel = Number(attacker?.level || 1);
    if (attackerLevel < 10) {
      throw new Error("Acesso negado: Você precisa atingir o nível 10 para operar o Rastreador Spectro.");
    }

    // SÊNIOR: Se o estado no Redis estiver capado, apenas ignoramos para performance.
    if (!attacker.username || !attacker.faction) {
      console.warn(`[combat/radar] ⚠️ Estado incompleto no Redis para ${userId}. Ignorando processamento pesado.`);
    }

    const ONLINE_SET_KEY = "online_players_set";
    let targets = [];

    // ── 1. Busca jogadores ONLINE no Redis (Pool de Alta Performance) ───────────
    try {
      // SÊNIOR: Identifica a facção oposta para busca direta via Índice O(1).
      // Isso elimina a necessidade de filtrar facções no JS, economizando ciclos de CPU.
      const myFaction = (attacker.faction || "").toLowerCase().trim();
      const enemyFactionKey = myFaction.includes('guard') ? 'gangsters' : 'guardas';
      const ENEMY_SET_KEY = `${ONLINE_SET_KEY}:${enemyFactionKey}`;

      // Amostragem de IDs da facção rival
      const rawIds = await redisClient.sRandMemberAsync(ENEMY_SET_KEY, 80);
      const onlineIds = (rawIds || []).filter(id => id !== String(userId));

      if (onlineIds.length > 0) {
        // SÊNIOR: PIPELINE CIRÚRGICO
        // Buscamos apenas os campos necessários. O range de 80 é suficiente 
        // já que todos os 80 são garantidamente da facção oposta.
        const TARGET_FIELDS = ['username', 'level', 'status', 'shield_ends_at'];
        const multi = redisClient.pipeline();
        
        onlineIds.forEach(id => {
          multi.hmGet(`${playerStateService.PLAYER_STATE_PREFIX}${id}`, TARGET_FIELDS);
        });

        const multiResults = await multi.exec();

        onlineIds.forEach((id, idx) => {
          const values = multiResults[idx];
          if (!values || !values[0]) return; 

          const [username, level, status, shield_ends_at] = values;
          const targetLevel = Number(level || 1);

          // SÊNIOR: Filtro de Nível (O(1) em memória)
          const isLevelInRange = targetLevel >= 10 && targetLevel >= (attackerLevel - 3) && targetLevel <= (attackerLevel + 3);

          const isEligible = 
            isLevelInRange &&
            (status !== 'Recondicionamento' && status !== 'Isolamento') &&
            (!shield_ends_at || new Date(shield_ends_at) < new Date());

          if (isEligible) {
            targets.push({
              id,
              level:   targetLevel,
              faction: enemyFactionKey === 'gangsters' ? 'Renegados' : 'Guardiões',
              name:    censorName(username),
              online:  true,
              is_npc:  false
            });
          }
        });
      }
    } catch (redisError) {
      console.error(`[combat/radar] ⚠️ Falha crítica no processamento Redis: ${redisError.message}`);
    }

    // SÊNIOR: Fallback ao Banco de Dados REMOVIDO para suportar 5000+ jogadores.
    // IO de disco em radar randômico é proibitivo e gera gargalos de travas no PostgreSQL.
    // Se a rede estiver vazia de players reais no range, o sistema escala com NPCs.
    
    // Limita exibição para não poluir UI, priorizando jogadores reais
    targets = targets.sort((a, b) => (a.is_npc ? 1 : -1)).slice(0, 20);

    // ── 3. Geração de NPCs (fallback garantido) ─────────────────────────────────
    if (targets.length < 5) {
      const npcCount = 5 - targets.length;
      
      for (let i = 0; i < npcCount; i++) {
        try {
          const isRare = Math.random() < 0.02; // SÊNIOR: Frequência de BOSS reduzida para 2% (raro)
          const npcId = `npc_${Math.random().toString(36).substr(2, 9)}${isRare ? '_rare' : ''}`;
          const npcData = getNpcData(npcId, attacker);

          const npc = {
            id:      npcId,
            level:   npcData.level || attackerLevel,
            faction: npcData.faction || 'Neutral',
            name:    npcData.username || `[BOT] Unit_${i}`,
            online:  true,
            is_npc:  true,
            is_rare: isRare
          };

          if (isRare) {
            npc.expires_at = new Date(Date.now() + 60000).toISOString(); // 60 segundos
          }

          targets.push(npc);
        } catch (npcError) {
          console.error(`[combat/radar] ⚠️ Falha ao gerar NPC ${i}: ${npcError.message}`);
        }
      }
    }

    // Trava do Radar: Salva no Redis por 18 segundos. F5 Spam retorna sempre a mesma lista.
    try {
      await redisClient.setAsync(CACHE_KEY, JSON.stringify(targets), "EX", 18);
    } catch(e) {
      console.warn(`[combat/radar] Erro ao salvar cache do radar: ${e.message}`);
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
    const pMaxHP = gameLogic.calculateMaxHP(attacker);
    const tMaxHP = gameLogic.calculateMaxHP(defender);

    return {
      spectroHint: spectroEngine.generateSpectroTalk("detection"),
      targetInfo: {
        level:   defLevel,
        faction: defender.faction,
        name:    censorName(defender.username),
        hp:      tMaxHP,
        maxHP:   tMaxHP
      },
      playerInfo: {
        hp:      pMaxHP,
        maxHP:   pMaxHP
      }
    };
  }

  async executeAttack(userId, targetId) {
    const COMBAT_LOCK_KEY = `lock:combat:${userId}`;
    const hasLock = await redisClient.setNXAsync(COMBAT_LOCK_KEY, "1", 5000);
    if (!hasLock) throw new Error("Protocolo de combate já em execução.");

    try {
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
      if (attacker.status === "Isolamento")
        throw new Error("Você está em isolamento e não pode acessar a rede de combate.");
      if (attacker.status === "Recondicionamento")
        throw new Error("Seu sistema ainda está em recondicionamento.");
      if (Number(attacker.action_points || 0) < 300)
        throw new Error("Pontos de Ação (PA) insuficientes (requer 300 PA).");
      
      if (!isNpc) {
        // SÊNIOR: Validação de Integridade de Matchmaking (Anti-Gambiarra)
        const targetLevel = Number(defender.level || 1);
        const attackerLevel = Number(attacker.level || 10);
        const isLevelInRange = targetLevel >= 10 && targetLevel >= (attackerLevel - 3) && targetLevel <= (attackerLevel + 3);
        const isOpposite = areFactionsOpposite(attacker.faction, defender.faction);

        if (!isLevelInRange || !isOpposite) {
          throw new Error("O alvo não é mais elegível para interceptação (Nível/Facção fora dos protocolos).");
        }

        if (defender.status === "Recondicionamento")
          throw new Error("O alvo já está em recondicionamento.");
        if (defender.shield_ends_at && new Date(defender.shield_ends_at) > new Date())
          throw new Error("O alvo está sob proteção de escudo.");
      }

      // ── Execução de Simulação de Combate Única (SSOT) ─────────────────────────
      const combatData = simulateCombat(attacker, defender);
      const outcome    = combatData.outcome;


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
        is_ko: isKO,
        faction: attacker.faction || "Renegado"
      };

      // ── 1. Cálculo do Loot Antes dos Logs ──────────────────────────────────────
      // ── 1. Cálculo do Loot Antes dos Logs ──────────────────────────────────────
      let loot = null;

      // SÊNIOR: Poder Relativo (challengeMod) deve ser calculado antes de vitórias/derrotas
      const pPow = (Number(attacker.attack || 10) + Number(attacker.defense || 10) + Number(attacker.focus || 10));
      const tPow = (Number(defender.attack || 10) + Number(defender.defense || 10) + Number(defender.focus || 10));
      const challengeMod = Math.min(2.0, Math.max(0.3, tPow / pPow));

      if (isWin) {
        // ── DINAMIZAÇÃO DE RECOMPENSAS (ANTI-ESTÁTICO) ──
        
        let xpGain = Math.floor(gameLogic.COMBAT.XP_WIN_BASE * challengeMod);
        if (isRare) xpGain *= 1.8; // Multiplicador de Boss
        
        // Variância Natural (0.8x a 1.2x)
        xpGain *= (0.8 + Math.random() * 0.4);
        
        // Spectro Insight (5% de chance de XP Crítico)
        let isCriticalInsight = false;
        if (Math.random() < 0.05) {
          xpGain *= 2;
          isCriticalInsight = true;
        }
        
        // Trava de Segurança: Piso 10, Teto 300
        xpGain = Math.max(10, Math.min(300, Math.round(xpGain)));

        // 2. DINHEIRO ESCALONADO
        let moneyReceived = 0;
        let taxPvP = 0;

        if (isNpc) {
          if (isRare) {
             // Bosses: $60/nível + bônus robusto
             moneyReceived = Math.floor(Number(defender.level) * 60 + 200 + (Math.random() * 500));
          } else {
             // Bots Comuns: $40 + $10 por nível + bônus de sucata
             moneyReceived = Math.floor(40 + (Number(defender.level) * 10) + (Math.random() * 20));
          }
        } else {
          const defMoney = Number(defender.money || 0);
          const totalLossPvP = Math.floor(defMoney * 0.10); // Loser loses 10%
          moneyReceived = Math.floor(totalLossPvP * 0.90);  // Winner gets 90% of that loss
          taxPvP = totalLossPvP - moneyReceived;           // The rest is tax
        }

        const statBase = isRare ? 0.50 : 0.25;
        const genStat = (base) => base * (0.6 + Math.random() * 0.8) * challengeMod;

        const atkGain = Math.round(genStat(statBase) * 100) / 100;
        const defGain = Math.round(genStat(statBase) * 100) / 100;
        const focGain = Math.round(genStat(statBase) * 100) / 100;

        loot = {
          xp:    xpGain,
          is_xp_crit: isCriticalInsight,
          money: moneyReceived,
          tax: taxPvP,
          stats: { attack: atkGain, defense: defGain, focus: focGain },
          rare_drop: isRare ? "Nucleo_Sombrio" : null,
          outcome: outcome === "win_ko" ? "K.O. - Vitória Esmagadora" : 
                   (outcome === "win_bleeding" ? "Vitória Custo Alto (Sangrando)" : "Decisão - Vitória Tática"),
          status: outcome === "win_bleeding" ? "Sangrando" : null
          // Nota: win_bleeding usa BLEEDING_DURATION_MS diretamente na persistência (único ponto de verdade)
        };

      } else if (isLoss) {
        const attackerMoney  = Number(attacker.money || 0);
        
        // Punição Dinâmica: Perda baseada no desafio
        // Se desafiou alguém forte e perdeu, a punição é mínima.
        const moneyLost = Math.floor(attackerMoney * 0.03 * (1 / challengeMod));
        const xpLoss    = Math.floor(gameLogic.COMBAT.XP_WIN_BASE * challengeMod * 0.3);
        
        const isBleeding = outcome === "loss_bleeding";
        const recoveryDuration = isBleeding ? 15 : 30; 
        const shieldDuration   = isBleeding ? 15 : 45; 

        loot = {
          xp:        -xpLoss,
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
          player_name: attacker.username,
          target_name: targetName,
          setor_cidade: CYBER_SETORS[Math.floor(Math.random() * CYBER_SETORS.length)],
          arma_equipada: attacker.weapon || CYBER_WEAPONS[Math.floor(Math.random() * CYBER_WEAPONS.length)],
          faction: attacker.faction,
          usedFrags
        }, {
          attacker: turn.attacker,
          defender: turn.defender
        });
        
        // EXIBIÇÃO DE RECOMPENSAS NO ÚLTIMO TURNO
        if (isLast && loot) {
          narrative += `\n\n=== [ PROTOCOLO ENCERRADO: ${loot.outcome?.toUpperCase()} ] ===`;
          if (isWin) {
            narrative += `\n+ ${loot.xp} XP | + $${loot.money} CASH`;
            narrative += `\n+ STATUS: ATK +${Number(loot.stats.attack).toFixed(2)} | DEF +${Number(loot.stats.defense).toFixed(2)} | FOC +${Number(loot.stats.focus).toFixed(2)}`;
          } else if (isLoss) {
            narrative += `\n- PERDA: ${Math.abs(loot.xp)} XP | - $${loot.moneyLost} CASH`;
            narrative += `\n! KERNEL EM ${loot.status.toUpperCase()} (${loot.recoveryDuration} min)`;
          }
        }

        log.push(narrative);

        hpLog.push({
          defenderHP: turn.defender.hpAfter,
          attackerHP: turn.attacker.hpAfter,
          defenderMaxHP: turn.defender.maxHP,
          attackerMaxHP: turn.attacker.maxHP
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
          victories: 1,
          winning_streak: 1 // hIncrBy will add 1
        };
        
        if (outcome === "win_bleeding") {
           stateUpdate.status = "Sangrando";
           const BLEEDING_DURATION_MIN = 15;
           const bleedingMs = Math.min(30, BLEEDING_DURATION_MIN) * 60 * 1000;
           const bleedingEndsAt = new Date(Date.now() + bleedingMs).toISOString();
           stateUpdate.status_ends_at    = bleedingEndsAt;
           stateUpdate.recovery_ends_at  = bleedingEndsAt;
           stateUpdate.shield_ends_at    = bleedingEndsAt;
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
            defeats:          1,
            winning_streak:   "0" // Overwrites with string "0" (reset)
          });
        }
      } else if (isLoss) {
        const safeDuration = Math.min(30, loot.recoveryDuration ?? 30);
        const safeShield   = Math.min(45, loot.shieldDuration   ?? 45);
        const recoveryEndsAt = new Date(Date.now() + safeDuration * 60 * 1000).toISOString();
        const shieldEndsAt   = new Date(Date.now() + safeShield   * 60 * 1000).toISOString();

        await playerStateService.updatePlayerState(userId, {
          action_points:    -300,
          energy:           isKO ? -(Number(attacker.energy || 0)) : -50,
          money:            -loot.moneyLost,
          total_xp:         loot.xp,
          status:           loot.status,
          status_ends_at:   recoveryEndsAt,
          recovery_ends_at: recoveryEndsAt,
          shield_ends_at:   shieldEndsAt,
          defeats:          1,
          winning_streak:   "0" // Reset on loss
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
          shield_ends_at:   halfShield,
          winning_streak:   "0" // Reset on draw DKO (both fall)
        });

        if (!isNpc) {
          await playerStateService.updatePlayerState(targetId, {
            energy:           -10,
            status:           "Recondicionamento",
            status_ends_at:   halfRecovery,
            recovery_ends_at: halfRecovery,
            shield_ends_at:   halfShield,
            winning_streak:   "0"
          });
        }
      } else { // draw_flee
        await playerStateService.updatePlayerState(userId,   { action_points: -300, energy: -50 });
        if (!isNpc) await playerStateService.updatePlayerState(targetId, { energy: -10 });
      }

      // ── 3. Registro de Log de Auditoria & Histórico ──────────────────────────
      actionLogService.log(userId, "combat", isNpc ? "npc" : "player", targetId, {
        outcome: outcome,
        target_name: defender.username,
        xp_gain: loot?.xp || 0,
        money_gain: loot?.money || 0,
        money_loss: loot?.moneyLost || 0,
        stats_gained: loot?.stats ? {
          atk: loot.stats.attack,
          def: loot.stats.defense,
          foc: loot.stats.focus
        } : null,
        is_rare: isRare
      });

      return {
        outcome,
        winner: isWin,
        log,
        hpLog,
        loot,
        details: { totals: combatData.totals, metrics: combatData.metrics, turns: combatData.turns },
        targetRealName: defender.username,
        spectroComment: isWin ? spectroEngine.generateSpectroTalk("victory") : (outcome.startsWith("draw") ? spectroEngine.generateSpectroTalk("timeout") : spectroEngine.generateSpectroTalk("detection"))
      };
    } finally {
      await redisClient.delAsync(COMBAT_LOCK_KEY);
    }
  }
}

module.exports = new CombatService();
