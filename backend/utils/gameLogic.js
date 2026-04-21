/**
 * gameLogic.js
 * 
 * Centraliza as regras de negócio de progressão e economia do jogo.
 * Evita duplicação de lógica entre serviços e rotas.
 */

/**
 * Retorna o XP necessário para passar do nível atual para o próximo.
 */
function getXpRequiredForNextLevel(level) {
  if (level <= 5) return 100;
  if (level <= 15) return 200;
  if (level <= 30) return 500;
  return 1000;
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
 * Retorna { currentXpInLevel, xpRequiredForNext }
 */
function deriveXpStatus(totalXp, level) {
  const xpAtStartOfLevel = getTotalXpUntilLevel(level);
  const currentXpInLevel = Math.max(0, totalXp - xpAtStartOfLevel);
  const xpRequiredForNext = getXpRequiredForNextLevel(level);
  
  return {
    currentXp: currentXpInLevel,
    xpRequired: xpRequiredForNext
  };
}

/**
 * Calcula qual deveria ser o nível do jogador baseado no XP total.
 * Útil para validação e correção automática.
 */
function calculateLevelFromXp(totalXp) {
  let level = 1;
  let remainingXp = totalXp;
  
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

module.exports = {
  getXpRequiredForNextLevel,
  getTotalXpUntilLevel,
  deriveXpStatus,
  calculateLevelFromXp
};
