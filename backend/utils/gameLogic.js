/**
 * gameLogic.js
 *
 * Centraliza as regras de negócio de progressão e economia do jogo.
 * Evita duplicação de lógica entre serviços e rotas.
 *
 * ATRIBUTOS:
 *   ATK    → dano base (ATK × ATK_MULTIPLIER)
 *   DEF    → redução de dano (softcap: DEF / (DEF + DEF_SOFTCAP))
 *   FOC    → acumulador de CRIT% via calcCritChance()
 *   DISC   → bônus de CRIT% via calcCritChance()
 *   CRIT%  → pontos brutos acumulados (não a % final)
 *   CRITDMG→ pontos brutos acumulados (não o multiplicador final)
 */

// ─── Constantes de combate ─────────────────────────────────────────────────────
const COMBAT = {
  ATK_MULTIPLIER        : 0.4,   // Calibrado para escala de 100 HP (Blitz)
  DEF_SOFTCAP           : 1000,

  // WIN-CHANCE CONSTANTS
  POWER_WEIGHT_ATK      : 1.25,
  POWER_WEIGHT_DEF      : 1.10,
  POWER_WEIGHT_FOC      : 0.90,
  WIN_CHANCE_MIN        : 5,     // 5% de chance de zebra mínima
  WIN_CHANCE_MAX        : 95,    // 95% de chance de vitória máxima

  // CRIT CHANCE: % real = BASE + FOC×FOC_FACTOR + DISC_FACTOR - accumulated raw points
  CRIT_BASE             : 5,     // % inicial antes de qualquer atributo
  CRIT_FOC_FACTOR       : 0.08,  // cada ponto de FOC → +0.08% crit
  CRIT_DISC_FACTOR      : 0.10,  // cada 10 pontos de DISC → +1% crit
  CRIT_RAW_FACTOR       : 1.0,   // pontos brutos de critical_chance → 1:1 com %
  CRIT_CAP              : 60,    // cap de 60% — preventé broken builds

  // CRIT DAMAGE: multiplicador = 1 + (base + raw) / 100
  CRIT_DMG_BASE_RENEGADO: 150,   // Renegados: mais letais em crit
  CRIT_DMG_BASE_GUARDIAO: 130,   // Guardiões: mais técnicos, menos explosivos
  CRIT_DMG_GENERIC_BASE : 140,   // fallback para facceões futuras
  CRIT_DMG_RAW_FACTOR   : 1.0,   // pontos brutos de critical_damage → 1:1 com %

  // COMBATE 1x1
  XP_WIN_BASE           : 40,    // Reduzido de 100 para 40 para evitar saltos de nível no combate
  XP_LOSE_BASE          : 15,    // Reduzido de 20 para 15
  XP_WIN_ATK_DIFF_FACTOR: 0.5,   // bônus de XP proporcional à diferença de ATK
  MISS_CHANCE           : 6,     // 6% de chance base de errar o golpe (falha crítica)
};

// ─── Constantes de progressão XP ─────────────────────────────────────────────
const XP_SCALING = {
  LEVEL_FACTOR  : 0.005, // 0.5% de bônus por nível (Nível 1000 = 6x bônus de XP)
  DAILY_CAP_TRAIN: 100000, // Suporta escala 1000
};

const ENERGY = {
  REGEN_RATE_MINUTES : 3,
  REGEN_AMOUNT       : 1, // 1 unidade por ciclo
  MAX_DEFAULT        : 100,
};


/**
 * Retorna o XP necessário para passar do nível atual para o próximo.
 * Baseado na nova curva de progressão solicitada.
 */
/**
 * Calcula o Nível Total (Prestígio) de forma dinâmica.
 * O nível é a soma de:
 * 1. Nível de XP (Fixo/Permanente)
 * 2. Bônus de Atributos (Volátil - Peso 10:1)
 * 3. Bônus de Riqueza (Volátil - Peso 10000:1)
 */
function calculateDynamicLevel(user) {
  if (!user) return 1;

  // 1. Nível Base por XP (Fórmula de degraus que criamos)
  // Como o XP é acumulado, este valor nunca cai.
  // 1. Nível Base por XP (Fórmula de degraus)
  // Usamos o total_xp para garantir que o nível base reflita o progresso histórico.
  let xpLevel = 1;
  let remainingXp = Number(user.total_xp || user.xp) || 0;
  while (xpLevel < 5000) {
    let req = 100 + (Math.floor(xpLevel / 5) * 10);
    if (remainingXp >= req) {
      remainingXp -= req;
      xpLevel++;
    } else {
      break;
    }
    if (xpLevel >= 5000) break; // Trava de segurança
  }

  // 2. Bônus por Atributos (ATK + DEF + FOC)
  // Cada 25 pontos totais = +1 Nível de Prestígio (Equilibrado para 20 dias)
  const totalStats = (Number(user.attack) || 0) + (Number(user.defense) || 0) + (Number(user.focus) || 0);
  const statsBonus = Math.floor(totalStats / 25);

  // 3. Bônus por Riqueza (Dinheiro em mãos)
  // Cada $10.000 = +1 Nível de Prestígio
  // Isso torna o dinheiro um bônus, não a fonte principal de nível.
  const moneyBonus = Math.floor((Number(user.money) || 0) / 10000);

  // Nível Total = Base + Atributos + Dinheiro
  return xpLevel + statsBonus + moneyBonus;
}

// Mantemos esta apenas para saber quanto XP falta para o PRÓXIMO NÍVEL DE XP (visual)
function getXpRequiredForNextLevel(level) {
  const lvl = Number(level) || 1;
  return 100 + (Math.floor(lvl / 5) * 10);
}

