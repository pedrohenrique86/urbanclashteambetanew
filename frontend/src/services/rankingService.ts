import { apiClient } from "../lib/supabaseClient";
import { Player, Clan } from "../types/ranking";

/**
 * Busca ranking de jogadores por facção
 */
export const fetchPlayerRankings = async (
  faction: "gangsters" | "guardas",
  opts?: { force?: boolean },
): Promise<Player[]> => {
  try {
    const key = `etag_users_rankings_${faction}`;
    const etag = localStorage.getItem(key) || undefined;
    const params = faction ? `?faction=${faction}` : "";
    
    const response: any = await (apiClient as any).request(
      `/users/rankings${params}`,
      {
        headers: opts?.force
          ? undefined
          : etag
            ? ({ "If-None-Match": etag } as Record<string, string>)
            : undefined,
      },
    );

    const mapPlayer = (player: any, index: number) => ({
      id: player.id,
      username: player.username,
      display_name: (player.display_name && player.display_name.trim()) || player.username,
      avatar_url: player.avatar_url || null,
      level: Number(player.level) || 1,
      current_xp: Number(player.current_xp) || 0,
      faction: player.faction,
      position: index + 1,
      country: player.country || null,
    });

    if (response?.__notModified) {
      const cached = localStorage.getItem(`cached_users_rankings_${faction}`);
      if (cached) return JSON.parse(cached);
      // Fallback em caso de cache corrompido
      const fresh: any = await (apiClient as any).request(`/users/rankings${params}`);
      const players = (fresh.leaderboard || []).map(mapPlayer);
      if (fresh.__etag) localStorage.setItem(key, fresh.__etag);
      localStorage.setItem(`cached_users_rankings_${faction}`, JSON.stringify(players));
      return players;
    }

    const leaderboard = response.leaderboard || [];
    const players = leaderboard.map(mapPlayer);

    if (response.__etag) localStorage.setItem(key, response.__etag);
    localStorage.setItem(`cached_users_rankings_${faction}`, JSON.stringify(players));

    return players;
  } catch (error) {
    console.error(`❌ Erro ao buscar ranking de ${faction}:`, error);
    return [];
  }
};

/**
 * Busca ranking de clãs
 */
export const fetchClanRankings = async (opts?: {
  force?: boolean;
}): Promise<Clan[]> => {
  try {
    const key = `etag_clans_rankings`;
    const etag = localStorage.getItem(key) || undefined;
    
    const response: any = await (apiClient as any).request(`/clans/rankings`, {
      headers: opts?.force
        ? undefined
        : etag
          ? ({ "If-None-Match": etag } as Record<string, string>)
          : undefined,
    });

    const mapClan = (clan: any, index: number) => ({
      id: clan.id,
      name: clan.name,
      faction: clan.faction,
      score: Number(clan.score) || 0,
      position: index + 1,
      memberCount: Number(clan.member_count) || 0,
      leaderName: (clan.leader_display_name && clan.leader_display_name.trim()) || 
                  clan.leader_username || "Sem líder",
    });

    if (response?.__notModified) {
      const cached = localStorage.getItem(`cached_clans_rankings`);
      if (cached) return JSON.parse(cached);
      const fresh: any = await (apiClient as any).request(`/clans/rankings`);
      const clans = (fresh.clans || []).map(mapClan);
      if (fresh.__etag) localStorage.setItem(key, fresh.__etag);
      localStorage.setItem(`cached_clans_rankings`, JSON.stringify(clans));
      return clans;
    }

    const clans = (response.clans || []).map(mapClan);
    if (response.__etag) localStorage.setItem(key, response.__etag);
    localStorage.setItem(`cached_clans_rankings`, JSON.stringify(clans));

    return clans;
  } catch (error) {
    console.error("❌ Erro ao buscar ranking de clãs:", error);
    return [];
  }
};

/**
 * Busca todos os rankings — Agora busca sempre o snapshot completo (SSOT)
 */
export const fetchAllRankings = async (force?: boolean) => {
  try {
    const [gangsters, guardas, clans] = await Promise.all([
      fetchPlayerRankings("gangsters", { force }),
      fetchPlayerRankings("guardas", { force }),
      fetchClanRankings({ force }),
    ]);

    return { gangsters, guardas, clans };
  } catch (error) {
    console.error("❌ Erro ao buscar rankings SSOT:", error);
    return { gangsters: [], guardas: [], clans: [] };
  }
};
