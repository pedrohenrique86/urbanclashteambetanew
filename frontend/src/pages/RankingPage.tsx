import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Player, Clan } from "../types/ranking";
import { useRankingCache } from "../hooks/useRankingCache";
import { useHUD } from "../contexts/HUDContext";

// Componente para item do ranking de jogadores
const PlayerRankingItem: React.FC<{
  player: Player;
  gradient: string;
  onSelect: (id: string) => void;
}> = ({ player, gradient, onSelect }) => {
  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) {
      return null;
    }
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "text-yellow-400";
      case 2:
        return "text-gray-300";
      case 3:
        return "text-orange-500";
      default:
        return "text-gray-400";
    }
  };

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
      className={`bg-gradient-to-r ${gradient} mb-2 cursor-pointer rounded-lg p-[1px] transition-all hover:shadow-lg active:scale-95`}
      whileHover={{ scale: 1.015 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(player.id)}
    >
      <div className="rounded-lg bg-gray-800/80 p-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center space-x-3">
            <div
              className={`w-8 flex-shrink-0 text-center font-bold ${(player.position ?? 0) <= 3 ? "text-2xl" : "text-sm"
                } ${getPositionColor(player.position ?? 0)}`}
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

            <span className="min-w-0 flex-1 truncate text-sm font-bold text-white group-hover:text-blue-400">
              {player.username}
            </span>
          </div>

          <div className="ml-1 flex-shrink-0 text-right">
            <div className="whitespace-nowrap text-sm font-bold text-white">
              Nível {player.level}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente para item do ranking de clãs
const ClanRankingItem: React.FC<{
  clan: Clan;
  gradient: string;
  onSelect: (id: string) => void;
}> = ({ clan, gradient, onSelect }) => {
  const getClanIcon = (faction: string) => {
    return faction === "gangsters" ? "🔫" : "🛡️";
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "text-yellow-400";
      case 2:
        return "text-gray-300";
      case 3:
        return "text-orange-500";
      default:
        return "text-gray-400";
    }
  };

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
      className={`bg-gradient-to-r ${gradient} mb-2 cursor-pointer rounded-lg p-[1px] transition-all hover:shadow-lg active:scale-95`}
      whileHover={{ scale: 1.015 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(clan.id)}
    >
      <div className="rounded-lg bg-gray-800/80 p-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center space-x-3">
            <div
              className={`w-8 flex-shrink-0 text-center font-bold ${(clan.position ?? 0) <= 3 ? "text-2xl" : "text-sm"
                } ${getPositionColor(clan.position ?? 0)}`}
            >
              {getPositionDisplay(clan.position)}
            </div>

            <span className="text-sm">{getClanIcon(clan.faction)}</span>

            <span className="min-w-0 flex-1 truncate text-sm font-bold text-white group-hover:text-purple-400">
              {clan.name}
            </span>
          </div>

          <div className="ml-1 flex-shrink-0 text-right">
            <div className="whitespace-nowrap text-sm font-bold text-purple-400">
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
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "text-yellow-400";
      case 2:
        return "text-gray-300";
      case 3:
        return "text-orange-500";
      default:
        return "text-gray-500";
    }
  };

  const getPositionDisplay = (position: number) => {
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
    <div className="mb-2 rounded-lg border border-gray-700/50 bg-gray-800/30 p-3 opacity-60">
      <div className="flex min-w-0 items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center space-x-3">
          <div
            className={`w-8 flex-shrink-0 text-center font-bold ${position <= 3 ? "text-2xl" : "text-sm"
              } ${getPositionColor(position)}`}
          >
            {getPositionDisplay(position)}
          </div>

          <span className="flex-shrink-0 text-sm font-bold text-red-500/70">
            ❓
          </span>

          <span className="min-w-0 flex-1 text-sm italic text-gray-500">
            {type === "clan" ? "Aguardando clã..." : "Aguardando jogador..."}
          </span>
        </div>

        <div className="ml-1 flex-shrink-0 text-right">
          <div className="whitespace-nowrap text-sm font-bold text-gray-600">
            ---
          </div>
        </div>
      </div>
    </div>
  );
};

const RankingColumn: React.FC<{
  config: any;
  isLoading: boolean;
  onSelectPlayer: (id: string) => void;
  onSelectClan: (id: string) => void;
}> = ({ config, isLoading, onSelectPlayer, onSelectClan }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className={`rounded-2xl border bg-gray-900/50 p-4 shadow-2xl sm:p-6 ${config.borderColor}`}
  >
    <div className="mb-6 text-center">
      <h2
        className={`bg-gradient-to-r bg-clip-text text-xl font-orbitron font-bold text-transparent sm:text-2xl ${config.gradient}`}
      >
        {config.title}
      </h2>
      <div
        className={`mx-auto mt-2 h-1 w-16 rounded-full bg-gradient-to-r ${config.gradient}`}
      />
    </div>

    <div className="space-y-2">
      {isLoading
        ? Array.from({ length: 26 }, (_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-gray-700/50"
          />
        ))
        : Array.from({ length: 26 }, (_, idx) => {
          const position = idx + 1;
          const item = config.data.find((d: any) => d.position === position);
          const gradient = config.gradient;

          if (item) {
            return config.type === "player" ? (
              <PlayerRankingItem
                key={item.id}
                player={item}
                gradient={gradient}
                onSelect={onSelectPlayer}
              />
            ) : (
              <ClanRankingItem
                key={item.id}
                clan={item}
                gradient={gradient}
                onSelect={onSelectClan}
              />
            );
          }

          return (
            <EmptyRankingItem
              key={`empty-${position}`}
              position={position}
              type={config.type}
            />
          );
        })}
    </div>
  </motion.div>
);

export default function RankingPage() {
  const { openUserPanel, openClanPanel } = useHUD();
  const [selectedRanking, setSelectedRanking] = useState(0);

  useEffect(() => {
    const cacheCleared = localStorage.getItem("ranking_cache_cleared_v1");
    if (!cacheCleared) {
      localStorage.removeItem("ranking_cache");
      localStorage.setItem("ranking_cache_cleared_v1", "true");
    }
  }, []);

  const { data, loading: isLoading, error } = useRankingCache();

  const { gangsters, guardas, clans } = data || {
    gangsters: [],
    guardas: [],
    clans: [],
  };

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
    <div className="relative h-full flex-1">
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <div className="mb-4 hidden justify-center space-x-2 sm:flex">
          {rankingConfigs.map((config, index) => (
            <button
              key={config.title}
              onClick={() => setSelectedRanking(index)}
              className={`rounded-lg px-6 py-2 text-sm font-orbitron transition-all duration-300 ${selectedRanking === index
                  ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                  : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/70"
                }`}
            >
              {config.shortTitle}
            </button>
          ))}
        </div>

        <div className="mb-4 sm:hidden">
          <select
            value={selectedRanking}
            onChange={(e) => setSelectedRanking(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 font-orbitron text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {rankingConfigs.map((config, index) => (
              <option key={config.title} value={index} className="font-sans">
                {config.shortTitle}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-8 text-center text-xs text-gray-400">
          <p>🔄 Atualizado a cada 10 minutos</p>
          {error && <p className="mt-1 text-red-400">⚠️ {error}</p>}
        </div>

        <RankingColumn
          config={currentConfig}
          isLoading={isLoading}
          onSelectPlayer={openUserPanel}
          onSelectClan={openClanPanel}
        />
      </div>
    </div>
  );
}