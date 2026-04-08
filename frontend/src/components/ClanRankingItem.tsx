import React from "react";
import { Clan } from "../types/ranking";
import {
  getPositionTextColor,
  getPositionSizeClass,
  getPositionDisplay,
} from "../utils/rankingUtils";

interface ClanRankingItemProps {
  clan: Clan;
  bgColor: string;
}

// Componente para exibir um item do ranking de clãs
export default function ClanRankingItem({
  clan,
  bgColor,
}: ClanRankingItemProps) {
  // Ícone baseado na facção do clã
  const getClanShield = (faction: string) => {
    return faction === "gangsters" ? "🔫" : "🛡️";
  };

  return (
    <div
      className={`${bgColor} p-2 sm:p-3 rounded-lg h-full flex items-center`}
    >
      <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 w-full">
        {/* Posição no ranking (SEM CÍRCULO) */}
        <span
          className={`${getPositionSizeClass(
            clan.position,
          )} font-bold min-w-[24px] sm:min-w-[30px] text-center flex-shrink-0 ${getPositionTextColor(
            clan.position,
            "clans",
          )}`}
        >
          {getPositionDisplay(clan.position, "clan")}
        </span>

        {/* Escudo do clã */}
        <span className="text-sm flex-shrink-0">
          {getClanShield(clan.faction)}
        </span>

        {/* Nome do clã */}
        <span className="text-white font-medium flex-grow truncate text-sm sm:text-base">
          {clan.name}
        </span>

        {/* Pontuação */}
        <span className="text-purple-300 font-bold text-sm sm:text-base flex-shrink-0">
          {clan.score} pts
        </span>
      </div>
    </div>
  );
}
