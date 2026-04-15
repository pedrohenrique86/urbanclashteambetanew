import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { useTheme } from "../contexts/ThemeContext";
import { apiClient } from "../lib/supabaseClient";
import { ClanChat } from "../components/clan/ClanChat";
import DigitalIdentity from "../components/DigitalIdentity";

type Player = {
  id?: string;
  user_id?: string;
  username: string;
  display_name?: string;
  level?: number;
  role?: string;
  country?: string;
};

type ClanData = {
  id: string;
  name: string;
  description?: string;
  faction?: "gangsters" | "guardas";
  member_count?: number;
  max_members?: number;
  available_slots?: number;
  score?: number;
  vault?: number;
  members?: Player[];
};

export default function ClanPage() {
  const navigate = useNavigate();
  const { themeClasses } = useTheme();
  const { userProfile, setUserProfile } = useUserProfileContext();

  const [clan, setClan] = useState<ClanData | null>(null);
  const [clanLoading, setClanLoading] = useState<boolean>(true);
  const [clanError, setClanError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<boolean>(false);
  const [confirmLeave, setConfirmLeave] = useState<boolean>(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  // Função para obter a URL da bandeira do país (Reutilizada do PlayerRankingItem)
  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return null;
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  };

  const factionColor = useMemo(() => {
    const f = clan?.faction || userProfile?.faction;
    return f === "gangsters"
      ? {
          gradient: "from-orange-500 to-orange-700",
          ring: "ring-orange-400",
          accent: "text-orange-400",
        }
      : {
          gradient: "from-blue-500 to-blue-700",
          ring: "ring-blue-400",
          accent: "text-blue-400",
        };
  }, [clan?.faction, userProfile?.faction]);

  const availableSlots = useMemo(() => {
    if (!clan) return 0;

    if (typeof clan.available_slots === "number") {
      return clan.available_slots;
    }

    if (
      typeof clan.max_members === "number" &&
      typeof clan.member_count === "number"
    ) {
      return Math.max(clan.max_members - clan.member_count, 0);
    }

    return 0;
  }, [clan]);

  useEffect(() => {
    if (userProfile?.clan_id) {
      fetchClan(userProfile.clan_id);
    } else if (userProfile) {
      navigate("/qg", { replace: true });
    }
  }, [userProfile, navigate]);

  const fetchClan = async (clanId: string) => {
    try {
      setClanLoading(true);
      setClanError(null);

      const data = await apiClient.getClan(clanId);

      const rawClan = data?.clan || data || {};
      const rawMembers = data?.members || rawClan?.members || [];

      let normalized: ClanData = {
        id: rawClan?.id || clanId,
        name: rawClan?.name || "Clã",
        description: rawClan?.description || "",
        faction: rawClan?.faction,
        member_count: Array.isArray(rawMembers)
          ? rawMembers.length
          : (rawClan?.member_count ?? 0),
        max_members: rawClan?.max_members ?? rawClan?.capacity ?? 0,
        available_slots: rawClan?.available_slots,
        score: rawClan?.score ?? rawClan?.strength ?? 0,
        vault: rawClan?.vault ?? rawClan?.cofre ?? 0,
        members: Array.isArray(rawMembers) ? rawMembers : [],
      };

      if (
        (!normalized.members || normalized.members.length === 0) &&
        normalized.id
      ) {
        try {
          const m = await apiClient.getClanMembers(String(normalized.id));
          const membersList = m?.members || m || [];

          normalized = {
            ...normalized,
            members: Array.isArray(membersList) ? membersList : [],
            member_count: Array.isArray(membersList)
              ? membersList.length
              : normalized.member_count,
          };
        } catch (error) {
          console.warn("Falha ao carregar membros do clã:", error);
        }
      }

      setClan(normalized);
    } catch (e) {
      setClanError("Erro ao carregar dados do clã");
    } finally {
      setClanLoading(false);
    }
  };

  const handleLeaveClan = async () => {
    if (!clan?.id || !userProfile) return;

    try {
      setLeaving(true);

      await apiClient.leaveClan(clan.id);

      setUserProfile((prev) => prev ? { ...prev, clan_id: undefined } : null);

      navigate("/qg");
    } catch (e) {
      setClanError("Erro ao sair do clã");
    } finally {
      setLeaving(false);
      setConfirmLeave(false);
    }
  };

  if (clanLoading) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center`}>
        <div className="text-white">Carregando dados do clã...</div>
      </div>
    );
  }

  if (clanError) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center`}>
        <div className={`${themeClasses.cardBg} p-6 rounded-lg border ${themeClasses.border} text-center`}>
          <p className="text-red-400 mb-4">{clanError}</p>

          <button
            type="button"
            onClick={() => {
              if (userProfile?.clan_id) {
                fetchClan(userProfile.clan_id);
              }
            }}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen ${themeClasses.bg} text-white font-exo max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 space-y-6`}
    >
      <div className={`rounded-xl p-6 bg-gradient-to-r ${factionColor.gradient} shadow-xl ring-2 ${factionColor.ring}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-orbitron font-extrabold tracking-tight">
              {clan?.name || "Clã"}
            </h1>

            <p className="text-sm text-white/80 mt-1">
              {clan?.description || "Descrição do clã."}
            </p>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold">{clan?.score || 0}</p>
            <p className="text-xs text-white/70">PONTUAÇÃO</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-stretch">
        {/* Coluna da Esquerda: Chat */}
        <div className="flex">
          <ClanChat members={clan?.members} />
        </div>

        {/* Coluna da Direita: Membros e Opções */}
        <div className="flex flex-col space-y-6">
          {/* Card de Membros */}
          <div
            className={`${themeClasses.cardBg} p-6 rounded-xl border ${themeClasses.border} flex flex-col flex-grow`}
          >
            <h2 className={`text-xl font-bold mb-4 ${factionColor.accent}`}>
              MEMBROS ({clan?.member_count || 0} / {clan?.max_members || 0})
            </h2>
            <ul className="space-y-2 overflow-y-auto flex-grow min-h-[200px]">
              {clan?.members?.map((member, index) => (
                <li
                  key={
                    member.id ||
                    member.user_id ||
                    `${member.username}-${index}`
                  }
                  className="flex items-center p-2 bg-black/30 rounded-lg hover:bg-black/40 transition-colors cursor-pointer group"
                  onClick={() => setSelectedPlayerId(member.user_id || member.id || null)}
                >
                  {/* Bandeira */}
                  <div className="w-6 flex-shrink-0 flex justify-center mr-3">
                    {getCountryFlag(member.country) ? (
                      <img
                        src={getCountryFlag(member.country)!}
                        alt=""
                        className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
                      />
                    ) : (
                      <div className="w-5 h-3.5 bg-white/5 rounded-sm"></div>
                    )}
                  </div>

                  {/* Nome */}
                  <span className="font-semibold flex-grow min-w-0 truncate text-sm">
                    {member.username}
                  </span>

                  {/* Nível */}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${factionColor.accent} bg-black/20 ml-2`}>
                    Lvl {member.level || 1}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card de Opções */}
          <div
            className={`${themeClasses.cardBg} p-6 rounded-xl border ${themeClasses.border} flex-shrink-0`}
          >
            <h2 className={`text-xl font-bold mb-4 ${factionColor.accent}`}>
              OPÇÕES DO CLÃ
            </h2>
            <button
              type="button"
              onClick={() => setConfirmLeave(true)}
              className="w-full px-4 py-2 bg-red-800 rounded hover:bg-red-700 transition-colors font-semibold"
            >
              Sair do Clã
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE PERFIL DO JOGADOR (Identidade Digital) */}
      {selectedPlayerId && (
        <PlayerProfileModal 
          userId={selectedPlayerId} 
          onClose={() => setSelectedPlayerId(null)} 
        />
      )}

      {confirmLeave && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`${themeClasses.cardBg} p-8 rounded-2xl border ${themeClasses.border} shadow-2xl max-w-sm w-full text-center`}
          >
            <h3 className="text-xl font-bold mb-4">Confirmar Saída</h3>

            <p className="text-gray-300 mb-6">
              Tem certeza de que deseja sair do clã &quot;{clan?.name}&quot;?
            </p>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setConfirmLeave(false)}
                className="px-6 py-2 bg-gray-600 rounded hover:bg-gray-500 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleLeaveClan}
                disabled={leaving}
                className="px-6 py-2 bg-red-800 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {leaving ? "Saindo..." : "Sair"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Wrapper de Modal que faz o fetch do player apenas quando necessário.
 * Mantém a ClanPage leve e cumpre a regra de fetch único.
 */
function PlayerProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    async function load() {
      try {
        setLoading(true);
        // Usa o endpoint otimizado via Redis no backend
        const data = await apiClient.getUser(userId);
        if (isMounted && data?.user) {
          setPlayer(data.user);
        }
      } catch (err) {
        console.error("Erro ao carregar perfil no modal:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <p className="font-orbitron text-xs animate-pulse text-orange-500/80">SINCRONIZANDO IDENTIDADE...</p>
          </div>
        ) : player ? (
          <DigitalIdentity player={player} onClose={onClose} />
        ) : (
          <div className="bg-gray-900/90 p-8 rounded-xl border border-red-500/50 text-center backdrop-blur-md">
            <p className="text-red-400 mb-4">Falha ao localizar registro do jogador.</p>
            <button onClick={onClose} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-white/5">Fechar</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}