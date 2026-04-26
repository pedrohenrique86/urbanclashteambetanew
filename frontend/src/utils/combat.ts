import { FACTION_ALIAS_MAP_FRONTEND } from './faction';

export interface CombatStats {
  attack: number;
  defense: number;
  focus: number;
  criticalChance: number;
  criticalDamage: number;
  effectiveDefense: number;
  effectiveDamageReduction: number;
}

export const getCriticalChanceExplanation = (): string => {
  return `Base (5%) + (Foco × 0.08) + (Disciplina × 0.1) + Treinos (Cap 60%)`;
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
      effectiveDamageReduction: 0
    };
  }

  const attack = userProfile.attack || 0;
  const defense = userProfile.defense || 0;
  const focus = userProfile.focus || 0;
  const discipline = userProfile.discipline || 0;
  
  // A UI processa os pontos brutos (accumulators) que vêm do banco.
  const rawCrit = userProfile.critical_chance || 0;
  const rawDmg = userProfile.critical_damage || 0;

  // Lógica de Chance Crítica (Sincronizado com backend gameLogic.js)
  // 5% Base + Foco(0.08) + Disciplina(0.1) + Pontos Brutos de Treino
  let criticalChance = 5.0 + (focus * 0.08) + (discipline * 0.10) + rawCrit;
  if (criticalChance > 60.0) criticalChance = 60.0; // Hardcap 60%

  // Lógica de Multiplicador de Dano Crítico (Sincronizado com backend gameLogic.js)
  const rawFaction = typeof userProfile.faction === 'string' 
    ? userProfile.faction 
    : (userProfile.faction?.name || '');
  const factionName = rawFaction.toLowerCase().trim();
  
  // Utilizar o mesmo mapa de alias do frontend para blindar nomes errôneos vindos do BD
  const resolvedFaction = FACTION_ALIAS_MAP_FRONTEND[factionName] || 'gangsters'; // fallback para gangsters (renegados)

  let baseMult = 2.5; // Padrão Renegado/Gangster
  if (resolvedFaction === 'guardas') {
    baseMult = 2.3;
  }
  
  // Transforma os raw points de dano (ex: 50) em multiplicador (ex: +0.50x)
  const criticalDamage = baseMult + (rawDmg / 100);

  let effectiveDefense = defense;
  let effectiveDamageReduction = 0;
  
  if (resolvedFaction === 'gangsters') {
    // Legacy Gangsters logic representation
    effectiveDefense = defense;
  } else if (resolvedFaction === 'guardas') {
    // Softcap reduction is now used in backend: DEF / (DEF + 200)
    effectiveDamageReduction = defense / (defense + 200);
  }
  
  return {
    attack,
    defense,
    focus,
    criticalChance,
    criticalDamage,
    effectiveDefense,
    effectiveDamageReduction
  };
};