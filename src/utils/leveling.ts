// Leveling utility functions

export interface LevelInfo {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  xpProgress: number;
  totalXPForCurrentLevel: number;
}

/**
 * Get XP requirement for a specific level
 * @param level - The level to get XP requirement for
 * @returns XP required for that level
 */
const getXPRequirementForLevel = (level: number): number => {
  if (level <= 5) return 100;
  if (level <= 50) return 150;
  if (level <= 100) return 200;
  if (level <= 150) return 250;
  
  // Para níveis acima de 150, grupos de 50 com aumento de 50 XP
  const group = Math.floor((level - 151) / 50);
  return 300 + (group * 50);
};

/**
 * Calculate the level based on XP using the new progressive formula
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
  
  // Calculate level using new XP requirements
  while (true) {
    const xpForCurrentLevel = getXPRequirementForLevel(level);
    if (totalXP + xpForCurrentLevel > xp) {
      break;
    }
    totalXP += xpForCurrentLevel;
    level++;
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
 * @param targetLevel - The level to calculate XP for
 * @returns Total XP required
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
 * @param currentXP - Current experience points
 * @returns XP needed for next level
 */
export const getXPForNextLevel = (currentXP: number): number => {
  const levelInfo = calculateLevel(currentXP);
  return levelInfo.xpForNextLevel;
};
