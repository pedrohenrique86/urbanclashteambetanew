import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserProfile, invalidateUserProfile } from "../hooks/useUserProfile";
import { redirectToDashboardWithCleanup } from "../utils/cacheUtils";
import { apiClient } from "../lib/supabaseClient";
import { LoadingSpinner } from "../components/ui/LoadingSpinner"; // Importa o LoadingSpinner

interface Clan {
  id: string;
  name: string;
  description: string;
  faction: string;
  member_count: number;
  max_members: number;
  is_recruiting: boolean;
}

export default function ClanSelectionPage() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [selectedClan, setSelectedClan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioningToDashboard, setIsTransitioningToDashboard] =
    useState(false); // Novo estado para a transição
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, loading: profileLoading } = useUserProfile(true);

  // A facção vem do perfil do usuário, não mais do location.state
  const selectedFaction = userProfile?.faction;

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Impede a navegação padrão de "voltar"
      event.preventDefault();
      // Invalida o perfil para forçar o fluxo de login na próxima visita
      invalidateUserProfile();
      // Redireciona para a página inicial
      navigate("/", { replace: true });
    };

    window.addEventListener("popstate", handlePopState);

    // Limpa o listener quando o componente é desmontado
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);

  useEffect(() => {
    // Aguarda o perfil do usuário e a facção estarem disponíveis
    if (profileLoading || !selectedFaction) {
      return;
    }

    const fetchClans = async () => {
      try {
        // Usando apiClient para garantir a URL correta (produção/local)
        const data = await apiClient.getClansByFaction(selectedFaction);
        setClans(data.clans || []);
      } catch (error) {
        setError("Erro ao carregar clãs. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchClans();
  }, [selectedFaction, profileLoading]);

  const handleJoinClan = async () => {
    if (!selectedClan) return;

    setJoining(true);
    setProcessing(true);
    setError("");

    try {
      // Adiciona um delay de 5 segundos para manter o botão em estado de processamento
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Usando apiClient que já injeta o token e usa a URL correta
      await apiClient.joinClan(selectedClan);

      // Define um indicador no sessionStorage para o Dashboard saber que é o primeiro carregamento
      sessionStorage.setItem("justJoinedClan", "true");

      // Invalidar cache do hook
      invalidateUserProfile();

      setIsTransitioningToDashboard(true); // Ativa o estado de transição
      // Navega para o dashboard de forma suave (client-side), eliminando o reload.
      navigate("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Erro ao entrar no clã",
      );
      // Reseta o estado apenas em caso de erro para o usuário poder tentar novamente
      setJoining(false);
      setProcessing(false);
    }
  };

  const getFactionDisplayName = (faction: string) => {
    return faction === "gangsters" ? "Gangsters" : "Guardas";
  };

  const getFactionColor = (faction: string) => {
    return faction === "gangsters"
      ? "from-orange-500 to-orange-700"
      : "from-blue-500 to-blue-700";
  };

  const getFactionAccentColor = (faction: string) => {
    return faction === "gangsters" ? "orange-500" : "blue-500";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-exo">
      {/* Background Effects */}
      <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-700/20 via-transparent to-transparent"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <div className="relative z-10 container mx-auto px-4 py-6">
          {/* Compact Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-2">
              ESCOLHA SEU CLÃ
            </h1>
            <div className="flex items-center justify-center gap-2">
              <div
                className={`w-3 h-3 rounded-full bg-gradient-to-r ${getFactionColor(
                  selectedFaction || "",
                )}`}
              ></div>
              <span className="text-gray-300 font-medium">
                {getFactionDisplayName(selectedFaction || "")}
              </span>
            </div>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-4 text-center backdrop-blur-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Ultra Compact Grid Layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 mb-4 max-h-[60vh] overflow-hidden">
            {clans.map((clan, index) => {
              const isSelected = selectedClan === clan.id;
              const isFull = clan.member_count >= clan.max_members;
              // Verificar bloqueio de 24h para este usuário neste clã
              let isBannedForUser = false;
              try {
                const banKey = `clan_banlist:${clan.id}`;
                const banObj = JSON.parse(localStorage.getItem(banKey) || "{}");
                const uid = String(
                  userProfile?.user_id || userProfile?.id || "",
                );
                const exp = banObj?.[uid];
                isBannedForUser = !!exp && new Date(exp).getTime() > Date.now();
              } catch (e) {
                // Ignore ban check error
              }
              const canJoin = clan.is_recruiting && !isFull && !isBannedForUser;
              const memberPercentage =
                (clan.member_count / clan.max_members) * 100;

              return (
                <motion.div
                  key={clan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{
                    scale: canJoin ? 1.02 : 1,
                    y: canJoin ? -2 : 0,
                  }}
                  className={`
                  relative group cursor-pointer transition-all duration-300
                  ${
                    isSelected
                      ? `bg-gradient-to-br ${getFactionColor(
                          selectedFaction || "",
                        )} shadow-2xl shadow-blue-500/25`
                      : canJoin
                        ? "bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/50 hover:border-gray-500/70"
                        : "bg-gray-900/60 border border-gray-700/30 opacity-60 cursor-not-allowed"
                  }
                  rounded-xl backdrop-blur-sm overflow-hidden
                `}
                  onClick={() => canJoin && setSelectedClan(clan.id)}
                >
                  {/* Status Badges */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {isFull && (
                      <div className="bg-red-500/90 text-white text-xs px-2 py-1 rounded-md font-bold">
                        LOTADO
                      </div>
                    )}
                    {isBannedForUser && (
                      <div className="bg-yellow-400/90 text-black text-xs px-2 py-1 rounded-md font-bold">
                        BLOQUEADO 24H
                      </div>
                    )}
                    {!clan.is_recruiting && (
                      <div className="bg-yellow-500/90 text-black text-xs px-2 py-1 rounded-md font-bold">
                        FECHADO
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    {/* Clan Name */}
                    <h3 className="text-sm font-bold text-white mb-1 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all">
                      {clan.name}
                    </h3>

                    {/* Description - Ultra Compact */}
                    <p className="text-gray-300 text-xs mb-2 line-clamp-1 leading-tight">
                      {clan.description}
                    </p>

                    {/* Members Info - Ultra Compact */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Membros</span>
                      <span
                        className={`text-xs font-bold ${
                          memberPercentage >= 100
                            ? "text-red-400"
                            : memberPercentage >= 80
                              ? "text-yellow-400"
                              : "text-green-400"
                        }`}
                      >
                        {clan.member_count}/{clan.max_members}
                      </span>
                    </div>

                    {/* Progress Bar - Ultra Compact */}
                    <div className="w-full bg-gray-700/50 rounded-full h-1 overflow-hidden mb-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${memberPercentage}%` }}
                        transition={{
                          delay: index * 0.05 + 0.2,
                          duration: 0.6,
                        }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          memberPercentage >= 100
                            ? "bg-gradient-to-r from-red-500 to-red-600"
                            : memberPercentage >= 80
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                              : `bg-gradient-to-r from-${getFactionAccentColor(
                                  selectedFaction || "",
                                )} to-${getFactionAccentColor(selectedFaction || "")}`
                        }`}
                      />
                    </div>

                    {/* Recruitment Status - Ultra Compact */}
                    <div className="flex justify-center">
                      {canJoin ? (
                        <div className="text-xs text-green-400 font-medium flex items-center gap-1">
                          <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                          Aberto
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 font-medium">
                          {isFull ? "Lotado" : "Fechado"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover Effect */}
                  {canJoin && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {clans.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-gray-400 text-lg mb-2">🏴‍☠️</div>
              <p className="text-gray-400">
                Nenhum clã disponível para esta facção.
              </p>
            </motion.div>
          )}

          {/* Compact Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-3"
          >
            <motion.button
              whileHover={{ scale: selectedClan && !joining ? 1.02 : 1 }}
              whileTap={{ scale: selectedClan && !joining ? 0.98 : 1 }}
              onClick={handleJoinClan}
              disabled={!selectedClan || joining || processing}
              className={`
              px-8 py-2.5 rounded-xl font-bold transition-all duration-300 backdrop-blur-sm
              ${
                selectedClan // Se um clã estiver selecionado
                  ? `bg-gradient-to-r ${getFactionColor(selectedFaction || "")} text-white shadow-lg border border-white/20` // Aplica fundo/texto ativo
                  : "bg-gray-700/50 text-gray-500 border border-gray-600/30" // Senão, aplica fundo/texto desabilitado
              }
              ${
                !selectedClan || joining || processing // Se desabilitado (sem seleção, ou entrando/processando)
                  ? "cursor-not-allowed" // Adiciona cursor desabilitado
                  : "hover:shadow-xl" // Senão, adiciona sombra no hover
              }
            `}
            >
              {processing || joining ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  PROCESSANDO...
                </div>
              ) : (
                "ENTRAR NO CLÃ!"
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
