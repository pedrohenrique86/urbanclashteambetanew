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
  const name = isRare ? `[BOSS] ${rawName}` : `[BOT] ${rawName}`;
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

    while (targets.length < 6) {
      const isRare = Math.random() < 0.05;
      const npcId = `npc_${Math.random().toString(36).substr(2, 9)}${isRare ? '_rare' : ''}`;
      const npcData = getNpcData(npcId, attacker);
      targets.push({ id: npcId, level: npcData.level, faction: npcData.faction, name: npcData.username, online: true, is_npc: true, is_rare: isRare });
    }
    await redisClient.setAsync(CACHE_KEY, JSON.stringify(targets), "EX", 18);
    return targets;
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

  async executeAttack(userId, targetId, tactic = 'technological') {
    const LOCK = `combat:lock:${userId}`;
    const isLocked = await redisClient.getAsync(LOCK);
    if (isLocked) throw new Error("Sincronização tática em andamento. Aguarde a conclusão da sequência.");
    
    await redisClient.setAsync(LOCK, "1", "EX", 15);

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
      const { isAttackerWin, isDraw, willBleed, rounds, xpBonus, moneyProtection } = result;

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
        const xpGain = Math.round(gameLogic.COMBAT.XP_WIN_BASE * challengeMod * xpBonus * (0.9 + Math.random() * 0.2));
        let money = isNpc ? Math.floor(50 + defender.level * 15) : Math.floor(defender.money * 0.12); 
        let statGain = isNpc ? (0.1 * challengeMod) : (0.5 + Math.random() * 1.0) * challengeMod;
        
        loot = { 
          xp: xpGain, money, outcome: "VITÓRIA",
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
                status_ends_at: new Date(Date.now() + 20 * 60000).toISOString(), defeats: 1 
              });
            }
          } else if (isDraw) {
            await playerStateService.updatePlayerState(userId, { 
              total_xp: loot.xp, attack: loot.stats.attack, defense: loot.stats.defense, focus: loot.stats.focus
            });
            if (!isNpc) await playerStateService.updatePlayerState(targetId, { total_xp: 5 });
          } else {
            await playerStateService.updatePlayerState(userId, { 
              money: -loot.moneyLost, total_xp: loot.xp, defeats: 1,
              status: "Recondicionamento", status_ends_at: new Date(Date.now() + 20 * 60000).toISOString()
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

      return {
        outcome: isAttackerWin ? "win_ko" : (isDraw ? "draw" : "loss_ko"), 
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
}

module.exports = new CombatService();
