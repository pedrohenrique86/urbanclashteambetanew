const { query } = require("../config/database");
const playerStateService = require("./playerStateService");
const gameLogic = require("../utils/gameLogic");
const spectroEngine = require("../utils/spectroEngine");

// ─── Frases do Spectro ────────────────────────────────────────────────────────

// ─── Frases do Spectro ────────────────────────────────────────────────────────

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

const SPECTRO_PHRASES = {
  hints: {
    low: [
      "Alvo fácil. Vai ser como deletar um arquivo corrompido.",
      "Nem precisa de firewall pra esse aí.",
      "Fraco. Vai fundo e limpa a lixeira."
    ],
    balanced: [
      "50/50. Vai depender de quem bater primeiro.",
      "Nível equilibrado. Mantém o foco e não erra o timing.",
      "Essa vai ser acirrada, cuidado na execução."
    ],
    high: [
      "Esse sinal tá pesado... se eu fosse você, pediria reforços.",
      "Alvo cascudo. Verifica teus buffs antes de entrar.",
      "Alerta vermelho. A chance de tomar DC da vida é grande."
    ]
  }
};

// Rastreadores de frases já usadas (pool reinicia ao esgotar)
const _usedDko  = new Set();
const _usedFlee = new Set();

// ─── Helpers de narrativa ─────────────────────────────────────────────────────

function getRandomPhrase(category, attackerToken = "Atacante", defenderToken = "Alvo") {
  const phrases = SPECTRO_PHRASES[category];
  const phrase  = phrases[Math.floor(Math.random() * phrases.length)];
  return phrase
    .replace("{{attacker}}", attackerToken)
    .replace("{{defender}}", defenderToken);
}

/**
 * Retorna uma frase de empate sem repetir até esgotar o pool inteiro.
 * Garante que o Spectro nunca repita a mesma frase na mesma sessão.
 */
function getUniqueDrawPhrase(category) {
  const phrases = SPECTRO_PHRASES[category];
  const tracker = category === "draw_dko" ? _usedDko : _usedFlee;

  if (tracker.size >= phrases.length) tracker.clear(); // reinicia pool após esgotar

  let idx;
  do {
    idx = Math.floor(Math.random() * phrases.length);
  } while (tracker.has(idx));

  tracker.add(idx);
  return phrases[idx];
}

function getHintPhrase(level) {
  return spectroEngine.generateSpectroTalk("detection");
}

function censorName(name) {
  if (!name || name.length <= 2) return "U***";
  return name.charAt(0) + "********" + name.charAt(name.length - 1);
}

// ─── Motor de Decisão de Resultado ───────────────────────────────────────────

/**
 * Simula 3 turnos de dano acumulado de cada lado para determinar o resultado.
 *
 * Zona de Empate: se |atkTotal - defTotal| / max(atkTotal, defTotal) < 2%
 *   → 80% draw_dko  (Double Knockout)
 *   → 20% draw_flee (Fuga / Interrupção)
 *
 * Caso contrário:
 *   → 'win'  se atkTotal >= defTotal
 *   → 'loss' se defTotal >  atkTotal
 *
 * @param {object} attacker - estado completo do atacante
 * @param {object} defender - estado completo do defensor
 * @returns {'win'|'loss'|'draw_dko'|'draw_flee'}
 */
