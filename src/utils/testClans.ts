import { Clan } from '../types/ranking';

/**
 * Test function to validate clan data
 * @param clan - The clan object to test
 * @returns boolean indicating if the clan is valid
 */
export function validateClan(clan: Clan): boolean {
  if (!clan || typeof clan !== 'object') {
    return false;
  }

  // Check required properties
  if (!clan.id || typeof clan.id !== 'string') {
    return false;
  }

  if (!clan.name || typeof clan.name !== 'string') {
    return false;
  }

  if (!clan.faction || !['gangsters', 'guardas'].includes(clan.faction)) {
    return false;
  }

  if (typeof clan.score !== 'number' || clan.score < 0) {
    return false;
  }

  return true;
}

/**
 * Test function to check if a clan can be updated
 * @param clan - The clan object to check
 * @returns boolean indicating if the clan can be updated
 */
export function canUpdateClan(clan: Clan): boolean {
  return validateClan(clan) && clan.score >= 0;
}

/**
 * Test function to format clan display name
 * @param clan - The clan object to format
 * @returns formatted clan name
 */
export function formatClanName(clan: Clan): string {
  if (!validateClan(clan)) {
    return 'Invalid Clan';
  }
  
  return `${clan.name} (${clan.faction})`;
}

/**
 * Test function to compare two clans by score
 * @param clanA - First clan to compare
 * @param clanB - Second clan to compare
 * @returns number for sorting (-1, 0, 1)
 */
export function compareClansByScore(clanA: Clan, clanB: Clan): number {
  if (!validateClan(clanA) || !validateClan(clanB)) {
    return 0;
  }
  
  return clanB.score - clanA.score; // Descending order
}