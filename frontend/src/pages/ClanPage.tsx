import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { useTheme } from "../contexts/ThemeContext";
import { apiClient } from "../lib/supabaseClient";
import { ClanChat } from "../components/clan/ClanChat";

type Player = {
  id?: string;
  user_id?: string;
  username: string;
  display_name?: string;
  level?: number;
  role?: string;
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
  const broadcastRef = useRef<BroadcastChannel | null>(null);

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

      setUserProfile({ ...userProfile, clan_id: undefined });

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`${themeClasses.cardBg} p-6 rounded-xl border ${themeClasses.border}`}>
            <h2 className={`text-xl font-bold mb-4 ${factionColor.accent}`}>
              MEMBROS ({clan?.member_count || 0} / {clan?.max_members || 0})
            </h2>

            <ul className="space-y-3">
              {clan?.members?.map((member, index) => (
                <li
                  key={member.id || member.user_id || `${member.username}-${index}`}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
                >
                  <span className="font-semibold">{member.username}</span>
                  <span className="text-sm text-gray-400">
                    Nível {member.level || 1}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${themeClasses.cardBg} p-6 rounded-xl border ${themeClasses.border}`}>
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

          <ClanChat />
        </div>
      </div>

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