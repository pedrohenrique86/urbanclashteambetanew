/**
 * gameLogic.js
 * 
 * Centraliza as regras de negócio de progressão e economia do jogo.
 * Evita duplicação de lógica entre serviços e rotas.
 */

/**
 * Retorna o XP necessário para passar do nível atual para o próximo.
 * Baseado na nova curva de progressão solicitada.
 */
function getXpRequiredForNextLevel(level) {
  const lvl = Number(level) || 1;
  if (lvl <= 5) return 100;
  if (lvl <= 15) return 150;
  if (lvl <= 30) return 300;
  return 500;
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

module.exports = {
  getXpRequiredForNextLevel,
  getTotalXpUntilLevel,
  deriveXpStatus,
  calculateLevelFromXp
};
