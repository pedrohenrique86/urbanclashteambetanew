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

export default function PlayerRankingItem({
  player,
  bgColor,
}: PlayerRankingItemProps) {
  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return null;
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  };

  const isGuard = player.faction === "guardas";
  const accentColor = isGuard ? "text-blue-500" : "text-orange-500";
  const barColor = isGuard ? "bg-blue-500/30" : "bg-orange-500/30";

  return (
    <div className={`${bgColor} relative border-l-2 ${isGuard ? 'border-blue-500/40' : 'border-orange-500/40'} px-2 py-2 h-full flex items-center transition-all duration-300 backdrop-blur-sm overflow-hidden group`}>
      {/* Background Decorative Element */}
      <div className={`absolute left-0 top-0 w-full h-full ${barColor} -translate-x-full group-hover:translate-x-0 transition-transform duration-500 pointer-events-none`} />

      <div className="flex items-center gap-2 min-w-0 w-full relative z-10">
        {/* Position */}
        <div className="flex flex-col items-center justify-center min-w-[24px] sm:min-w-[32px]">
          <span className={`${getPositionSizeClass(player.position)} font-orbitron font-black text-xs sm:text-sm ${getPositionTextColor(player.position, player.faction)}`}>
            {getPositionDisplay(player.position, "player")}
          </span>
        </div>

        {/* User Info */}
        <div className="flex flex-col flex-grow min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {getCountryFlag(player.country) && (
              <img
                src={getCountryFlag(player.country)!}
                alt="Country"
                className="w-3 h-2 sm:w-4 sm:h-3 object-cover opacity-70 flex-shrink-0"
              />
            )}
            <span className="text-white font-bold font-orbitron text-xs sm:text-sm uppercase whitespace-nowrap group-hover:text-white transition-colors tracking-tight">
              {player.username}
            </span>
          </div>
          <span className="text-[8px] sm:text-[9px] font-mono text-gray-600 uppercase tracking-tighter">SEC_ID_{player.id.substring(0,4)}</span>
        </div>

        {/* Level */}
        <div className="flex flex-col items-end flex-shrink-0 pl-2">
           <span className={`text-[10px] sm:text-xs font-black font-orbitron ${accentColor}`}>
             NVL_{player.level}
           </span>
           <div className="flex gap-[1px] mt-0.5">
             {Array.from({ length: 5 }).map((_, i) => (
               <div key={i} className={`w-1 h-3/4 sm:w-1 sm:h-1 ${i < Math.min(player.level / 10, 5) ? (isGuard ? 'bg-blue-500' : 'bg-orange-500') : 'bg-white/10'}`} />
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
