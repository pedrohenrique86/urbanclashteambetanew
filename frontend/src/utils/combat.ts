import { FACTION_ALIAS_MAP_FRONTEND } from './faction';

export interface CombatStats {
  attack: number;
  defense: number;
  focus: number;
  criticalChance: number;
  criticalDamage: number;
  effectiveDefense: number;
  effectiveDamageReduction: number;
  merit: number;
  corruption: number;
}

export const getCriticalChanceExplanation = (): string => {
  return `Base (5%) + (Foco × 0.08) + Treinos Acumulados (cap 60%)`;
};

export const getCriticalDamageExplanation = (factionName: string): string => {
  const isRenegado = factionName === 'renegados' || factionName === 'gangsters';
  const base = isRenegado ? '2.50x' : '2.30x';
  return `Multiplicador de Dano no acerto crítico.\nBase da Facção (${base}) + Treinos`;
};

export const calculateCombatStats = (userProfile: any) => {
  if (!userProfile) {
    return {
      attack: 0,
      defense: 0,
      focus: 0,
      criticalChance: 0,
      criticalDamage: 1,
      effectiveDefense: 0,
      effectiveDamageReduction: 0,
      merit: 0,
      corruption: 0
    };
  }

  const attack = userProfile.attack || 0;
  const defense = userProfile.defense || 0;
  const focus = userProfile.focus || 0;
  
  // A UI processa os pontos brutos (accumulators) que vêm do banco.
  const rawCrit = userProfile.critical_chance || 0;
  const rawDmg = userProfile.critical_damage || 0;

  const instinct = Number(userProfile.instinct || 0);
  
  // Lógica de Chance Crítica — SSOT: backend gameLogic.js calcCritChance()
  let criticalChance = 5.0 + (focus * 0.08) + rawCrit + (instinct * 0.15);
  if (criticalChance > 60.0) criticalChance = 60.0; // Hardcap 60%

  // Lógica de Multiplicador de Dano Crítico — SSOT: backend calcCritDamageMultiplier()
  const rawFaction = typeof userProfile.faction === 'string' 
    ? userProfile.faction 
    : (userProfile.faction?.name || '');
  const factionName = rawFaction.toLowerCase().trim();
  const resolvedFaction = FACTION_ALIAS_MAP_FRONTEND[factionName] || 'gangsters';

  // Base por facção (pontos percentuais): Renegados/gangsters=150, Guardiões/guardas=130
  // O FACTION_ALIAS_MAP_FRONTEND normaliza tudo para 'gangsters' | 'guardas'
  let basePct = 150; // default: renegados / gangsters
  if (resolvedFaction === 'guardas') {
    basePct = 130;
  }

  // Bônus de treino: cada 50 atributos combinados = +1% de dano crítico extra
  const statsBonus = Math.floor((attack + defense + focus) / 50);
  const instinctBonus = instinct * 0.5;

  // Multiplicador final: 1 + (base + rawDmg + statsBonus + instinctBonus) / 100
  const criticalDamage = Math.min(4.0, Math.round((1 + (basePct + rawDmg + statsBonus + instinctBonus) / 100) * 100) / 100);

  // DEF softcap: redução = DEF / (DEF + 200) — igual ao backend
  const effectiveDefense = defense;
  const effectiveDamageReduction = defense / (defense + 200);
  
  return {
    attack,
    defense,
    focus,
    criticalChance,
    criticalDamage,
    effectiveDefense,
    effectiveDamageReduction,
    merit: Number(userProfile.merit || 0),
    corruption: Number(userProfile.corruption || 0)
  };
};

export const calculateTotalPower = (user: any, chips: any[] = []) => {
  const atk = Number(user.attack || 0);
  const def = Number(user.defense || 0);
  const foc = Number(user.focus || 0);
  const level = Number(user.level || 1);
  const critChance = Number(user.crit_chance_pct || 0);
  const critMult = Number(user.crit_damage_mult || 1);
  const specialValue = Number(user.intimidation || user.discipline || 0);

  const weaponDmg = Number(user.weapon_damage || 0);
  const shieldProt = Number(user.shield_protection || 0);

  const instinct = Number(user.instinct || 0);

  // Fórmula unificada SSOT
  // (ATK + ARMA + DEF + ESCUDO + FOC×0.5 + INS×1.5) + (NVL×2) + (CRIT%×0.2 + CRITx)
  let powerSolo = (atk + weaponDmg + def + shieldProt + foc * 0.5 + instinct * 1.5) + (level * 2) + (critChance * 0.2 + critMult);
  
  if (chips && chips.length > 0) {
    chips.forEach(chip => {
      // Usando power_boost (que é o efeito que aumenta o poder total)
      const boost = Number(chip.power_boost || chip.effect_value || 0);
      if (boost > 0 && (chip.effect_type === 'power_boost' || chip.power_boost)) {
        powerSolo *= (1 + boost / 100);
      }
    });
  }

  if (user.status === 'Ruptura') {
    powerSolo *= 0.8; // 20% penalty
  }
  
  const powerSoloFinal = Math.floor(powerSolo);
  const powerWarFinal = Math.floor(powerSoloFinal + specialValue);

  return {
    powerSolo: powerSoloFinal,
    powerWar: powerWarFinal
  };
};
