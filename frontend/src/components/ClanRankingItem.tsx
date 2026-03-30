import React from "react";
import { Clan } from "../types/ranking";

interface ClanRankingItemProps {
  clan: Clan;
  gradient: string;
}

// Componente para exibir um item do ranking de clãs
export default function ClanRankingItem({
  clan,
  gradient,
}: ClanRankingItemProps) {
  // Ícone baseado na facção do clã
  const getClanShield = (faction: string) => {
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
      case 4:
      case 5:
        return "text-purple-400"; // Roxo
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
        return `${position}º`;
    }
  };

  return (
    <div className={`bg-gradient-to-r ${gradient} p-[1px] rounded-lg`}>
      <div className="bg-gray-800 p-2 sm:p-3 rounded-lg">
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
          {/* Posição no ranking */}
          <span
            className={`text-lg sm:text-xl font-bold min-w-[24px] sm:min-w-[30px] text-center flex-shrink-0 ${getPositionColor(
              clan.position || 0,
            )}`}
          >
            {getPositionDisplay(clan.position)}
          </span>

          {/* Escudo do clã */}
          <span className="text-sm flex-shrink-0">
            {getClanShield(clan.faction)}
          </span>

          {/* Nome do clã */}
          <span className="text-white font-medium flex-grow truncate text-xs sm:text-sm">
            {clan.name}
          </span>

          {/* Pontuação */}
          <span className="text-purple-400 font-bold text-xs sm:text-sm flex-shrink-0">
            {clan.score} pts
          </span>
        </div>
      </div>
    </div>
  );
}