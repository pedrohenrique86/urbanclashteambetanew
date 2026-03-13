import { apiClient } from '../lib/supabaseClient';
import { Player, Clan } from '../types/ranking';

/**
 * Busca ranking de jogadores por facção
 */
export const fetchPlayerRankings = async (faction: 'gangsters' | 'guardas'): Promise<Player[]> => {
  try {
    console.log(`🔍 Buscando ranking de ${faction}...`);
    
    const response = await apiClient.getPlayerRankings(faction);
    console.log(`✅ Resposta da API para ${faction}:`, response);
    
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
export const fetchClanRankings = async (): Promise<Clan[]> => {
  try {
    console.log('🔍 Buscando ranking de clãs...');
    
    const response = await apiClient.getClanRankings();
    console.log('✅ Resposta da API para clãs:', response);
    
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
export const fetchAllRankings = async () => {
  try {
    console.log('🔄 Buscando todos os rankings...');
    
    const [gangsters, guardas, clans] = await Promise.all([
      fetchPlayerRankings('gangsters'),
      fetchPlayerRankings('guardas'),
      fetchClanRankings()
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
export const fetchFullRankings = async () => {
  try {
    console.log('🔄 Buscando rankings completos...');
    
    const [gangsters, guardas, clans] = await Promise.all([
      fetchPlayerRankings('gangsters'),
      fetchPlayerRankings('guardas'),
      fetchClanRankings()
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