function decideOutcome(attacker, defender) {
  let atkTotal = 0;
  let defTotal = 0;

  for (let i = 0; i < 3; i++) {
    atkTotal += gameLogic.resolveCombatHit(attacker, defender).damage;
    defTotal += gameLogic.resolveCombatHit(defender, attacker).damage;
  }

  const maxDmg  = Math.max(atkTotal, defTotal);
  const diffPct = maxDmg > 0 ? Math.abs(atkTotal - defTotal) / maxDmg : 0;

  if (diffPct < 0.02) {
    // Zona de Empate: diferença menor que 2%
    return Math.random() < 0.80 ? "draw_dko" : "draw_flee";
  }

  return atkTotal >= defTotal ? "win" : "loss";
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

    // Lógica de NPCs: Se houver < 3 players, gerar NPCs (Nível ±1)
    if (targets.length < 3) {
      const npcCount = 3 - targets.length;
      for (let i = 0; i < npcCount; i++) {
        const isRare = Math.random() < 0.05; // HVT: 5% de chance
        const npcLevel = attackerLevel + (Math.random() > 0.5 ? 1 : -1);
        
        const npc = {
          id:      `npc_${Math.random().toString(36).substr(2, 9)}`,
          level:   npcLevel,
          faction: "Neutral",
          name:    isRare ? "HVT " + censorName("SpectroGate") : censorName("DroneNPC"),
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
      // Mock para NPC (precisa coincidir com a lógica de geração se possível)
      defender = { level: attacker.level, username: "NPC", faction: "Neutral", is_npc: true };
    } else {
      defender = await playerStateService.getPlayerState(targetId);
    }

    if (!attacker || !defender) throw new Error("Jogadores indisponíveis.");

    const attLevel = Number(attacker.level || 1);
    const defLevel = Number(defender.level || 1);

    return {
      spectroHint: spectroEngine.generateSpectroTalk("detection"),
      targetInfo: {
        level:   defLevel,
        faction: defender.faction,
        name:    censorName(defender.username || "DroneNPC")
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
      // Em uma implementação real, o radar deveria salvar o NPC em cache/Redis.
      // Aqui, vamos reconstruir um NPC base se ele for NPC.
      // IMPORTANTE: Em produção, o ID do NPC deve ser validado contra o cache.
      isRare = targetId.includes("_rare"); // Gambiarra para exemplo, mas o ideal é salvar no Redis
      
      defender = {
        username: isRare ? "HVT_UNIT" : "Drone_NPC",
        level: attacker.level + (Math.random() > 0.5 ? 1 : -1),
        attack: attacker.attack * (isRare ? 1.3 : 1.0),
        defense: attacker.defense * (isRare ? 1.3 : 1.0),
        focus: attacker.focus * (isRare ? 1.3 : 1.0),
        energy: 100,
        money: isRare ? 500 : 0,
        faction: "Neutral",
        is_npc: true
      };

      // Validação de Timer para NPCs Raros (HVT)
      // Nota: Esta parte assume que o tempo de expiração veio no ID ou está sendo verificado via cache.
      // Para o desafio, vamos simular a validação.
    } else {
      defender = await playerStateService.getPlayerState(targetId);
    }

    if (!attacker) throw new Error("Atacante não encontrado.");
    if (!defender) throw new Error("Alvo não encontrado.");

    if (Number(attacker.level || 1) < 10)
      throw new Error("Você precisa estar no nível 10 para acessar o Acerto de Contas.");
    if (Number(attacker.energy || 0) < 10)
      throw new Error("Energia insuficiente (mínimo 10).");
    
    if (!isNpc) {
      if (defender.status === "Recondicionamento")
        throw new Error("O alvo já está em recondicionamento.");
      if (defender.shield_ends_at && new Date(defender.shield_ends_at) > new Date())
        throw new Error("O alvo está sob proteção de escudo.");
    }

    // ── Decisão do resultado (win / loss / draw_dko / draw_flee) ──────────────
    const outcome = decideOutcome(attacker, defender);

    // ── Log de combate por turnos ─────────────────────────────────────────────
    // ── Geração Narrativa do Spectro (Anti-Repetição 15^4) ────────────────────
    const contextBase = {
      player_name: attacker.username,
      setor_cidade: CYBER_SETORS[Math.floor(Math.random() * CYBER_SETORS.length)],
      arma_equipada: CYBER_WEAPONS[Math.floor(Math.random() * CYBER_WEAPONS.length)],
      is_rare: isRare,
      is_draw_dko: outcome === "draw_dko",
      is_draw_flee: outcome === "draw_flee"
    };

    const targetNameCensored = censorName(defender.username);
    const targetNameReal     = defender.username;

    const log = [
      spectroEngine.construirNarrativa(1, { ...contextBase, target_name: targetNameCensored }),
      spectroEngine.construirNarrativa(2, { ...contextBase, target_name: targetNameCensored }),
      spectroEngine.construirNarrativa(3, { ...contextBase, target_name: targetNameReal })
    ];

    let loot = null;

    if (outcome === "win") {
      let xpGain = Math.round(gameLogic.COMBAT.XP_WIN_BASE * (defender.level / attacker.level));
      if (isRare) xpGain *= 1.5;
      if (defender.level > attacker.level) xpGain *= 2;

      let moneyReceived = 0;
      let spectroTax = 0;

      if (isNpc) {
        moneyReceived = isRare ? 500 : 0; // Bônus dinheiro NPC raro
      } else {
        const defMoney = Number(defender.money || 0);
        const moneyLoot = Math.floor(defMoney * 0.1);
        spectroTax = Math.floor(moneyLoot * 0.1);
        moneyReceived = moneyLoot - spectroTax;
      }

      const attDiffRatio = 0.001;
      const atkGain = Number(defender.attack  || 0) * attDiffRatio;
      const defGain = Number(defender.defense || 0) * attDiffRatio;
      const focGain = Number(defender.focus   || 0) * attDiffRatio;

      loot = {
        xp:    xpGain,
        money: moneyReceived,
        tax:   spectroTax,
        stats: {
          attack:  atkGain > 1 ? atkGain : 1,
          defense: defGain > 1 ? defGain : 1,
          focus:   focGain > 1 ? focGain : 1
        },
        rare_drop: isRare ? "Nucleo_Sombrio" : null
      };

      await playerStateService.updatePlayerState(userId, {
        energy:    -10,
        money:     moneyReceived,
        total_xp:  xpGain,
        attack:    loot.stats.attack,
        defense:   loot.stats.defense,
        focus:     loot.stats.focus,
        victories: 1
      });

      if (!isNpc) {
        const recoveryEndsAt = new Date(Date.now() + 15 * 60000).toISOString();
        const shieldEndsAt   = new Date(Date.now() + 45 * 60000).toISOString();

        await playerStateService.updatePlayerState(targetId, {
          money:            -Number(loot.money + loot.tax),
          energy:           -(Number(defender.energy || 0)),
          status:           "Recondicionamento",
          recovery_ends_at: recoveryEndsAt,
          shield_ends_at:   shieldEndsAt,
          defeats:          1
        });
      }

    } else if (outcome === "loss") {
      const attackerMoney  = Number(attacker.money || 0);
      const moneyLost      = Math.floor(attackerMoney * 0.1);
      const recoveryEndsAt = new Date(Date.now() + 15 * 60000).toISOString();
      const shieldEndsAt   = new Date(Date.now() + 45 * 60000).toISOString();

      await playerStateService.updatePlayerState(userId, {
        energy:           -(Number(attacker.energy || 0)),
        money:            -moneyLost,
        status:           "Recondicionamento",
        recovery_ends_at: recoveryEndsAt,
        shield_ends_at:   shieldEndsAt,
        defeats:          1
      });

      if (!isNpc) {
        const xpGain        = Math.round(gameLogic.COMBAT.XP_WIN_BASE * (attacker.level / defender.level));
        const moneyReceived = Math.floor(moneyLost * 0.9);

        await playerStateService.updatePlayerState(targetId, {
          money:     moneyReceived,
          total_xp:  xpGain,
          victories: 1
        });
      }

      loot = {
        xp:        -gameLogic.COMBAT.XP_LOSE_BASE,
        moneyLost: moneyLost,
        status:    "recondicionamento"
      };

    } else if (outcome === "draw_dko") {
      const halfRecovery = new Date(Date.now() + 7.5 * 60000).toISOString();
      const halfShield   = new Date(Date.now() + 22.5 * 60000).toISOString();

      await playerStateService.updatePlayerState(userId, {
        energy:           -10,
        status:           "Recondicionamento",
        recovery_ends_at: halfRecovery,
        shield_ends_at:   halfShield
      });

      if (!isNpc) {
        await playerStateService.updatePlayerState(targetId, {
          energy:           -10,
          status:           "Recondicionamento",
          recovery_ends_at: halfRecovery,
          shield_ends_at:   halfShield
        });
      }

      loot = {
        xp:         0,
        energyLost: 10,
        status:     "recondicionamento_dko"
      };

    } else { // draw_flee
      await playerStateService.updatePlayerState(userId,   { energy: -10 });
      if (!isNpc) await playerStateService.updatePlayerState(targetId, { energy: -10 });

      loot = {
        xp:         0,
        energyLost: 10
      };
    }

    return {
      outcome,
      winner: outcome === "win",
      log,
      loot,
      targetRealName: isNpc ? defender.username : defender.username,
      spectroComment: outcome === "win" ? spectroEngine.generateSpectroTalk("victory") : spectroEngine.generateSpectroTalk("timeout")
    };
  }
}

module.exports = new CombatService();