/**
 * Calcula o XP absoluto total acumulado necessário para atingir o início de um determinado nível.
 * Ex: Para o nível 2, o total é o XP requerido do nível 1 (100).
 */
function getTotalXpUntilLevel(targetLevel) {
  let total = 0;
  for (let i = 1; i < targetLevel; i++) {
    total += getXpRequiredForNextLevel(i);
  }
  return total;
}

/**
 * Deriva o estado de XP atual baseado no total acumulado e no nível.
 * Retorna { currentXp, xpRequired }
 * 
 * Sênior Note: Essa é a função SSOT (Single Source of Truth) para o frontend.
 */
function deriveXpStatus(totalXp, level) {
  const tXp = Math.max(0, Number(totalXp) || 0);
  const lvl = Math.max(1, Number(level) || 1);

  const xpAtStartOfLevel = getTotalXpUntilLevel(lvl);
  const currentXpInLevel = Math.max(0, tXp - xpAtStartOfLevel);
  const xpRequiredForNext = getXpRequiredForNextLevel(lvl);
  
  return {
    currentXp: currentXpInLevel,
    xpRequired: xpRequiredForNext
  };
}

/**
 * Calcula o Poder Total unificado (Power Solo).
 * SSOT (Single Source of Truth) para o cálculo de força.
 */
function calculateTotalPower(user, chips = []) {
  if (!user) return { powerSolo: 0, powerWar: 0 };

  const atk = Number(user.attack || 0);
  const def = Number(user.defense || 0);
  const foc = Number(user.focus || 0);
  const level = Number(user.level || 1);
  const critChance = Number(user.crit_chance_pct || 0);
  const critMult = Number(user.crit_damage_mult || 1);
  const specialValue = Number(user.intimidation || user.discipline || 0);

  const instinct = Number(user.instinct || user.luck || 0);
  
  // Fórmula unificada SSOT
  // (ATK + DEF + FOC×0.5 + INS×1.5) + (NVL×2) + (CRIT%×0.2 + CRITx)
  let powerSolo = (atk + (Number(user.weapon_damage) || 0) + def + (Number(user.shield_protection) || 0) + foc * 0.5 + instinct * 1.5) + (level * 2) + (critChance * 0.2 + critMult);
  
  if (chips && chips.length > 0) {
    chips.forEach(chip => {
      if (chip && chip.power_boost > 0) {
        powerSolo *= (1 + chip.power_boost / 100);
      }
    });
  }
  
  // Se o usuário estiver em Ruptura, perde 20% da força
  if (user.status === 'Ruptura') {
    powerSolo *= 0.8;
  }
  
  const powerSoloFinal = Math.floor(powerSolo);
  const powerWarFinal = Math.floor(powerSoloFinal + specialValue);

  return {
    powerSolo: powerSoloFinal,
    powerWar: powerWarFinal
  };
}

/**
 * Calcula qual deveria ser o nível do jogador baseado no XP total.
 * Suporta múltiplos level-ups instantâneos.
 */
function calculateLevelFromXp(totalXp) {
  let level = 1;
  let remainingXp = Math.max(0, Number(totalXp) || 0);
  
  while (level < 5000) {
    const required = getXpRequiredForNextLevel(level);
    if (remainingXp >= required) {
      remainingXp -= required;
      level++;
    } else {
      break;
    }
  }
  return level;
}

// ─── Novas funções de combate e CRIT ──────────────────────────────────────────

/**
 * Calcula a chance de crítico REAL (em %) de um jogador.
 * Usa os pontos brutos acumulados (critical_chance), FOC e DISC.
 *
 * @param {object} player - { focus, discipline, critical_chance, faction }
 * @returns {number} - % de chance crítica entre 0 e CRIT_CAP
 */
function calcCritChance(player) {
  const foc      = Math.max(0, Number(player.focus)            || 0);
  const rawCrit  = Math.max(0, Number(player.critical_chance)  || 0);
  const instinct = Math.max(0, Number(player.instinct || player.luck) || 0);

  const chance = COMBAT.CRIT_BASE
    + foc    * COMBAT.CRIT_FOC_FACTOR
    + rawCrit * COMBAT.CRIT_RAW_FACTOR
    + instinct * 0.15; // INS: Cada 1.00 ponto → +0.15% de crit real

  return Math.min(COMBAT.CRIT_CAP, Math.round(chance * 100) / 100);
}

/**
 * Calcula o multiplicador de dano crítico de um jogador.
 * Ex: 150 pontos base + 50 raw = 200 → multiplicador 3.0× (200% de bônus).
 *
 * @param {object} player - { faction, critical_damage }
 * @returns {number} - multiplicador (ex: 2.5 significa dano_crit = base × 2.5)
 */
