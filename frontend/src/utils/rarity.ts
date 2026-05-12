/**
 * rarity.ts
 * Centraliza as cores e utilitários de raridade do UrbanClash.
 */

export type Rarity = 'common' | 'rare' | 'legendary' | 'epic' | 'uncommon';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: 'text-slate-400',      // Cinza
  uncommon: 'text-emerald-400',  // Verde
  rare: 'text-violet-400',      // Violeta
  epic: 'text-fuchsia-400',      // Fuchsia
  legendary: 'text-amber-400'    // Ouro/Amber
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'COMUM',
  uncommon: 'INCOMUM',
  rare: 'RARO',
  epic: 'ÉPICO',
  legendary: 'LENDÁRIO'
};

/**
 * Retorna a cor de tailwind para uma raridade.
 */
export const getRarityColor = (rarity?: string): string => {
  if (!rarity) return RARITY_COLORS.common;
  const normalized = rarity.toLowerCase() as Rarity;
  return RARITY_COLORS[normalized] || RARITY_COLORS.common;
};

/**
 * Retorna o rótulo formatado de uma raridade.
 */
export const getRarityLabel = (rarity?: string): string => {
  if (!rarity) return RARITY_LABELS.common;
  const normalized = rarity.toLowerCase() as Rarity;
  return RARITY_LABELS[normalized] || RARITY_LABELS.common;
};
