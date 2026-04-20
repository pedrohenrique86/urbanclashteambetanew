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

export default function ClanRankingItem({
  clan,
  bgColor,
}: ClanRankingItemProps) {
  const isRenegado = clan.faction === "gangsters";
  
  return (
    <div className={`${bgColor} relative border-l-2 border-purple-500/40 px-2 py-2 h-full flex items-center transition-all duration-300 backdrop-blur-sm group overflow-hidden`}>
      {/* Background Decorative Element */}
      <div className="absolute left-0 top-0 w-full h-full bg-purple-500/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 pointer-events-none" />

      <div className="flex items-center gap-2 min-w-0 w-full relative z-10">
        {/* Position */}
        <div className="flex flex-col items-center justify-center min-w-[24px] sm:min-w-[32px]">
          <span className={`${getPositionSizeClass(clan.position)} font-orbitron font-black text-xs sm:text-sm ${getPositionTextColor(clan.position, "clans")}`}>
            {getPositionDisplay(clan.position, "clan")}
          </span>
        </div>

        {/* Clan Identity */}
        <div className="flex-shrink-0 w-7 h-7 sm:w-10 sm:h-10 border border-white/5 bg-zinc-900 flex items-center justify-center relative overflow-hidden">
           <span className="text-sm sm:text-lg relative z-10">{isRenegado ? "🔫" : "🛡️"}</span>
           <div className="absolute inset-x-0 bottom-0 h-0.5 sm:h-1 bg-purple-600 opacity-50" />
        </div>

        {/* Clan Details */}
        <div className="flex flex-col flex-grow min-w-0">
          <span className="text-white font-black font-orbitron text-xs sm:text-sm uppercase whitespace-nowrap group-hover:text-purple-400 transition-colors tracking-tight">
            {clan.name || "UNNAMED_DIV"}
          </span>
          <div className="flex items-center gap-1.5">
             <div className="h-px w-4 bg-purple-500/30" />
             <span className="text-[8px] sm:text-[9px] font-mono text-gray-500 uppercase tracking-tighter">DIV_UNIT</span>
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-end flex-shrink-0 pl-4 border-l border-white/5">
          <span className="text-purple-300 font-black font-orbitron text-xs sm:text-lg tracking-tighter leading-none">
            {clan.score}
          </span>
          <span className="text-[8px] font-mono text-purple-500 font-bold uppercase tracking-widest mt-0.5">PTS</span>
        </div>
      </div>
    </div>
  );
}
