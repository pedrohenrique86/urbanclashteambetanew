import React from "react";
import { Player } from "../types/ranking";
import {
  getPositionTextColor,
  getPositionSizeClass,
  getPositionDisplay,
} from "../utils/rankingUtils";

interface PlayerRankingItemProps {
  player: Player;
  bgColor: string;
}

// Componente para exibir um item do ranking de jogadores
export default function PlayerRankingItem({
  player,
  bgColor,
}: PlayerRankingItemProps) {
  // Função para obter a URL da bandeira do país
  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) {
      return null; // Sem bandeira quando país não definido
    }
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  };

  // Define a cor do nível com base na facção do jogador
  const levelColorClass =
    player.faction === "guardas" ? "text-blue-300" : "text-orange-300";

  return (
    <div
      className={`${bgColor} p-2 sm:p-3 rounded-lg h-full flex items-center`}
    >
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 w-full">
        {/* Posição no ranking (SEM CÍRCULO) */}
        <span
          className={`${getPositionSizeClass(
            player.position,
          )} font-bold min-w-[24px] sm:min-w-[30px] text-center flex-shrink-0 ${getPositionTextColor(
            player.position,
            player.faction,
          )}`}
        >
          {getPositionDisplay(player.position, "player")}
        </span>

        {/* Bandeira do país */}
        {getCountryFlag(player.country) ? (
          <img
            src={getCountryFlag(player.country)!}
            alt={`Bandeira de ${player.country}`}
            className="w-5 h-4 object-cover rounded-sm flex-shrink-0"
          />
        ) : (
          <div className="w-5 h-4 flex-shrink-0"></div> // Espaço reservado
        )}

        {/* Nome do usuário */}
        <span className="text-white font-medium flex-grow min-w-0 text-sm sm:text-base truncate">
          {player.username}
        </span>

        {/* Nível */}
        <div className="flex flex-col items-end flex-shrink-0">
          <span className={`text-sm font-bold ${levelColorClass}`}>
            Lvl {player.level}
          </span>
        </div>
      </div>
    </div>
  );
}
