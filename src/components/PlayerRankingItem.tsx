import React from 'react';
import { Player } from '../types/ranking';

interface PlayerRankingItemProps {
  player: Player;
  gradient: string;
}

// Componente para exibir um item do ranking de jogadores
export default function PlayerRankingItem({ player, gradient }: PlayerRankingItemProps) {
  // Função para obter a URL da bandeira do país
  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) {
      return null; // Sem bandeira quando país não definido
    }
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  };



  return (
    <div className={`bg-gradient-to-r ${gradient} p-[1px] rounded-lg`}>
      <div className="bg-gray-800 p-2 sm:p-3 rounded-lg">
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
          {/* Posição no ranking */}
          <span
            className={`text-xs sm:text-sm font-bold min-w-[16px] sm:min-w-[20px] flex-shrink-0 ${player.position && player.position <= 3 ? 'text-yellow-400' : 'text-gray-300'}`}
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
          <span className="text-green-400 font-bold flex-shrink-0 text-xs sm:text-sm whitespace-nowrap">
            Nv.{player.level}
          </span>
        </div>
      </div>
    </div>
  );
}