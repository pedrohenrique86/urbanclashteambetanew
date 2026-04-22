import React from "react";
import { Clan } from "../types/ranking";
import { Crosshair, ShieldAlert } from "lucide-react";
import {
  getPositionTextColor,
  getPositionSizeClass,
  getPositionDisplay,
} from "../utils/rankingUtils";

interface ClanRankingItemProps {
  clan: Clan;
  bgColor: string;
}

export default React.memo(function ClanRankingItem({
  clan,
  bgColor,
}: ClanRankingItemProps) {
  const factionName = clan.faction?.toLowerCase() || "";
  const isRenegado = factionName.includes("gangster") || factionName.includes("renegado");
  const FactionIcon = isRenegado ? Crosshair : ShieldAlert;
  const accentColor = isRenegado ? "text-orange-500" : "text-blue-400";
  const glowColor = isRenegado ? "shadow-orange-500/20" : "shadow-blue-500/20";
  
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

        {/* Cyberpunk Clan Identity */}
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 border ${isRenegado ? 'border-orange-500/30' : 'border-blue-500/30'} flex items-center justify-center relative bg-black/80 overflow-hidden ${glowColor} shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] sm:rounded-bl-[8px] sm:rounded-tr-[8px]`}>
              {/* Scanline Effect behind icon */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_2px] pointer-events-none opacity-20" />
              
              <FactionIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${accentColor} drop-shadow-[0_0_5px_currentColor] z-10 animate-pulse-slow`} />
              
              {/* Bottom Rank Indicator (Cyber) */}
              <div className={`absolute bottom-0 left-0 w-full h-[1px] ${isRenegado ? 'bg-orange-500' : 'bg-blue-400'} opacity-50 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_currentColor]`} />
          </div>
        </div>

        {/* Clan Details */}
        <div className="flex flex-col flex-grow min-w-0">
          <span className={`${accentColor} font-black font-orbitron text-[10px] sm:text-xs uppercase whitespace-nowrap group-hover:text-purple-400 transition-colors tracking-tighter`}>
            {clan.name || "UNNAMED_DIV"}
          </span>
          <div className="flex items-center gap-1.5">
             <div className="h-px w-3 bg-purple-500/30" />
             <span className="text-[7px] sm:text-[8px] font-mono text-gray-500 uppercase tracking-tighter">DIVISAO_UNIT</span>
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-end flex-shrink-0 pl-2 sm:pl-4 border-l border-white/5">
          <span className="text-purple-300 font-black font-orbitron text-xs sm:text-base tracking-tighter leading-none">
            {clan.score}
          </span>
          <span className="text-[7px] font-mono text-purple-500 font-bold uppercase tracking-widest mt-0.5">PTS</span>
        </div>
      </div>
    </div>
  );
});
