import { apiClient } from '../lib/supabaseClient';
import { Player, Clan } from '../types/ranking';

/**
 * Busca ranking de jogadores por facção
 */
export const fetchPlayerRankings = async (
  faction: 'gangsters' | 'guardas',
  opts?: { force?: boolean }
): Promise<Player[]> => {
  try {
    console.log(`🔍 Buscando ranking de ${faction}...`);
    const key = `etag_users_rankings_${faction}_26`;
    const etag = localStorage.getItem(key) || undefined;
    const params = faction ? `?faction=${faction}` : '';
    const response: any = await (apiClient as any).request(`/users/rankings${params}`, {
      headers: opts?.force ? undefined : (etag ? { 'If-None-Match': etag } as Record<string, string> : undefined)
    });
    console.log(`✅ Resposta da API para ${faction}:`, response);
    
    if (response?.__notModified) {
      const cached = localStorage.getItem(`cached_users_rankings_${faction}_26`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed;
      }
      const fresh: any = await (apiClient as any).request(`/users/rankings${params}`);
      if (!fresh || !fresh.leaderboard) {
        return [];
      }
      const playersFresh = fresh.leaderboard.map((player: any, index: number) => ({
        id: player.id,
        username: player.display_name || player.username,
        level: player.level || 1,
        current_xp: player.experience_points || 0,
        faction: player.faction,
        position: index + 1,
        country: player.country
      }));
      if (fresh.__etag) {
        localStorage.setItem(key, fresh.__etag);
      }
      localStorage.setItem(`cached_users_rankings_${faction}_26`, JSON.stringify(playersFresh));
      return playersFresh;
    }
    
    if (!response || !response.leaderboard) {
      console.warn(`⚠️ Nenhum dado de ranking encontrado para ${faction}`);
      return [];
    }
    
    const players = response.leaderboard.map((player: any, index: number) => ({
      id: player.id,
      username: player.display_name || player.username,
      level: player.level || 1,
      current_xp: player.experience_points || 0,
      faction: player.faction,
      position: index + 1,
      country: player.country // Campo opcional
    }));
    
    if (response.__etag) {
      localStorage.setItem(key, response.__etag);
    }
    localStorage.setItem(`cached_users_rankings_${faction}_26`, JSON.stringify(players));
    
    console.log(`✅ ${players.length} jogadores ${faction} processados`);
    return players;
    
  } catch (error) {
    console.error(`❌ Erro ao buscar ranking de ${faction}:`, error);
    return [];
  }
};

/**
 * Busca ranking de clãs
 */
export const fetchClanRankings = async (opts?: { force?: boolean }): Promise<Clan[]> => {
  try {
    console.log('🔍 Buscando ranking de clãs...');
    
    const key = `etag_clans_rankings_26`;
    const etag = localStorage.getItem(key) || undefined;
    const response: any = await (apiClient as any).request(`/clans/rankings`, {
      headers: opts?.force ? undefined : (etag ? { 'If-None-Match': etag } as Record<string, string> : undefined)
    });
    console.log('✅ Resposta da API para clãs:', response);
    
    if (response?.__notModified) {
      const cached = localStorage.getItem(`cached_clans_rankings_26`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed;
      }
      const fresh: any = await (apiClient as any).request(`/clans/rankings`);
      if (!fresh || !fresh.clans) {
        return [];
      }
      const clansFresh = fresh.clans.map((clan: any, index: number) => ({
        id: clan.id,
        name: clan.name,
        faction: clan.faction,
        score: 0,
        position: index + 1,
        memberCount: clan.member_count || 0,
        leaderName: clan.leader_username || clan.leader_display_name || 'Sem líder'
      }));
      if (fresh.__etag) {
        localStorage.setItem(key, fresh.__etag);
      }
      localStorage.setItem(`cached_clans_rankings_26`, JSON.stringify(clansFresh));
      return clansFresh;
    }
    
    if (!response || !response.clans) {
      console.warn('⚠️ Nenhum dado de ranking de clãs encontrado');
      return [];
    }
    
    const clans = response.clans.map((clan: any, index: number) => ({
      id: clan.id,
      name: clan.name,
      faction: clan.faction,
      score: 0,
      position: index + 1,
      memberCount: clan.member_count || 0,
      leaderName: clan.leader_username || clan.leader_display_name || 'Sem líder'
    }));
    
    if (response.__etag) {
      localStorage.setItem(key, response.__etag);
    }
    localStorage.setItem(`cached_clans_rankings_26`, JSON.stringify(clans));
    
    console.log(`✅ ${clans.length} clãs processados`);
    return clans;
    
  } catch (error) {
    console.error('❌ Erro ao buscar ranking de clãs:', error);
    return [];
  }
};

/**
 * Busca todos os rankings (para home page - limitado)
 */
export const fetchAllRankings = async (force?: boolean) => {
  try {
    console.log('🔄 Buscando todos os rankings...');
    
    const [gangsters, guardas, clans] = await Promise.all([
      fetchPlayerRankings('gangsters', { force }),
      fetchPlayerRankings('guardas', { force }),
      fetchClanRankings({ force })
    ]);
    
    // Limitar a 5 itens para a home page
    const result = {
      gangsters: gangsters.slice(0, 5),
      guardas: guardas.slice(0, 5),
      clans: clans.slice(0, 5)
    };
    
    console.log('✅ Todos os rankings carregados:', {
      gangsters: result.gangsters.length,
      guardas: result.guardas.length,
      clans: result.clans.length
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao buscar todos os rankings:', error);
    return {
      gangsters: [],
      guardas: [],
      clans: []
    };
  }
};

/**
 * Busca rankings completos (para página de ranking)
 */
export const fetchFullRankings = async (force?: boolean) => {
  try {
    console.log('🔄 Buscando rankings completos...');
    
    const [gangsters, guardas, clans] = await Promise.all([
      fetchPlayerRankings('gangsters', { force }),
      fetchPlayerRankings('guardas', { force }),
      fetchClanRankings({ force })
    ]);
    
    const result = {
      gangsters,
      guardas,
      clans
    };
    
    console.log('✅ Rankings completos carregados:', {
      gangsters: result.gangsters.length,
      guardas: result.guardas.length,
      clans: result.clans.length
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao buscar rankings completos:', error);
    return {
      gangsters: [],
      guardas: [],
      clans: []
    };
  }
};