function calcCritDamageMultiplier(player) {
  const rawDmg = Math.max(0, Number(player.critical_damage) || 0);
  const faction = String(player.faction || '').toLowerCase();

  const atk = Math.max(0, Number(player.attack) || 0);
  const def = Math.max(0, Number(player.defense) || 0);
  const foc = Math.max(0, Number(player.focus) || 0);
  
  // Bônus Dinâmico de Treino: Cada 50 atributos combinados = +1 ponto de porcentagem de dano crítico extra.
  // Garante evolução contínua da Topbar.
  const statsBonus = Math.floor((atk + def + foc) / 50);
  const instinctBonus = (Number(player.instinct || player.luck) || 0) * 0.5; // INS: +0.5% de dano crítico por ponto

  let base;
  if (faction === 'renegados' || faction === 'gangsters') {
    base = COMBAT.CRIT_DMG_BASE_RENEGADO;
  } else if (faction === 'guardioes' || faction === 'guardas') {
    base = COMBAT.CRIT_DMG_BASE_GUARDIAO;
  } else {
    base = COMBAT.CRIT_DMG_GENERIC_BASE;
  }

  const totalPct = base + (rawDmg * COMBAT.CRIT_DMG_RAW_FACTOR) + statsBonus + instinctBonus;
  let multiplier = Math.round((1 + totalPct / 100) * 100) / 100; // ex: 150% → 2.50×
  
  // Hard Cap de Segurança (Teto Máximo) para impedir One-Shots no Late-game extremo
  return Math.min(4.00, multiplier);
}

/**
 * Resolve um combate 1x1 entre dois jogadores.
 * Retorna { attackerDamage, defenderDamage, attackerCrit, defenderCrit }
 *
 * FÓRMULA:
 *   dano_base    = ATK × ATK_MULTIPLIER
 *   def_reduzida = DEF_inimigo × (1 - Intimidação_atacante)
 *   redução_def  = def_reduzida / (def_reduzida + DEF_SOFTCAP)
 *   dano_final   = dano_base × (1 - redução_def)
 *   se crit:     dano_final × multiplicador_crit_mitigado
 *                (multiplicador_crit_mitigado reduz o dano bônus crítico usando Disciplina_defensor)
 *
 * @param {object} attacker - estado completo do atacante
 * @param {object} defender - estado completo do defensor
 * @param {number} turnMomentum - bônus acumulado de rounds anteriores (ex: 1.1 para +10%)
 * @returns {object}
 */
function resolveCombatHit(attacker, defender, turnMomentum = 1.0) {
  const attFaction = String(attacker.faction || '').toLowerCase();
  const defFaction = String(defender.faction || '').toLowerCase();

  // 1. Atributos Reais e Perícia de Classe (FIXA)
  let rawAtk = Number(attacker.attack)    || 1;
  let rawDef = Number(defender.defense)   || 1;
  let rawFoc = Number(attacker.focus)     || 1;
  
  // Perícias Fixas: Renegado (35% Intimidação) | Guardião (40% Disciplina)
  const attackerIntimidation = (Number(attacker.intimidation) || 0) / 100;
  const defenderDiscipline = (Number(defender.discipline) || 0) / 100;

  let atkMult = (attFaction === 'renegados' || attFaction === 'gangsters') ? 1.15 : 1.0;
  let defMult = (defFaction === 'guardioes' || defFaction === 'guardas')   ? 1.15 : 1.0;

  const isRupturedAtk = attacker.status === 'Ruptura';
  const isRupturedDef = defender.status === 'Ruptura';

  const atkFinal = rawAtk * atkMult * (isRupturedAtk ? 0.80 : 1.0);
  const defFinal = rawDef * defMult * (isRupturedDef ? 0.80 : 1.0);

  // 2. Mecânicas Avançadas (DADOS REAIS E IDENTIDADE DE CLASSE)
  // BREACH (Assinatura Renegada): Usa a Intimidação (35%) para chance de ignorar parte da Defesa
  const breachChance = attackerIntimidation > 0 ? (attackerIntimidation * 100) : 0; 
  const isBreach = Math.random() * 100 < breachChance;
  const defMitigation = isBreach ? 0.60 : 1.0; // Ignora 40% da def se quebrar (Lethal)

  // CONTRA-ATAQUE (Assinatura Guardiã): Usa a Disciplina (40%) para chance de rechaçar golpe
  const counterChance = defenderDiscipline > 0 ? (defenderDiscipline * 100) / 2 : 0; // 20% de chance real
  const isCounter = Math.random() * 100 < counterChance;

  // EVASÃO: Diferença de Foco + Bônus de Instinto
  const focalEdge = Math.max(0, (defender.focus + (Number(defender.instinct || defender.luck) || 0) * 2) - attacker.focus);
  const evasionChance = Math.max(2, Math.min(18, focalEdge / 35)); 
  const isEvaded = Math.random() * 100 < evasionChance;

  // 3. Cálculo de Dano
  const damageBase = (atkFinal * COMBAT.ATK_MULTIPLIER);
  // Redução de Defesa (Afeta pela Intimidação ativa + Breach)
  const defCalc = defFinal * (1 - attackerIntimidation) * defMitigation;
  const defReduction = defCalc / (defCalc + COMBAT.DEF_SOFTCAP);
  
  const attTotal = (rawAtk + rawDef + rawFoc);
  const defTotal = (Number(defender.attack) + Number(defender.defense) + Number(defender.focus));
  const powerDiff = attTotal - defTotal;
  const auraModifier = 1 + Math.max(-0.20, Math.min(0.20, powerDiff / 5000)); // Sensibilidade aumentada (era 25000)
  
  let finalDamage = damageBase * (1 - defReduction) * auraModifier * turnMomentum;

  // 4. Críticos e Letalidade
  const critChance = calcCritChance(attacker);
  const isCrit = Math.random() * 100 < critChance;
  let critMult = isCrit ? calcCritDamageMultiplier(attacker) : 1.0;

  // Disciplina do defensor reduz impacto crítico (Proteção de Elite do Guardião)
  if (isCrit && defenderDiscipline > 0) {
    critMult = 1 + ((critMult - 1) * (1 - defenderDiscipline)); // Mitiga 40% do dano bônus
  }

  const variance = 0.82 + (Math.random() * 0.36); // +/- 18%
  let resolvedDamage = Math.floor(finalDamage * critMult * variance);

  if (isEvaded) resolvedDamage = Math.round(resolvedDamage * 0.25);

  // 5. HABILIDADES ESPECIAIS & INCIDENTES (6% de chance total)
  let incident = null;
  const specialRoll = Math.random() * 100;
  
  if (specialRoll < 6.0) {
    const isRenegado = attFaction === 'renegados' || attFaction === 'gangsters';
    const isGuardiao = attFaction === 'guardioes' || attFaction === 'guardas';
    const typeRoll = Math.random();

    if (isRenegado) {
      if (typeRoll < 0.6) {
        incident = { type: "SPECIAL", label: "CORTE LETHAL!", dmgMult: 2.2, color: "text-red-500" };
      } else {
        incident = { type: "SPECIAL", label: "EMP_PULSE!", dmgMult: 1.5, globalDmg: Math.round(atkFinal * 0.2) };
      }
    } else if (isGuardiao) {
      if (typeRoll < 0.6) {
        incident = { type: "SPECIAL", label: "PUNÇÃO_TÁTICA!", dmgMult: 1.9, color: "text-blue-500" };
      } else {
        incident = { type: "SPECIAL", label: "REINFORCE_SHELL!", dmgMult: 1.2, selfHeal: Math.round(rawDef * 2) };
      }
    } else {
      incident = { type: "SPECIAL", label: "SOBRECARGA!", dmgMult: 2.0 };
    }
  }

  // 6. Chance de Erro (MISS)
  const isMiss = Math.random() * 100 < COMBAT.MISS_CHANCE;
  if (isMiss) {
    resolvedDamage = 0;
  } else if (incident && incident.dmgMult !== undefined) {
    resolvedDamage = Math.round(resolvedDamage * incident.dmgMult);
  }

  return {
    damage: Math.max(0, resolvedDamage),
    isCrit,
    isMiss,
    isBreach,
    isEvaded,
    isCounter,
    incident,
    counterDamage: isCounter ? Math.round(atkFinal * 0.5) : 0,
    modifiers: {
      aura: Math.round(auraModifier * 100) / 100,
      momentum: Math.round(turnMomentum * 100) / 100
    }
  };
}

