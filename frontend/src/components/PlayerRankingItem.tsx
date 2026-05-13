import React from "react";
import { Player } from "../types/ranking";
import { Crosshair, Shield } from "lucide-react";
import {
  getPositionTextColor,
  getPositionSizeClass,
  getPositionDisplay,
} from "../utils/rankingUtils";

interface PlayerRankingItemProps {
  player: Player;
  bgColor: string;
  forceFaction?: string;
}

import { Star, Award, Crown } from "lucide-react";
import { getFactionRank, getRankIcon } from "../utils/leveling";

const MiniRankBadge = ({ level, isGuard }: { level: number, isGuard: boolean }) => {
  const iconData = getRankIcon(level);
  const colorClass = isGuard ? "text-blue-400" : "text-orange-500";
  
  if (iconData.type === 'stars') {
    const count = iconData.count || 0;
    return (
      <div className="flex gap-0.5 items-center mr-1">
        {Array.from({ length: count }).map((_, i) => (
          <Star key={i} className={`w-2 h-2 fill-current ${colorClass}`} />
        ))}
      </div>
    );
  }

  if (iconData.id === 'elite') {
    return <Award className={`w-3 h-3 mr-1 ${colorClass} animate-pulse`} />;
  }

  return <Crown className={`w-3 h-3 mr-1 text-yellow-400 animate-bounce`} />;
};

export default React.memo(function PlayerRankingItem({
  player,
  bgColor,
  forceFaction,
}: PlayerRankingItemProps) {
  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return null;
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  };

  const factionName = (forceFaction || player.faction || "").toLowerCase();
  const isGuard = factionName.includes("guard") || factionName.includes("polic") || factionName.includes("guarda");
  const accentColor = isGuard ? "text-blue-500" : "text-orange-500";
  const barColor = isGuard ? "bg-blue-500/30" : "bg-orange-500/20";
  const FactionIcon = isGuard ? Shield : Crosshair;

  // Cor customizada para Guardas no Top 3 (exceto 1 e 2)
  const posColor = player.position === 3 && isGuard ? "text-blue-400" : getPositionTextColor(player.position, player.faction);

  return (
    <div className={`${bgColor} relative border-l-2 ${isGuard ? 'border-blue-500/40' : 'border-orange-500/40'} px-2 py-2 h-full flex items-center transition-all duration-300 backdrop-blur-sm overflow-hidden group`}>
      {/* Background Decorative Element */}
      <div className={`absolute left-0 top-0 w-full h-full ${barColor} -translate-x-full group-hover:translate-x-0 transition-transform duration-500 pointer-events-none`} />

      <div className="flex items-center gap-2 min-w-0 w-full relative z-10">
        {/* Position */}
        <div className="flex flex-col items-center justify-center min-w-[24px] sm:min-w-[32px]">
          <span className={`${getPositionSizeClass(player.position)} font-orbitron font-black text-xs sm:text-sm ${posColor}`}>
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
            <span className="text-white font-bold font-orbitron text-[10px] sm:text-xs uppercase whitespace-nowrap group-hover:text-white transition-colors tracking-tighter">
              {player.username}
            </span>
          </div>
          
          {/* Rank Title with Stars/Emblem */}
          <div className="flex items-center">
            <MiniRankBadge level={player.level} isGuard={isGuard} />
            <span className={`text-[7px] sm:text-[9px] font-black italic tracking-tighter ${isGuard ? 'text-blue-400/80' : 'text-orange-500/80'} uppercase leading-none`}>
              {getFactionRank(player.level, factionName)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
            <span className="text-[7px] sm:text-[8px] font-mono text-gray-500 uppercase tracking-tighter flex-shrink-0">ID_{player.id.substring(0,4)}</span>
            <>
              <span className="text-[7px] sm:text-[8px] text-zinc-700">|</span>
              <span className={`text-[7px] sm:text-[8px] font-black font-orbitron ${player.clan_name ? accentColor : 'text-yellow-400'} uppercase tracking-tighter truncate`}>{player.clan_name || "SOLO"}</span>
            </>
          </div>
        </div>

         {/* Level & XP */}
         <div className="flex flex-col items-end flex-shrink-0 pl-1">
            <span className={`text-[9px] sm:text-[10px] font-black font-orbitron ${accentColor}`}>
              NVL_{player.level}
            </span>
            <span 
              className="text-[7px] sm:text-[8px] font-mono text-zinc-500 uppercase tracking-tighter cursor-help"
              data-tooltip-id="ranking-xp-tooltip"
              data-tooltip-content={`Total: ${Number(player.total_xp || 0).toLocaleString("pt-BR")} XP`}
            >
              {player.total_xp ? `${(player.total_xp / 1000).toFixed(1)}k` : "0k"}_XP
            </span>
            <div className="flex gap-[1px] mt-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`w-0.5 h-2 sm:w-1 sm:h-1 ${i < Math.min(player.level / 10, 5) ? (isGuard ? 'bg-blue-500' : 'bg-orange-500') : 'bg-white/10'}`} />
              ))}
            </div>
         </div>
      </div>
    </div>
  );
});
