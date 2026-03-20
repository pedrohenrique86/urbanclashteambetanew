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
        return "text-yellow-600"; // Bronze
      case 4:
      case 5:
        return "text-purple-400"; // Roxo
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className={`bg-gradient-to-r ${gradient} p-[1px] rounded-lg`}>
      <div className="bg-gray-800 p-3 rounded-lg">
        <div className="flex items-center space-x-2">
          {/* Posição no ranking */}
          <span
            className={`text-sm font-bold min-w-[30px] ${getPositionColor(clan.position || 0)}`}
          >
            {clan.position}º
          </span>

          {/* Escudo do clã */}
          <span className="text-sm">{getClanShield(clan.faction)}</span>

          {/* Nome do clã */}
          <span className="text-white font-medium flex-grow truncate text-sm">
            {clan.name}
          </span>

          {/* Pontuação */}
          <span className="text-purple-400 font-bold text-sm">
            {clan.score} pts
          </span>
        </div>
      </div>
    </div>
  );
}