function resolveWinOutcome(attacker, defender, attackerChips = [], tactic = 'technological') {
  // Mantemos para compatibilidade se outras partes usarem, 
  // mas vamos focar na nova lógica resolveStrategicCombat.
  if (Array.isArray(tactic)) {
    return resolveStrategicCombat(attacker, defender, attackerChips, tactic);
  }
  return resolveStrategicCombat(attacker, defender, attackerChips, Array(5).fill(tactic));
}

/**
 * Nova Lógica: Acerto de Contas Estratégico (Cyberpunk Mind Games)
 * 5 Rounds fixos. O jogador envia uma sequência de 5 ações.
 */
/**
 * Nova Lógica: Acerto de Contas Estratégico (Cyberpunk Mind Games)
 * 5 Rounds fixos. O jogador envia uma sequência de 5 ações.
 */
function resolveStrategicCombat(attacker, defender, attackerChips = [], playerActions = []) {
  const rounds = [];
  let playerHP = 100;
  let opponentHP = 100;
  let playerRancor = 0;
  let playerCombo = 1.0; 
  let opponentCombo = 1.0;

  const actionPool = ['brutal', 'block', 'feint', 'counter', 'stealth'];
  
  // IA do oponente: Padrão estratégico
  const opponentActions = [];
  for (let i = 0; i < 5; i++) {
    opponentActions.push(actionPool[Math.floor(Math.random() * actionPool.length)]);
  }

  // Pools de Narração (Garantir variedade extrema e imersão visceral)
  const LOG_POOLS = {
    draw: [
      "ESTASE TÁTICA: O choque dos frames cria uma zona de vácuo estático. Nenhum avanço registrado.",
      "PARIDADE DE DADOS: As lâminas de frequência se anulam em um ângulo perfeito. Faíscas de neon cegam os sensores.",
      "IMPASSE CIBERNÉTICO: Os núcleos de processamento entram em loop enquanto ambos buscam uma falha inexistente.",
      "DISSIPAÇÃO DE IMPACTO: O golpe é absorvido pelas placas de blindagem mútua. O som do metal rangendo ecoa pelo setor.",
      "SINCRONIA MORTAL: Movimentos idênticos. É como se os dois sistemas estivessem espelhados no mesmo código-fonte."
    ],
    pWinBrutal: [
      "ANOMALIA ESTRUTURAL: Seu soco hidráulico amassa o peito do alvo, expondo fiação e servos danificados.",
      "SOBRECARGA DE IMPACTO: A lâmina térmica atravessa a guarda, deixando uma trilha de metal derretido no chassi inimigo.",
      "FRATURA DE CÓDIGO: Você descarrega uma sequência violenta que faz o crânio de metal do oponente estalar sob a pressão.",
      "DEMOLIÇÃO NEON: Um golpe brutal arremessa o alvo contra os destroços. Alertas de falha crítica piscam no radar dele.",
      "RUPTURA CINÉTICA: A força pura do seu ataque ignora os dissipadores, atingindo diretamente o núcleo de energia inimigo."
    ],
    pWinFeint: [
      "GHOST IN THE SHELL: Você simulou uma queda de sistema, atraindo o oponente para um golpe fantasma devastador.",
      "LOGICA CORROMPIDA: O inimigo tentou bloquear um sinal falso enquanto sua lâmina real encontrava a brecha perfeita.",
      "DESVIO SINÁPTICO: Uma manobra tão fluida que os sensores de movimento do alvo travaram em um loop de busca.",
      "ERRO DE PREDIÇÃO: Você mudou o vetor de ataque no último milissegundo. O oponente só sentiu o corte.",
      "SUBVERSÃO TÁTICA: Uma finta elegante que deixou o inimigo totalmente exposto. O próximo frame será o fim dele."
    ],
    pWinBlock: [
      "DEFESA ABSOLUTA: O escudo de energia estabilizou no ápice do ataque, devolvendo a onda de choque para o agressor.",
      "APARADA CIRÚRGICA: Você interceptou o golpe com a ponta da lâmina, usando o momentum dele para um contra-ataque letal.",
      "MURO DE DADOS: Sua blindagem reativa detonou no momento exato, lançando o oponente para trás com servos avariados.",
      "NEGATIVA TÁTICA: O inimigo golpeou um vácuo defensivo. O rebote hidráulico quase arrancou o braço dele.",
      "ESTABILIDADE CORE: Nem um milímetro de recuo. Você absorveu a fúria dele e agora detém o controle do setor."
    ],
    pWinCounter: [
      "PUNÇÃO REATIVA: No momento em que ele avançou, sua lâmina já estava cravada no ponto de articulação dele.",
      "INVERSÃO DE VETOR: Você usou a aceleração do inimigo para amplificar seu próprio golpe. Um erro fatal para ele.",
      "RESPOSTA INSTANTÂNEA: O ataque dele foi o gatilho para sua execução. O sistema dele sequer registrou o impacto vindo.",
      "CONTRA-GOLPE SÔNICO: Um movimento reflexo que estraçalhou os sensores frontais do oponente em pleno ataque.",
      "DOMÍNIO DE FLUXO: Você fluiu ao redor do golpe pesado e atingiu as juntas expostas com precisão cirúrgica."
    ],
    pWinStealth: [
      "ASSINATURA ZERO: Você desapareceu entre os frames de neon, reaparecendo como um espectro de morte nas costas dele.",
      "EVASÃO FANTASMA: O inimigo cortou o ar enquanto você deslizava por baixo de sua guarda, atingindo os cabos vitais.",
      "BORRÃO CROMADO: Um movimento tão rápido que deixou apenas um rastro de luz para trás. O golpe veio do nada.",
      "DESLOCAMENTO DE FASE: Você se moveu para fora do campo de visão tático, golpeando o ponto cego com fúria silenciosa.",
      "INFILTRAÇÃO DE COMBATE: Enquanto ele procurava seu sinal, seu punho já estava atravessando o radiador dele."
    ],
    pWinSpecial: [
      "PROTOCOLO DE ANIQUILAÇÃO: Você liberou o Rancor total! Uma explosão de dados e sangue sintético decora o asfalto.",
      "SINGULARIDADE DE COMBATE: O golpe final dobra o espaço ao redor do alvo, desintegrando sua blindagem em pó metálico.",
      "SENTENÇA EXECUTADA: Um impacto tão massivo que o sinal do inimigo foi deletado da rede antes mesmo do corpo cair.",
      "DIVINDADE CIBERNÉTICA: Por um segundo, você se tornou puro código de morte. O inimigo não passou de um erro deletado.",
      "SOBRECARGA ABSOLUTA: O núcleo do alvo entrou em colapso sob sua fúria. A zona de combate brilha com o fim dele."
    ],
    pLose: [
      "SINAL PERDIDO: Um golpe pesado atinge seus sensores ópticos. A escuridão e o erro de sistema são tudo o que resta.",
      "FALHA DE INTEGRIDADE: O inimigo atravessou sua guarda com uma violência que seus dissipadores não puderam conter.",
      "EXTRAÇÃO FORÇADA: Seu chassi geme sob a pressão do ataque inimigo. O óleo quente escorre por seus circuitos.",
      "DESCALIBRAÇÃO TOTAL: Você foi atingido no plexo neural. Seus movimentos agora são lentos e cheios de latência.",
      "DOMÍNIO HOSTIL: O oponente encontrou o ponto fraco na sua lógica de combate. O impacto foi devastador e humilhante."
    ]
  };

  // Função para pegar log sem repetir
  const usedLogs = new Set();
  const getLog = (type) => {
    const pool = LOG_POOLS[type] || LOG_POOLS.draw;
    let available = pool.filter(l => !usedLogs.has(l));
    if (available.length === 0) {
      usedLogs.clear();
      available = pool;
    }
    const picked = available[Math.floor(Math.random() * available.length)];
    usedLogs.add(picked);
    return picked;
  };

  // Modificadores de Chips
  // Modificadores de Chips
  let chipDmgMult = 1.0;
  let chipResist = 0;
  let xpBonus = 1.0;
  attackerChips.forEach(chip => {
    if (chip.effect_type === 'power_boost') chipDmgMult += (chip.effect_value / 100);
    if (chip.effect_type === 'money_shield') chipResist += (chip.effect_value);
    if (chip.effect_type === 'xp_boost') xpBonus += (chip.effect_value / 100);
  });

  const pAtk = (Number(attacker.attack) || 1) + (Number(attacker.weapon_damage) || 0);
  const pDef = (Number(attacker.defense) || 1) + (Number(attacker.shield_protection) || 0);
  const pFoc = Number(attacker.focus) || 1;
  
  const oAtk = (Number(defender.attack) || 1) + (Number(defender.weapon_damage) || 0);
  const oDef = (Number(defender.defense) || 1) + (Number(defender.shield_protection) || 0);
  const oFoc = Number(defender.focus) || 1;
  
  const pFaction = String(attacker.faction || '').toLowerCase();
  const oFaction = String(defender.faction || '').toLowerCase();

  // Perícias Fixas de Classe: Renegado (35% Intimidação) | Guardião (40% Disciplina)
  const pIsRenegado = pFaction === 'gangsters' || pFaction === 'renegados';
  const pIsGuardian = pFaction === 'guardas' || pFaction === 'guardioes';
  const oIsRenegado = oFaction === 'gangsters' || oFaction === 'renegados';
  const oIsGuardian = oFaction === 'guardas' || oFaction === 'guardioes';

  const pIntimidation = pIsRenegado ? 35 : 0;
  const pDiscipline = pIsGuardian ? 40 : 0;
  const oIntimidation = oIsRenegado ? 35 : 0;
  const oDiscipline = oIsGuardian ? 40 : 0;

  // Flags para uso no loop
  const isAttackerRenegado = pIsRenegado;
  const isDefenderGuardian = oIsGuardian;

  // Base Dmg from Power
  const baseDmg = 12 + (pAtk / (pAtk + oDef)) * 25;
  const oppBaseDmg = 12 + (oAtk / (oAtk + pDef)) * 25;
  
  // Crit/Evasion setup (Integrando Instinto)
  const pInstinct = Number(attacker.instinct || attacker.luck || 0);
  const oInstinct = Number(defender.instinct || defender.luck || 0);
  const pCritChance = Math.min(60, 5 + (pFoc * 0.05) + (pInstinct * 0.1));
  const oCritChance = Math.min(60, 5 + (oFoc * 0.05) + (oInstinct * 0.1));

  for (let i = 0; i < 5; i++) {
    const pAction = playerActions[i] || 'brutal';
    const oAction = opponentActions[i];
    
    let pRoundDmg = 0;
    let oRoundDmg = 0;
    let roundLog = "";
    let impact = "normal";
    let pIsCrit = false;
    let oIsCrit = false;

    const pWinMap = {
      brutal: ['feint', 'stealth'],
      block: ['brutal', 'counter'],
      feint: ['block', 'counter'],
      counter: ['brutal', 'stealth'],
      stealth: ['block', 'feint']
    };

    if (pAction === oAction) {
      pRoundDmg = Math.floor(baseDmg * 0.4 * chipDmgMult);
      oRoundDmg = Math.floor(oppBaseDmg * 0.4);
      roundLog = getLog('draw');
      impact = "clash";
      playerCombo = 1.0;
      opponentCombo = 1.0;
    } else if (pAction === 'special' && i === 4) {
      if (playerRancor >= 100) {
        pRoundDmg = Math.floor(baseDmg * 3.5 * chipDmgMult * playerCombo);
        roundLog = getLog('pWinSpecial');
        impact = "special";
        playerRancor = 0;
        pIsCrit = true;
      } else {
        pRoundDmg = Math.floor(baseDmg * 0.5 * chipDmgMult);
        roundLog = "Você tentou um golpe especial sem fúria suficiente. O impacto foi mitigado e bloqueado.";
        impact = "clash";
        playerCombo = 1.0;
      }
    } else if (pWinMap[pAction]?.includes(oAction)) {
      playerCombo += 0.2; 
      opponentCombo = 1.0;
      if (Math.random() * 100 < pCritChance) pIsCrit = true;

      const critMult = pIsCrit ? 1.5 : 1.0;

      if (pAction === 'feint') {
        pRoundDmg = Math.floor(10 * critMult);
        roundLog = getLog('pWinFeint');
        impact = "tech";
      } else if (pAction === 'stealth') {
        pRoundDmg = Math.floor(baseDmg * 0.8 * chipDmgMult * critMult);
        roundLog = getLog('pWinStealth');
        impact = "tech";
      } else if (pAction === 'block') {
        pRoundDmg = Math.floor(baseDmg * 0.9 * chipDmgMult * critMult);
        oRoundDmg = Math.floor(oppBaseDmg * 0.1);
        // Habilidade Fixa Guardião: Disciplina (Redução de dano no bloqueio)
        if (isDefenderGuardian && pDiscipline > 0) {
          oRoundDmg = Math.floor(oRoundDmg * (1 - pDiscipline / 100));
        }
        roundLog = getLog('pWinBlock');
        impact = "parry";
      } else if (pAction === 'counter') {
        pRoundDmg = Math.floor(baseDmg * 1.6 * chipDmgMult * critMult);
        oRoundDmg = Math.floor(oppBaseDmg * 0.1);
        roundLog = getLog('pWinCounter');
        impact = "parry";
      } else {
        pRoundDmg = Math.floor(baseDmg * 1.5 * playerCombo * chipDmgMult * critMult);
        // Habilidade Fixa Renegado: Intimidação (Bônus de dano em ataques brutais)
        if (isAttackerRenegado && pIntimidation > 0) {
          pRoundDmg = Math.floor(pRoundDmg * (1 + pIntimidation / 100));
        }
        roundLog = getLog('pWinBrutal');
        impact = "heavy";
      }
    } else {
      opponentCombo += 0.2;
      playerCombo = 1.0;
      if (Math.random() * 100 < oCritChance) oIsCrit = true;
      const oCritMult = oIsCrit ? 1.5 : 1.0;

      oRoundDmg = Math.floor(oppBaseDmg * 1.4 * opponentCombo * oCritMult);
      roundLog = getLog('pLose');
      impact = "heavy";
    }

    if (pIsCrit && pRoundDmg > oRoundDmg) roundLog = "[CRITICAL STRIKE] " + roundLog;
    if (oIsCrit && oRoundDmg > pRoundDmg) roundLog = "[SYSTEM BREACH] " + roundLog;

    playerHP = Math.max(0, playerHP - oRoundDmg);
    opponentHP = Math.max(0, opponentHP - pRoundDmg);
    if (oRoundDmg > 0) playerRancor = Math.min(100, playerRancor + (oRoundDmg > 15 ? 30 : 15));

    rounds.push({
      round: i + 1,
      playerAction: pAction,
      opponentAction: oAction,
      playerDamage: pRoundDmg,
      opponentDamage: oRoundDmg,
      playerHP,
      opponentHP,
      playerRancor,
      log: roundLog,
      impact,
      pIsCrit,
      oIsCrit,
      isKO: playerHP === 0 || opponentHP === 0
    });

    if (playerHP <= 0 || opponentHP <= 0) break;
  }

  const isAttackerWin = opponentHP <= 0 || (opponentHP < playerHP && playerHP > 0);
  const isDraw = opponentHP === playerHP;
  const isKO = opponentHP === 0 || playerHP === 0;

  return {
    isAttackerWin,
    isDraw,
    isKO,
    playerHP,
    opponentHP,
    rounds,
    xpBonus, 
    moneyProtection: chipResist,
    willBleed: isAttackerWin && playerHP <= 20 && playerHP > 0,
    logs: rounds.map(r => ({ segment: `ROUND ${r.round}`, label: r.log, winner: r.playerDamage > r.opponentDamage ? "attacker" : "defender" }))
  };
}



