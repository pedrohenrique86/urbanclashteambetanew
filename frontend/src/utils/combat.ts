export interface CombatStats {
  attack: number;
  defense: number;
  focus: number;
  criticalChance: number;
  criticalDamage: number;
  effectiveDefense: number;
  effectiveDamageReduction: number;
}

// Função para explicar o cálculo da chance crítica
export const getCriticalChanceExplanation = (focus: number): string => {
  return `Chance Crítico = Foco * 2`;
};

// Função para explicar o cálculo do dano crítico
export const getCriticalDamageExplanation = (attack: number, focus: number): string => {
  return `Dano Crítico = Ataque + (Foco / 2)\nBônus = +2% de Dano Crítico acima de Foco 50`;
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

  // Obter valores diretamente do perfil do usuário sem valores padrão
  const attack = userProfile.attack;
  const defense = userProfile.defense;
  const focus = userProfile.focus;
  
  // Nova lógica de chance crítica:
  // Se foco >= 50: crítico sempre acerta (100%)
  // Se foco < 50: foco * 2 = % (ex: 25*2 = 50%)
  const criticalChance = focus >= 50 ? 100 : focus * 2;
  
  // Nova lógica de dano crítico:
  // Base: Ataque + (Foco ÷ 2)
  // Se foco >= 50: cada ponto acima de 50 adiciona +2% ao dano crítico
  let criticalDamage = attack + (focus / 2);
  if (focus >= 50) {
    const extraFocus = focus - 50;
    const bonusPercentage = extraFocus * 2; // +2% por ponto acima de 50
    criticalDamage = criticalDamage * (1 + bonusPercentage / 100);
  }
  
  // Aplicar bônus de facção
  let effectiveDefense = defense;
  let effectiveDamageReduction = 0;
  
  // Garantir que estamos usando apenas os valores plurais das facções
  const faction = userProfile.faction;
  
  if (faction === 'gangsters') {
    // Gangsters: Intimidação = -35% defesa inimiga
    effectiveDefense = defense;
  } else if (faction === 'guardas') {
    // Guardas: Disciplina = -40% dano recebido
    effectiveDamageReduction = 0.4; // 40% de redução de dano
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