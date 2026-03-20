import React from "react";
import { Player } from "../types/ranking";

interface PlayerRankingItemProps {
  player: Player;
  gradient: string;
}

// Componente para exibir um item do ranking de jogadores
export default function PlayerRankingItem({
  player,
  gradient,
}: PlayerRankingItemProps) {
  // Função para obter a URL da bandeira do país
  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) {
      return null; // Sem bandeira quando país não definido
    }
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  };

  // Define as classes de cor para o top 5, dependendo da facção
  const getPositionColor = (position?: number, faction?: string) => {
    if (!position) return "text-gray-400";
    switch (position) {
      case 1:
        return "text-yellow-400"; // Ouro
      case 2:
        return "text-gray-300"; // Prata
      case 3:
        return "text-yellow-600"; // Bronze
      case 4:
      case 5:
        if (faction === "guardas") return "text-blue-400";
        if (faction === "gangsters") return "text-orange-400";
        return "text-gray-400"; // Fallback
      default:
        return "text-gray-400";
    }
  };

  // Define a cor do nível com base na facção do jogador
  const levelColorClass =
    player.faction === "guardas" ? "text-blue-400" : "text-orange-400";

  return (
    <div className={`bg-gradient-to-r ${gradient} p-[1px] rounded-lg`}>
      <div className="bg-gray-800 p-2 sm:p-3 rounded-lg">
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
          {/* Posição no ranking */}
          <span
            className={`text-xs sm:text-sm font-bold min-w-[16px] sm:min-w-[20px] flex-shrink-0 ${getPositionColor(
              player.position,
              player.faction,
            )}`}
          >
            {player.position}º
          </span>

          {/* Bandeira do país */}
          {getCountryFlag(player.country) && (
            <img
              src={getCountryFlag(player.country)!}
              alt={`Bandeira de ${player.country}`}
              className="w-4 h-3 sm:w-5 sm:h-3 object-cover rounded-sm flex-shrink-0"
            />
          )}

          {/* Nome do usuário */}
          <span className="text-white font-medium flex-grow min-w-0 text-xs sm:text-sm">
            {player.username}
          </span>

          {/* Nível atual */}
          <span
            className={`${levelColorClass} font-bold flex-shrink-0 text-xs sm:text-sm whitespace-nowrap`}
          >
            Nv.{player.level}
          </span>
        </div>
      </div>
    </div>
  );
}