function resolveActiveTurn(state, action) {
  const pAtk = state.attacker.attack;
  const oDef = state.defender.defense;
  let pBaseDmg = 15 + (pAtk / (pAtk + oDef)) * 30;
  
  const oAtk = state.defender.attack;
  const pDef = state.attacker.defense;
  let oBaseDmg = 15 + (oAtk / (oAtk + pDef)) * 30;

  let chipDmgMult = 1.0;
  if (state.attacker.chips) {
    state.attacker.chips.forEach(c => {
      if (c.effect_type === 'power_boost') chipDmgMult += (c.effect_value / 100);
    });
  }
  pBaseDmg *= chipDmgMult;

  let pDmg = 0;
  let oDmg = 0;
  let pStaggerDmg = 0;
  let oStaggerDmg = 0;
  let log = "";
  
  if (action === 'fast') {
    pDmg = Math.floor(pBaseDmg * 0.4);
    pStaggerDmg = 30;
    log = "Golpe rápido conectou! Defesa do alvo desestabilizando.";
  } else if (action === 'heavy') {
    pDmg = Math.floor(pBaseDmg * (state.defender.stagger <= 0 ? 1.8 : 0.6));
    pStaggerDmg = 10;
    if (state.defender.stagger <= 0) log = "ATAQUE PESADO! O inimigo atordoado sofreu dano massivo!";
    else log = "Ataque pesado colidiu na blindagem do inimigo (pouco efeito).";
  } else if (action === 'emp') {
    pDmg = Math.floor(pBaseDmg * 0.1);
    pStaggerDmg = 50;
    log = "Sobrecarga EMP liberada! Escudos inimigos severamente danificados.";
  } else if (action === 'finisher') {
    if (state.defender.stagger <= 0 || state.rancor >= 100) {
      pDmg = Math.floor(pBaseDmg * 3.5);
      log = "EXECUÇÃO INICIADA! Golpe fatal destruiu as defesas do alvo.";
      state.rancor = 0;
    } else {
      pDmg = Math.floor(pBaseDmg * 0.4);
      log = "Tentativa de Execução falhou. O alvo previu e bloqueou parcialmente.";
    }
  }

  const oActionRoll = Math.random();
  if (state.attacker.stagger <= 0) {
    oDmg = Math.floor(oBaseDmg * 1.5);
    oStaggerDmg = 10;
    log += " | Inimigo aproveitou sua postura quebrada e deferiu um golpe brutal!";
  } else {
    if (oActionRoll < 0.4) {
      oDmg = Math.floor(oBaseDmg * 0.5);
      oStaggerDmg = 25;
      log += " | Inimigo revidou com uma sequência ágil.";
    } else if (oActionRoll < 0.8) {
      oDmg = Math.floor(oBaseDmg * 0.8);
      oStaggerDmg = 15;
      log += " | Inimigo tentou um contra-ataque pesado.";
    } else {
      oDmg = Math.floor(oBaseDmg * 0.2);
      oStaggerDmg = 40;
      log += " | Inimigo disparou um dreno no seu escudo.";
    }
  }

  const pCritChance = Math.min(60, 5 + state.attacker.focus * 0.05);
  const oCritChance = Math.min(60, 5 + state.defender.focus * 0.05);

  if (Math.random() * 100 < pCritChance) {
    pDmg = Math.floor(pDmg * 1.5);
    pStaggerDmg = Math.floor(pStaggerDmg * 1.5);
    log = "[CRÍTICO] " + log;
  }
  if (Math.random() * 100 < oCritChance) {
    oDmg = Math.floor(oDmg * 1.5);
    oStaggerDmg = Math.floor(oStaggerDmg * 1.5);
  }

  let newPHp = Math.max(0, state.attacker.hp - oDmg);
  let newEHp = Math.max(0, state.defender.hp - pDmg);
  
  let newPStagger = Math.max(0, state.attacker.stagger - oStaggerDmg);
  let newEStagger = Math.max(0, state.defender.stagger - pStaggerDmg);
  
  if (state.attacker.stagger <= 0) newPStagger = 100;
  if (state.defender.stagger <= 0) newEStagger = 100;

  let newRancor = Math.min(100, state.rancor + (oDmg > 0 ? 20 : 0));

  return {
    playerHP: newPHp,
    enemyHP: newEHp,
    playerStagger: newPStagger,
    enemyStagger: newEStagger,
    rancor: newRancor,
    log
  };
}

