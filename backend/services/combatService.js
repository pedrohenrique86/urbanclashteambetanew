const { query } = require("../config/database");
const playerStateService = require("./playerStateService");
const gameLogic = require("../utils/gameLogic");

// ─── Frases do Spectro ────────────────────────────────────────────────────────

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
  },

  turn1: [
    "{{attacker}} iniciou o contato, quebrando a primeira barreira de defesa do oponente.",
    "Com um movimento ágil, {{attacker}} encontrou uma brecha na guarda de {{defender}}.",
    "A aproximação foi furtiva. {{attacker}} pegou {{defender}} desprevenido."
  ],

  turn2: [
    "A troca de golpes foi intensa! O impacto ecoou pelo beco.",
    "{{defender}} tentou revidar, mas a velocidade de {{attacker}} sobrepujou a defesa.",
    "Um choque direto! O cheiro de ozônio subiu após a colisão de ataques."
  ],

  turn3: [
    "Finalização brutal! A execução foi limpa e o sistema de {{defender}} apagou.",
    "Um último golpe preciso. {{defender}} não aguentou o impacto crítico.",
    "Fim de linha. {{attacker}} desligou o oponente de vez."
  ],

  // ── Empate: Double Knockout ─ 80% da zona de empate ───────────────────────
  draw_dko: [
    "Ambos no limite... os dois caíram ao mesmo tempo. Nunca vi isso antes.",
    "Double KO. Dois guerreiros, zero sobreviventes. Impressionante e inútil.",
    "O beco ficou silencioso. Os dois foram ao chão juntos. Nenhum se levantou.",
    "Exaustão total. Você e o alvo se destruíram mutuamente. Sem vencedor hoje.",
    "Dois pulsos fracos no chão. A luta foi real, mas a vitória não pertence a ninguém.",
    "Sincronizaram os golpes finais. O sistema registrou dois knockouts simultâneos.",
    "Força igual. A batalha consumiu os dois por completo. Encaminhando vocês pro hospital."
  ],

  // ── Empate: Interrupção por Fuga ─ 20% da zona de empate ─────────────────
  draw_flee: [
    "Para! Sirenes a dois quarteirões. Aborto de emergência — saiam agora!",
    "Sinal corrompido. Interferência crítica no canal. Encerrei o engajamento a tempo.",
    "Presença policial detectada no setor. Missão abortada. Dispersem imediatamente.",
    "Radar apitou — viatura circulando o quadrante. Não valia terminar do jeito que estava.",
    "Câmeras ativas rua acima. Encerrei a transmissão por segurança. Saiam pelos fundos.",
    "Empate tático. Patrulha entrou no quadrante. Ambos dispersem sem chamar atenção.",
    "Sinal caiu na hora certa. Estavam iguais demais — deixei a polícia descobrir quem venceu."
  ]
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
  const phrases = SPECTRO_PHRASES.hints[level];
  return phrases[Math.floor(Math.random() * phrases.length)];
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
    const attacker      = await playerStateService.getPlayerState(userId);
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

    return result.rows.map(row => ({
      id:      row.user_id,
      level:   row.level,
      faction: row.faction,
      name:    censorName(row.username),
      online:  Math.random() > 0.5
    }));
  }

  async getPreCombatStatus(userId, targetId) {
    const attacker = await playerStateService.getPlayerState(userId);
    const defender = await playerStateService.getPlayerState(targetId);

    if (!attacker || !defender) throw new Error("Jogadores indisponíveis.");

    const attLevel = Number(attacker.level || 1);
    const defLevel = Number(defender.level || 1);

    const diff = defLevel - attLevel;
    let hintLevel = "balanced";
    if (diff > 2)  hintLevel = "high";
    else if (diff < -2) hintLevel = "low";

    return {
      spectroHint: getHintPhrase(hintLevel),
      targetInfo: {
        level:   defLevel,
        faction: defender.faction,
        name:    censorName(defender.username)
      }
    };
  }

  async executeAttack(userId, targetId) {
    const attacker = await playerStateService.getPlayerState(userId);
    const defender = await playerStateService.getPlayerState(targetId);

    if (!attacker) throw new Error("Atacante não encontrado.");
    if (!defender) throw new Error("Alvo não encontrado.");

    if (Number(attacker.level || 1) < 10)
      throw new Error("Você precisa estar no nível 10 para acessar o Acerto de Contas.");
    if (Number(attacker.energy || 0) < 10)
      throw new Error("Energia insuficiente (mínimo 10).");
    if (defender.status === "Recondicionamento")
      throw new Error("O alvo já está em recondicionamento.");
    if (defender.shield_ends_at && new Date(defender.shield_ends_at) > new Date())
      throw new Error("O alvo está sob proteção de escudo.");

    // ── Decisão do resultado (win / loss / draw_dko / draw_flee) ──────────────
    const outcome = decideOutcome(attacker, defender);

    // ── Log de combate por turnos ─────────────────────────────────────────────
    const cAttackerName = "Você";
    const cDefenderName = censorName(defender.username);

    let turn3Phrase;
    if (outcome === "draw_dko") {
      turn3Phrase = getUniqueDrawPhrase("draw_dko");
    } else if (outcome === "draw_flee") {
      turn3Phrase = getUniqueDrawPhrase("draw_flee");
    } else {
      // win/loss: revela o nome de quem perdeu no turno final
      const loserName = outcome === "win" ? defender.username : cAttackerName;
      turn3Phrase = getRandomPhrase("turn3", cAttackerName, loserName);
    }

    const log = [
      getRandomPhrase("turn1", cAttackerName, cDefenderName),
      getRandomPhrase("turn2", cAttackerName, cDefenderName),
      turn3Phrase
    ];

    // ── Comentários finais do Spectro por tipo de resultado ───────────────────
    const SPECTRO_COMMENTS = {
      win:       "Serviço limpo. O pagamento já caiu e eu tirei minha comissão.",
      loss:      "Sistema corrompido. Fica off um pouco pra recondicionar antes que apaguem tua existência.",
      draw_dko:  "Dois nocautes simultâneos. O sistema não sabe o que fazer com isso. Mandei vocês dois pro hospital.",
      draw_flee: "Fuga limpa. Você sai ileso, mas de mãos vazias. Às vezes é o melhor resultado possível."
    };

    let loot = null;

    // ─────────────────────────────────────────────────────────────────────────
    // VITÓRIA
    // ─────────────────────────────────────────────────────────────────────────
    if (outcome === "win") {
      let xpGain = Math.round(gameLogic.COMBAT.XP_WIN_BASE * (defender.level / attacker.level));
      if (defender.level > attacker.level) xpGain *= 2;

      const defMoney      = Number(defender.money || 0);
      const moneyLoot     = Math.floor(defMoney * 0.1);
      const spectroTax    = Math.floor(moneyLoot * 0.1);
      const moneyReceived = moneyLoot - spectroTax;

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
        }
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

      const recoveryEndsAt = new Date(Date.now() + 15 * 60000).toISOString();
      const shieldEndsAt   = new Date(Date.now() + 45 * 60000).toISOString();

      await playerStateService.updatePlayerState(targetId, {
        money:            -moneyLoot,
        energy:           -(Number(defender.energy || 0)),
        status:           "Recondicionamento",
        recovery_ends_at: recoveryEndsAt,
        shield_ends_at:   shieldEndsAt,
        defeats:          1
      });

    // ─────────────────────────────────────────────────────────────────────────
    // DERROTA
    // ─────────────────────────────────────────────────────────────────────────
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

      const xpGain        = Math.round(gameLogic.COMBAT.XP_WIN_BASE * (attacker.level / defender.level));
      const moneyReceived = Math.floor(moneyLost * 0.9);

      await playerStateService.updatePlayerState(targetId, {
        money:     moneyReceived,
        total_xp:  xpGain,
        victories: 1
      });

      loot = {
        xp:        -gameLogic.COMBAT.XP_LOSE_BASE,
        moneyLost: moneyLost,
        status:    "recondicionamento"
      };

    // ─────────────────────────────────────────────────────────────────────────
    // EMPATE: DOUBLE KNOCKOUT (80%)
    // Ambos perdem energia → ambos vão ao hospital com metade do tempo
    // Nenhum ganha XP, dinheiro ou atributos
    // ─────────────────────────────────────────────────────────────────────────
    } else if (outcome === "draw_dko") {
      const halfRecovery = new Date(Date.now() + 7.5 * 60000).toISOString();  // 7,5 min
      const halfShield   = new Date(Date.now() + 22.5 * 60000).toISOString(); // 22,5 min

      await playerStateService.updatePlayerState(userId, {
        energy:           -10,
        status:           "Recondicionamento",
        recovery_ends_at: halfRecovery,
        shield_ends_at:   halfShield
      });

      await playerStateService.updatePlayerState(targetId, {
        energy:           -10,
        status:           "Recondicionamento",
        recovery_ends_at: halfRecovery,
        shield_ends_at:   halfShield
      });

      loot = {
        xp:         0,
        energyLost: 10,
        status:     "recondicionamento_dko"
      };

    // ─────────────────────────────────────────────────────────────────────────
    // EMPATE: FUGA / INTERRUPÇÃO (20%)
    // Ambos perdem energia → NÃO vão para o hospital → saem ilesos sem lucro
    // ─────────────────────────────────────────────────────────────────────────
    } else { // draw_flee
      await playerStateService.updatePlayerState(userId,   { energy: -10 });
      await playerStateService.updatePlayerState(targetId, { energy: -10 });

      loot = {
        xp:         0,
        energyLost: 10
      };
    }

    return {
      outcome,                           // 'win' | 'loss' | 'draw_dko' | 'draw_flee'
      winner:         outcome === "win", // retrocompatibilidade
      log,
      loot,
      targetRealName: defender.username,
      spectroComment: SPECTRO_COMMENTS[outcome]
    };
  }
}

module.exports = new CombatService();
