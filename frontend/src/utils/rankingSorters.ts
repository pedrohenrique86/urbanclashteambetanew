import { Player, Clan } from "../types/ranking";

/**
 * Ordena uma lista de jogadores com base no nível e, em seguida, na experiência.
 * (Deve espelhar a regra do backend: ORDER BY level DESC, experience_points DESC)
 */
export function sortPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    // 1. Ordenar por nível (maior para o menor)
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    // 2. Critério de desempate: experiência (maior para o menor)
    return (b.current_xp ?? 0) - (a.current_xp ?? 0);
  });
}

/**
 * Ordena uma lista de clãs com base na pontuação e, em seguida, no número de membros.
 * (Deve espelhar a regra do backend: ORDER BY points DESC, member_count DESC)
 * Nota: member_count não está no tipo Clan, precisaria ser adicionado se o desempate for crítico.
 * Por enquanto, ordenaremos apenas por score.
 */
export function sortClans(clans: Clan[]): Clan[] {
  return [...clans].sort((a, b) => b.score - a.score);
}

/**
 * Atualiza a propriedade 'position' de uma lista já ordenada.
 */
export function updatePositions<T extends { id: string }>(
  items: T[],
): (T & { position: number })[] {
  return items.map((item, index) => ({
    ...item,
    position: index + 1,
  }));
}