/**
 * Escala o XP de treino pelo nível atual do jogador.
 * Jogadores de alto nível ganham mais XP por treino — mantendo a progressão engajante.
 *
 * @param {number} baseXp   - XP base do tipo de treino (ex: 40, 110, 280)
 * @param {number} level    - nível atual do jogador
 * @returns {number} - XP ajustado (inteiro)
 */
function scaleXpByLevel(baseXp, level) {
  const lvl    = Math.max(1, Number(level) || 1);
  const base   = Math.max(0, Number(baseXp) || 0);
  const scaled = Math.round(base * (1 + lvl * XP_SCALING.LEVEL_FACTOR));
  return scaled;
}

/**
 * Calcula o custo dinâmico de dinheiro para treinamento baseado no nível.
 * O custo escala proporcionalmente à progressão de XP para manter o desafio econômico.
 * 
 * @param {number} baseMoney - Custo base em dinheiro
 * @param {number} level - Nível atual do jogador
 * @returns {number} - Custo escalonado
 */
function calculateTrainingCost(baseMoney, level) {
  const lvl = Math.max(1, Number(level) || 1);
  const base = Math.max(0, Number(baseMoney) || 0);

  // Escala: 0.8% de aumento por nível. 
  // Nível 100 = ~1.8x o custo base.
  // Nível 1000 = ~9x o custo base.
  // Isso garante que o dinheiro não perca valor conforme o jogador progride e ganha mais.
  const multiplier = 1 + (lvl - 1) * 0.008; 
  return Math.floor(base * multiplier);
}

