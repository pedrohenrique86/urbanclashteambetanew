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
  ATK_MULTIPLIER        : 15,    // Aumentado de 10 para 15 para maior letalidade e menos empates
  DEF_SOFTCAP           : 200,   // redução = DEF / (DEF + DEF_SOFTCAP)

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
  XP_WIN_BASE           : 100,   // XP base por vitória em 1x1
  XP_LOSE_BASE          : 20,    // XP por derrota (não punir totalmente)
  XP_WIN_ATK_DIFF_FACTOR: 0.5,   // bônus de XP proporcional à diferença de ATK
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
  while (true) {
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
  // Cada $100.000 = +1 Nível de Prestígio
  // Isso torna o dinheiro um bônus, não a fonte principal de nível.
  const moneyBonus = Math.floor((Number(user.money) || 0) / 100000);

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
 * Calcula qual deveria ser o nível do jogador baseado no XP total.
 * Suporta múltiplos level-ups instantâneos.
 */
function calculateLevelFromXp(totalXp) {
  let level = 1;
  let remainingXp = Math.max(0, Number(totalXp) || 0);
  
  while (true) {
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

  const chance = COMBAT.CRIT_BASE
    + foc    * COMBAT.CRIT_FOC_FACTOR
    + rawCrit * COMBAT.CRIT_RAW_FACTOR;

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

  let base;
  if (faction === 'renegados' || faction === 'gangsters') {
    base = COMBAT.CRIT_DMG_BASE_RENEGADO;
  } else if (faction === 'guardioes' || faction === 'guardas') {
    base = COMBAT.CRIT_DMG_BASE_GUARDIAO;
  } else {
    base = COMBAT.CRIT_DMG_GENERIC_BASE;
  }

  const totalPct = base + (rawDmg * COMBAT.CRIT_DMG_RAW_FACTOR) + statsBonus;
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

  const isBleedingAtk = attacker.status === 'Sangrando';
  const isBleedingDef = defender.status === 'Sangrando';

  const atkFinal = rawAtk * atkMult * (isBleedingAtk ? 0.80 : 1.0);
  const defFinal = rawDef * defMult * (isBleedingDef ? 0.80 : 1.0);

  // 2. Mecânicas Avançadas (DADOS REAIS E IDENTIDADE DE CLASSE)
  // BREACH (Assinatura Renegada): Usa a Intimidação (35%) para chance de ignorar parte da Defesa
  const breachChance = attackerIntimidation > 0 ? (attackerIntimidation * 100) : 0; 
  const isBreach = Math.random() * 100 < breachChance;
  const defMitigation = isBreach ? 0.60 : 1.0; // Ignora 40% da def se quebrar (Lethal)

  // CONTRA-ATAQUE (Assinatura Guardiã): Usa a Disciplina (40%) para chance de rechaçar golpe
  const counterChance = defenderDiscipline > 0 ? (defenderDiscipline * 100) / 2 : 0; // 20% de chance real
  const isCounter = Math.random() * 100 < counterChance;

  // EVASÃO: Diferença de Foco
  const focalEdge = Math.max(0, defender.focus - attacker.focus);
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

  // 5. INCIDENTES DE CAMPO (2% de chance)
  let incident = null;
  const incidentRoll = Math.random() * 100;
  if (incidentRoll < 2.0) {
     const typeRoll = Math.random();
     if (typeRoll < 0.33) {
       incident = { type: "OVERHEAT", label: "SUPERAQUECIMENTO!", selfDmgPct: 0.05, dmgMult: 1.8 };
     } else if (typeRoll < 0.66) {
       incident = { type: "SIGNAL_GLITCH", label: "INTERFERÊNCIA!", dmgMult: 0 };
     } else {
       incident = { type: "SHRAPNEL", label: "EXPLOSÃO EXTERNA!", globalDmg: Math.round(atkFinal * 0.3) };
     }
  }

  if (incident && incident.dmgMult !== undefined) resolvedDamage = Math.round(resolvedDamage * incident.dmgMult);

  return {
    damage: Math.max(0, resolvedDamage),
    isCrit,
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
  const def = Math.max(0, Number(player.defense) || 0);
  const lvl = Math.max(1, Number(player.level) || 1);
  const atk = Math.max(0, Number(player.attack) || 0);
  const foc = Math.max(0, Number(player.focus) || 0);
  
  const totalStats = atk + def + foc;
  const faction = String(player.faction || '').toLowerCase();
  
  // Fórmula base reequilibrada para amortizar o COMBAT.ATK_MULTIPLIER = 15.
  // Escala agora muito melhor com os atributos do jogador para evitar OHKO e DKOs no 1º turno.
  let hp = 100 + (lvl * 15) + (def * 10) + (totalStats * 4);

  // Modificadores de Vitalidade por Facção (Compensa as afinidades de dano)
  if (faction === 'guardioes' || faction === 'guardas') {
    hp *= 1.25; // +25% HP para Guardiões (Sustentação)
  } else if (faction === 'renegados' || faction === 'gangsters') {
    hp *= 0.90; // -10% HP para Renegados (Fragilidade)
  }
  
  return Math.round(hp);
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
  scaleXpByLevel,
  calculateTrainingCost,
  // Constantes exportadas para uso em rotas/serviços
  COMBAT,
  XP_SCALING,
  ENERGY,
};

