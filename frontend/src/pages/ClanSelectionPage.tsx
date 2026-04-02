import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from "../hooks/useUserProfile";
import { apiClient } from "../lib/supabaseClient";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useTheme } from "../contexts/ThemeContext";

interface Clan {
  id: string;
  name: string;
  faction: "gangsters" | "guardas";
  score: number;
  member_count: number;
  max_members: number;
  available_slots: number;
  description: string;
}

export default function ClanSelectionPage() {
  const navigate = useNavigate();
  const { themeClasses } = useTheme();
  const { userProfile, loading: profileLoading } = useUserProfile();
  
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!profileLoading) {
      if (!userProfile?.faction) {
        // Se ainda não escolheu facção, volta um passo.
        navigate("/faction-selection");
        return;
      }
      if (userProfile?.clan_id) {
        // Se já tem clã, vai pro dashboard direto.
        navigate("/dashboard");
        return;
      }
      fetchClans();
    }
  }, [profileLoading, userProfile, navigate]);

  const fetchClans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getClans();
      
      if (!data) {
        setError("Nenhum clã encontrado.");
        return;
      }

      // Filtra apenas os clãs da facção escolhida pelo jogador
      const factionClans = data.filter((c: Clan) => c.faction === userProfile?.faction);
      setClans(factionClans);
    } catch (err: any) {
      console.error("Erro ao buscar clãs:", err);
      setError("Falha ao carregar os clãs disponíveis.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClan = async (clanId: string) => {
    try {
      setJoining(true);
      setError(null);
      // Supõe-se que exista apiClient.joinClan no seu SDK
      await apiClient.joinClan(clanId);
      console.log("✅ Entrou no clã com sucesso!");
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Erro ao entrar no clã", err);
      setError(err.message || "Erro ao tentar entrar no clã.");
    } finally {
      setJoining(false);
    }
  };

  if (profileLoading || loading || joining) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} flex flex-col items-center justify-center p-4`}>
        <LoadingSpinner />
        <p className="text-white mt-4 font-orbitron animate-pulse">
          {joining ? "Juntando-se ao Clã..." : "Carregando Facções..."}
        </p>
      </div>
    );
  }

  const isGangster = userProfile?.faction === "gangsters";
  const accentColor = isGangster ? "text-orange-500" : "text-blue-500";
  const borderColor = isGangster ? "border-orange-500" : "border-blue-500";
  const buttonBg = isGangster ? "bg-orange-600 hover:bg-orange-500" : "bg-blue-600 hover:bg-blue-500";

  return (
    <div className={`min-h-screen ${themeClasses.bg} flex flex-col items-center p-4 md:p-8 font-exo`}>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 max-w-2xl mt-10"
      >
        <h1 className="text-3xl md:text-5xl font-orbitron font-extrabold text-white mb-4">
          ESCOLHA SEU <span className={accentColor}>CLÃ</span>
        </h1>
        <p className="text-gray-400 text-sm md:text-base">
          Como recém-chegado na facção dos <strong className={accentColor}>{isGangster ? 'Gangsters' : 'Guardas'}</strong>, 
          você precisa se unir a um esquadrão local. Selecione um clã abaixo para iniciar seu domínio.
        </p>
      </motion.div>

      {error ? (
        <div className="bg-red-900/30 border border-red-500 text-red-400 px-6 py-4 rounded-lg text-center max-w-lg">
          <p>{error}</p>
          <button onClick={fetchClans} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 font-bold">
            Tentar Novamente
          </button>
        </div>
      ) : clans.length === 0 ? (
        <div className={`${themeClasses.cardBg} border shadow-lg p-8 rounded-xl text-center max-w-md w-full`}>
          <p className="text-gray-400 text-lg mb-6">Não há clãs disponíveis para sua facção no momento.</p>
          <button onClick={fetchClans} className={`w-full py-3 rounded text-white font-bold transition-colors ${buttonBg}`}>
            Atualizar Lista
          </button>
        </div>
      ) : (
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {clans.map((clan, index) => (
              <motion.div
                key={clan.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className={`${themeClasses.cardBg} rounded-xl p-6 border transition-all ${borderColor} shadow-lg flex flex-col`}
                style={{ boxShadow: isGangster ? "0 4px 20px -5px rgba(249,115,22,0.3)" : "0 4px 20px -5px rgba(59,130,246,0.3)" }}
              >
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-white truncate">{clan.name}</h2>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2 h-10">
                    {clan.description || "Nenhuma descrição informada pelo líder do clã."}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-6 flex-1">
                  <div className="bg-black/30 rounded p-2 text-center">
                    <span className="block text-gray-400 text-xs uppercase tracking-wider">Membros</span>
                    <span className="font-bold text-white text-lg">{clan.member_count}</span>
                  </div>
                  <div className="bg-black/30 rounded p-2 text-center">
                    <span className="block text-gray-400 text-xs uppercase tracking-wider">Vagas</span>
                    <span className={`font-bold text-lg ${clan.available_slots > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {clan.available_slots || 0}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinClan(clan.id)}
                  disabled={clan.available_slots <= 0}
                  className={`w-full py-3 rounded-lg font-bold text-white transition-all uppercase tracking-widest ${
                    clan.available_slots > 0 
                      ? `${buttonBg} hover:scale-[1.02] shadow-lg`
                      : "bg-gray-700 cursor-not-allowed text-gray-400"
                  }`}
                >
                  {clan.available_slots > 0 ? "Alistar-se" : "Clã Cheio"}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