/**
 * Calcula o HP máximo virtual para fins de simulação de combate.
 * Junior: "Por que não salvar no BD?"
 * Senior: "Porque HP que regenera instantaneamente é estado volátil. 
 *          Calculá-lo no voo simplifica a sincronização e evita overhead de I/O."
 */
function calculateMaxHP(player) {
  // SÊNIOR: No modelo TRI-CLASH, usamos a escala 0-100 para impacto visual Hi-Fi.
  return 100;
}

/**
 * Retorna o Título de Prestígio baseado no nível e facção.
 */
function getFactionRank(level, faction) {
  const lvl = Number(level) || 1;
  const fac = String(faction || '').toLowerCase();
  const isRenegado = fac === 'renegados' || fac === 'gangsters';

  if (isRenegado) {
    if (lvl <= 50)   return "Desordeiro das Ruas";
    if (lvl <= 150)  return "Brutamontes Neon";
    if (lvl <= 300)  return "Senhor da Guerra Cibernético";
    if (lvl <= 500)  return "Executor Sombrio";
    if (lvl <= 700)  return "Saqueador Aumentado";
    if (lvl <= 900)  return "Destruidor de Dados";
    return "Renegado Supremo";
  } else {
    if (lvl <= 50)   return "Cadete Executor";
    if (lvl <= 150)  return "Vingador Neon";
    if (lvl <= 300)  return "Guardião Circuito";
    if (lvl <= 500)  return "Comandante Cibernético";
    if (lvl <= 700)  return "Punidor Aegis";
    if (lvl <= 900)  return "Paladino Destruidor";
    return "Sentinela Dominante";
  }
}

