import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { UserProfile } from "../../types";
import { Tooltip } from "react-tooltip";
import { motion } from "framer-motion";
import { calculateCombatStats } from "../../utils/combat";
import { FACTION_ALIAS_MAP_FRONTEND } from "../../utils/faction";

interface TopBarProps {
  userProfile: UserProfile | null;
}

const TopBar: React.FC<TopBarProps> = ({ userProfile }) => {
  const { themeClasses } = useTheme();

  const userFaction = useMemo(() => {
    if (!userProfile) return null;
    const rawF = typeof userProfile.faction === 'string' 
      ? userProfile.faction 
      : (userProfile.faction as any)?.name;
    return FACTION_ALIAS_MAP_FRONTEND[String(rawF).toLowerCase().trim()] || "gangsters";
  }, [userProfile]);

  const xpRequired = userProfile?.xp_required ?? 0;
  const xpCurrent = userProfile?.current_xp ?? 0;
  const xpPercentage = xpRequired > 0 ? Math.min(100, (xpCurrent / xpRequired) * 100) : 0;
  const xpText = xpRequired > 0 ? `${xpCurrent}/${xpRequired}` : `${xpCurrent}`;

  const energyCurrent = userProfile?.energy ?? 0;
  const energyMax = userProfile?.max_energy ?? 100;
  const energyPercentage = Math.min(100, (energyCurrent / energyMax) * 100);
  const energyText = `${Math.round(energyPercentage)}%`;

  const combat = useMemo(() => calculateCombatStats(userProfile), [userProfile]);

  const metrics = useMemo(() => [
    { label: "NVL", value: userProfile?.level ?? "-", className: "text-green-400", glowColor: "#22c55e", tooltip: "Nível" },
    { 
      label: "XP", 
      value: xpText, 
      className: "text-purple-400", 
      glowColor: "#a855f7", 
      tooltip: "Experiência",
      progress: xpPercentage,
      barColor: "bg-purple-600/30"
    },
    { 
      label: "EN", 
      value: energyText, 
      className: "text-orange-400", 
      glowColor: "#f97316", 
      tooltip: "Energia",
      progress: energyPercentage,
      barColor: "bg-orange-600/30",
      isBattery: true
    },
    { label: "PA", value: userProfile?.action_points ?? "-", className: "text-cyan-400", glowColor: "#06b6d4", tooltip: "Pontos de Ação" },
    { label: "ATK", value: userProfile?.attack ?? "-", className: "text-red-400", glowColor: "#ef4444", tooltip: "Ataque" },
    { label: "DEF", value: userProfile?.defense ?? "-", className: "text-blue-400", glowColor: "#3b82f6", tooltip: "Defesa" },
    { label: "FOC", value: userProfile?.focus ?? "-", className: "text-pink-400", glowColor: "#ec4899", tooltip: "Foco" },
    { label: "CRIT DMG", value: combat.criticalDamage?.toFixed?.(1) ?? "-", className: "text-rose-400", glowColor: "#f43f5e", tooltip: "Dano Crítico" },
    { label: "CRIT%", value: `${combat.criticalChance?.toFixed?.(0) ?? 0}%`, className: "text-yellow-400", glowColor: "#eab308", tooltip: "Chance Crítico" },
    { label: "Cash", value: `$${(userProfile?.money ?? 0).toLocaleString("pt-BR")}`, className: "text-lime-400", glowColor: "#84cc16", tooltip: "Dinheiro" },
  ], [userProfile, xpText, energyText, xpPercentage, energyPercentage, combat]);

  if (!userProfile) return null;

  return (
    <>
      <div className="absolute top-[12px] md:top-[6px] z-50 w-full flex justify-center items-start md:items-center mb-6 h-auto pointer-events-none">
        <div
          className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl w-[95%] md:w-auto pointer-events-auto"
          style={{
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 20px 50px rgba(0, 0, 0, 0.9)",
          }}
        >
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
            {metrics.map((metric, index) => (
              <React.Fragment key={metric.label}>
                <div
                  className="flex flex-col items-center justify-center text-center px-1"
                  data-tooltip-id="topbar-tooltip"
                  data-tooltip-content={metric.tooltip}
                >
                  <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest leading-none mb-1">
                    {metric.label}
                  </span>
                  
                  {/* Value container with optional progress or battery background */}
                  <div className={`relative px-3 py-1 rounded-lg overflow-hidden min-w-[50px] flex items-center justify-center ${metric.progress !== undefined ? 'bg-white/5' : ''} ${metric.isBattery ? 'pr-4 !rounded-md' : ''}`}>
                    
                    {/* The Fill Layer */}
                    {metric.progress !== undefined && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${metric.progress}%` }}
                        transition={{ type: "spring", stiffness: 40, damping: 12 }}
                        className={`absolute inset-0 left-0 right-auto h-full ${metric.barColor} z-0 shadow-[inset_-1px_0_6px_rgba(255,255,255,0.1)]`}
                      />
                    )}

                    {/* Content Layer */}
                    <span
                      className={`relative z-10 font-orbitron font-black text-xs sm:text-sm ${metric.className} leading-none`}
                      style={{
                        textShadow: `0 0 10px ${metric.glowColor}`,
                      }}
                    >
                      {metric.value}
                    </span>

                    {/* Battery Tip (Conditional) */}
                    {metric.isBattery && (
                       <div className="absolute right-[2px] top-1/2 -translate-y-1/2 w-[3px] h-[6px] bg-white/20 rounded-r-[1px] z-20" />
                    )}
                  </div>
                </div>
                {index === 0 && (
                  <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <Tooltip
        id="topbar-tooltip"
        place="bottom"
        style={{ zIndex: 9999 }}
        className="!bg-black/95 !backdrop-blur-xl !text-white !rounded-xl !px-4 !py-2 !text-[10px] !border !border-white/10 !shadow-2xl font-orbitron uppercase tracking-widest"
      />
    </>
  );
};

export default TopBar;