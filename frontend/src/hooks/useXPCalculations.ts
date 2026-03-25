import { useMemo } from 'react';
import { calculateLevel, getXPForLevel } from '../utils/leveling';

export interface XPCalculations {
  level: number;
  nextLevelXP: number;
  accumulatedXP: number;
  currentLevelXP: number;
  progressPercentage: number;
}

export const useXPCalculations = (totalXP: number): XPCalculations => {
  return useMemo(() => {
    const levelInfo = calculateLevel(totalXP);
    const accumulatedXP = getXPForLevel(levelInfo.level);
    
    return {
      level: levelInfo.level,
      nextLevelXP: levelInfo.xpForNextLevel,
      accumulatedXP,
      currentLevelXP: levelInfo.currentXP,
      progressPercentage: levelInfo.xpProgress
    };
  }, [totalXP]);
};