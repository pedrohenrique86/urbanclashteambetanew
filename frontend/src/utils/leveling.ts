// Leveling utility functions

export interface LevelInfo {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  xpProgress: number;
  totalXPForCurrentLevel: number;
}

/**
 * Get XP requirement for a specific level (Synchronized with Backend)
 */
const getXPRequirementForLevel = (level: number): number => {
  return 100 + (Math.floor(level / 5) * 10);
};

/**
 * Get Prestige Rank Title based on Level and Faction
 */
export const getFactionRank = (level: number, faction: string): string => {
  const lvl = level || 1;
  const fac = (faction || '').toLowerCase().trim();
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
};

/**
 * Calculate the level based on XP using the synchronized formula
 * @param xp - Current experience points
 * @returns Level information object
 */
export const calculateLevel = (xp: number): LevelInfo => {
  if (xp < 0) {
    return {
      level: 1,
      currentXP: 0,
      xpForNextLevel: 100,
      xpProgress: 0,
      totalXPForCurrentLevel: 100,
    };
  }

  let level = 1;
  let totalXP = 0;
  
  for (;;) {
    const xpForCurrentLevel = getXPRequirementForLevel(level);
    if (totalXP + xpForCurrentLevel > xp) {
      break;
    }
    totalXP += xpForCurrentLevel;
    level++;
    if (level >= 5000) break; // Safety
  }

  const xpForCurrentLevel = getXPRequirementForLevel(level);
  const currentXP = xp - totalXP;
  const xpForNextLevel = xpForCurrentLevel - currentXP;
  const xpProgress = (currentXP / xpForCurrentLevel) * 100;

  return {
    level,
    currentXP,
    xpForNextLevel,
    xpProgress: Math.round(xpProgress * 100) / 100,
    totalXPForCurrentLevel: xpForCurrentLevel,
  };
};

/**
 * Calculate total XP required to reach a specific level
 */
export const getXPForLevel = (targetLevel: number): number => {
  if (targetLevel <= 1) return 0;
  let totalXP = 0;
  for (let level = 1; level < targetLevel; level++) {
    totalXP += getXPRequirementForLevel(level);
  }
  return totalXP;
};

/**
 * Get XP required for the next level from current XP
 */
export const getXPForNextLevel = (currentXP: number): number => {
  const levelInfo = calculateLevel(currentXP);
  return levelInfo.xpForNextLevel;
};