const RECON_DEFEAT_PHRASES = [
  "Parece que seu sistema operacional é o Windows 95.",
  "Seu chassi de lata não aguentou o tranco, hein?",
  "O oponente te deletou da existência... temporariamente.",
  "Até uma calculadora de bolso teria lutado melhor.",
  "Seu cooler parou de girar ou você é ruim assim mesmo?",
  "Reiniciando... na esperança de que você aprenda a lutar.",
  "Seus circuitos estão fritando de vergonha.",
  "Você foi transformado em sucata premium.",
  "Erro 404: Habilidade não encontrada.",
  "Talvez o Pac-Man seja mais o seu nível.",
  "Sua placa de vídeo deve estar com artefatos, porque você não viu esse golpe vindo.",
  "Apanhou tanto que seu avatar está em 144p agora.",
  "Iniciando protocolo de reparo de ego ferido.",
  "O inimigo te deu um 'format C:' sem pedir permissão.",
  "Seu ping deve estar em 999ms, só pode ser isso.",
];

function getRandomDefeatPhrase() {
  return RECON_DEFEAT_PHRASES[Math.floor(Math.random() * RECON_DEFEAT_PHRASES.length)];
}

module.exports = {

  getXpRequiredForNextLevel,
  calculateDynamicLevel,
  getFactionRank,
  getTotalXpUntilLevel,
  deriveXpStatus,
  calculateLevelFromXp,
  calculateMaxHP,
  // Novas funções de combate e CRIT
  calcCritChance,
  calcCritDamageMultiplier,
  resolveCombatHit,
  resolveWinOutcome,
  resolveStrategicCombat,
  resolveActiveTurn,
  calculateTotalPower,
  scaleXpByLevel,
  calculateTrainingCost,
  // Constantes exportadas para uso em rotas/serviços
  COMBAT,
  XP_SCALING,
  ENERGY,
  getRandomDefeatPhrase,

};
