import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Player, Clan } from "../types/ranking";
import { useRankingCache } from "../hooks/useRankingCache";

// Componente para item do ranking de jogadores
const PlayerRankingItem: React.FC<{ player: Player; gradient: string }> = ({
  player,
  gradient,
}) => {
  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) {
      return null; // Sem bandeira quando país não definido
    }
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  };

  // Função para obter a cor da posição
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "text-yellow-400"; // Ouro
      case 2:
        return "text-gray-300"; // Prata
      case 3:
        return "text-orange-500"; // Bronze
      default:
        return "text-gray-400";
    }
  };

  // Função para exibir troféu ou número
  const getPositionDisplay = (position?: number) => {
    if (!position) return "—";
    switch (position) {
      case 1:
        return "🏆";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return position;
    }
  };

  return (
    <motion.div
      className={`bg-gradient-to-r ${gradient} p-[1px] rounded-lg mb-2`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-3">
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div
              className={`w-8 text-center ${
                (player.position ?? 0) <= 3 ? "text-2xl" : "text-sm"
              } font-bold flex-shrink-0 ${getPositionColor(
                player.position ?? 0,
              )}`}
            >
              {getPositionDisplay(player.position)}
            </div>
            <span className="text-sm flex-shrink-0">
              {getCountryFlag(player.country) ? (
                <img
                  src={getCountryFlag(player.country)!}
                  alt={player.country}
                  title={player.country}
                />
              ) : (
                "🏳️"
              )}
            </span>
            <span className="text-white font-bold text-sm min-w-0 flex-1 truncate">
              {player.username}
            </span>
          </div>
          <div className="text-right flex-shrink-0 ml-1">
            <div className="text-sm font-bold text-white whitespace-nowrap">
              Nível {player.level}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente para item do ranking de clãs
const ClanRankingItem: React.FC<{ clan: Clan; gradient: string }> = ({
  clan,
  gradient,
}) => {
  // Ícone baseado na facção do clã
  const getClanIcon = (faction: string) => {
    return faction === "gangsters" ? "🔫" : "🛡️";
  };

  // Função para obter a cor da posição
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "text-yellow-400"; // Ouro
      case 2:
        return "text-gray-300"; // Prata
      case 3:
        return "text-orange-500"; // Bronze
      default:
        return "text-gray-400";
    }
  };

  // Função para exibir troféu ou número
  const getPositionDisplay = (position?: number) => {
    if (!position) return "—";
    switch (position) {
      case 1:
        return "🏆";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return position;
    }
  };

  return (
    <motion.div
      className={`bg-gradient-to-r ${gradient} p-[1px] rounded-lg mb-2`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-3">
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div
              className={`w-8 text-center ${
                (clan.position ?? 0) <= 3 ? "text-2xl" : "text-sm"
              } font-bold flex-shrink-0 ${getPositionColor(
                clan.position ?? 0,
              )}`}
            >
              {getPositionDisplay(clan.position)}
            </div>
            <span className="text-sm">{getClanIcon(clan.faction)}</span>
            <span className="text-white font-bold text-sm min-w-0 flex-1 truncate">
              {clan.name}
            </span>
          </div>
          <div className="text-right flex-shrink-0 ml-1">
            <div className="text-sm font-bold text-purple-400 whitespace-nowrap">
              {clan.score} pts
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente para placeholder de posição vazia
const EmptyRankingItem: React.FC<{
  position: number;
  type: "player" | "clan";
}> = ({ position, type }) => {
  // Função para obter a cor da posição
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-500/50 text-yellow-200"; // Ouro com opacidade
      case 2:
        return "bg-gray-300/50 text-gray-200"; // Prata com opacidade
      case 3:
        return "bg-orange-600/50 text-orange-200"; // Bronze com opacidade
      default:
        return "bg-gray-700 text-gray-400";
    }
  };

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 mb-2 opacity-50">
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getPositionColor(position)}`}
          >
            {position}
          </div>
          <span className="text-sm flex-shrink-0">❓</span>
          <span className="text-gray-500 italic text-sm min-w-0 flex-1">
            {type === "clan" ? "Aguardando clã..." : "Aguardando jogador..."}
          </span>
        </div>
        <div className="text-right flex-shrink-0 ml-1">
          <div className="text-sm font-bold text-gray-600 whitespace-nowrap">
            ---
          </div>
        </div>
      </div>
    </div>
  );
};

export default function RankingPage() {
  const [selectedRanking, setSelectedRanking] = useState(0);

  // Limpa o cache antigo do localStorage apenas uma vez
  useEffect(() => {
    const cacheCleared = localStorage.getItem("ranking_cache_cleared_v1");
    if (!cacheCleared) {
      localStorage.removeItem("ranking_cache");
      localStorage.setItem("ranking_cache_cleared_v1", "true");
    }
  }, []);

  // Usar o hook de cache para gerenciar os rankings (com rankings completos)
  const { data, loading: isLoading, error } = useRankingCache(true);

  // Extrair dados do cache, com fallback para objeto vazio
  const { gangsters, guardas, clans } = data || { gangsters: [], guardas: [], clans: [] };

  const rankingConfigs = [
    {
      title: "🔫 TOP 26 GANGSTERS",
      shortTitle: "GANGSTERS",
      gradient: "from-orange-600 to-red-500",
      borderColor: "border-orange-500/30",
      data: gangsters,
      type: "player" as const,
    },
    {
      title: "🛡️ TOP 26 GUARDAS",
      shortTitle: "GUARDAS",
      gradient: "from-blue-600 to-cyan-500",
      borderColor: "border-blue-500/30",
      data: guardas,
      type: "player" as const,
    },
    {
      title: "👥 TOP 26 CLÃS",
      shortTitle: "CLÃS",
      gradient: "from-purple-600 to-pink-500",
      borderColor: "border-purple-500/30",
      data: clans,
      type: "clan" as const,
    },
  ];

  const currentConfig = rankingConfigs[selectedRanking];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-8">
      {/* Seletores de Ranking - Desktop */}
      <div className="hidden sm:flex justify-center mb-4 space-x-2">
        {rankingConfigs.map((config, index) => (
          <button
            key={config.title}
            onClick={() => setSelectedRanking(index)}
            className={`px-6 py-2 text-sm font-orbitron rounded-lg transition-all duration-300 ${
              selectedRanking === index
                ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/70"
            }`}
          >
            {config.shortTitle}
          </button>
        ))}
      </div>

      {/* Seletor de Ranking - Mobile */}
      <div className="sm:hidden mb-4">
        <select
          value={selectedRanking}
          onChange={(e) => setSelectedRanking(Number(e.target.value))}
          className="w-full px-4 py-3 text-white bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-orbitron"
        >
          {rankingConfigs.map((config, index) => (
            <option key={config.title} value={index} className="font-sans">
              {config.shortTitle}
            </option>
          ))}
        </select>
      </div>

      {/* Informação de atualização e erro */}
      <div className="text-center mb-8 text-xs text-gray-400">
        <p>🔄 Atualizado a cada 10 minutos</p>
        {error && <p className="text-red-400 mt-1">⚠️ {error}</p>}
      </div>

      {/* Coluna de Ranking */}
      <RankingColumn config={currentConfig} isLoading={isLoading} />
    </div>
  );
}

// Componente auxiliar para a coluna de ranking
const RankingColumn: React.FC<{
  config: any;
  isLoading: boolean;
}> = ({ config, isLoading }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className={`bg-gray-900/50 p-4 sm:p-6 rounded-2xl border ${config.borderColor} shadow-2xl`}
  >
    {/* Título da seção */}
    <div className="text-center mb-6">
      <h2
        className={`text-xl sm:text-2xl font-orbitron font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}
      >
        {config.title}
      </h2>
      <div
        className={`w-16 h-1 bg-gradient-to-r ${config.gradient} mx-auto mt-2 rounded-full`}
      ></div>
    </div>

    {/* Lista do ranking */}
    <div className="space-y-2">
      {isLoading
        ? // Placeholders de carregamento
          Array.from({ length: 26 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse h-14 bg-gray-700/50 rounded-lg"
            ></div>
          ))
        : // Renderizar sempre 26 posições
          Array.from({ length: 26 }, (_, idx) => {
            const position = idx + 1;
            const item = config.data.find((d: any) => d.position === position);
            const gradient = config.gradient;

            if (item) {
              return config.type === "player" ? (
                <PlayerRankingItem
                  key={item.id}
                  player={item}
                  gradient={gradient}
                />
              ) : (
                <ClanRankingItem
                  key={item.id}
                  clan={item}
                  gradient={gradient}
                />
              );
            } else {
              return (
                <EmptyRankingItem
                  key={`empty-${position}`}
                  position={position}
                  type={config.type}
                />
              );
            }
          })}
    </div>
  </motion.div>
);