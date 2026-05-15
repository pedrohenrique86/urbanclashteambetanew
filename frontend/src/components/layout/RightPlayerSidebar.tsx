import React, { useMemo } from "react";
import { UserProfile } from "../../contexts/UserProfileContext";
import { calculateCombatStats } from "../../utils/combat";
import { FACTION_ALIAS_MAP_FRONTEND } from "../../utils/faction";
import { useTheme } from "../../contexts/ThemeContext";

// Import Assets
import bottomUi from "../../assets/assetscardplayer/sprite_0002.webp";
import iconCrit from "../../assets/assetscardplayer/sprite_0004.webp";
import iconTarget from "../../assets/assetscardplayer/sprite_0005.webp";
import iconSword from "../../assets/assetscardplayer/sprite_0006.webp";
import iconBrain from "../../assets/assetscardplayer/sprite_0007.webp";
import iconShield from "../../assets/assetscardplayer/sprite_0008.webp";

interface RightPlayerSidebarProps {
  userProfile: UserProfile | null;
}

const CircularProgress = ({ progress, label, value, gradientId, glowColor }: { progress: number, label: string, value: string, gradientId: string, glowColor: string }) => {
  const radius = 42;
  const stroke = 6;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-[90px] h-[90px] group transition-all duration-500 hover:scale-105">
      {/* Core Background Pulse (Radar Effect) */}
      <div 
        className="absolute inset-0 rounded-full border-2 animate-core-pulse pointer-events-none"
        style={{ borderColor: glowColor, filter: 'blur(4px)' }}
      />
      
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90 absolute inset-0 z-10 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
        {/* Main Track */}
        <circle
          stroke="rgba(255,255,255,0.05)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        {/* Rotating Detail Ring (Subtle Mechanical Feel) */}
        <circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth="1"
          strokeDasharray="2 8"
          r={normalizedRadius - 6}
          cx={radius}
          cy={radius}
          className="animate-[spin_15s_linear_infinite]"
        />
        
        {/* Main Progress Bar - Breathing Neon */}
        <circle
          stroke={`url(#${gradientId})`}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          className="animate-neon-breath"
          style={{ 
            strokeDashoffset, 
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 2px white)` 
          }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        {/* Glare Sweep Layer (High-Tech Scan Effect) */}
        <circle
          stroke="white"
          fill="transparent"
          strokeWidth="2"
          strokeDasharray="15 185"
          className="animate-glare-sweep"
          style={{ 
            filter: 'blur(1px)',
            transformOrigin: 'center'
          }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>

      {/* Internal Text Labels */}
      <div className="absolute flex flex-col items-center justify-center text-center w-full px-1 z-20 pointer-events-none">
        <span className="text-[7.5px] font-black text-white/40 tracking-[0.2em] uppercase leading-none mb-1">{label}</span>
        <span className="text-[12px] text-white font-orbitron font-black leading-none tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
          {value}
        </span>
      </div>
    </div>
  );
};

const StatItem = ({ icon, label, value, iconScale = 1 }: { icon: string, label: string, value: string | number, iconScale?: number }) => (
  <div className="flex flex-col items-center justify-center py-1.5 px-1">
    <div className="flex items-center gap-1 text-white/70 mb-1">
      <img 
        src={icon} 
        alt={label} 
        className="w-3.5 h-3.5 object-contain opacity-90" 
        style={{ transform: `scale(${iconScale})` }} 
      />
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </div>
    <span className="text-[13px] font-black text-white font-orbitron leading-none tracking-tight">
      {value}
    </span>
  </div>
);

const RightPlayerSidebar: React.FC<RightPlayerSidebarProps> = ({ userProfile }) => {
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
  
  const energyCurrent = Math.floor(userProfile?.energy ?? 0);
  const energyMax = Math.floor(userProfile?.max_energy ?? 100);
  const energyPercentage = Math.min(100, (energyCurrent / energyMax) * 100);

  const combat = useMemo(() => calculateCombatStats(userProfile), [userProfile]);

  const levelBreakdown = useMemo(() => {
    const atk  = Number(userProfile?.attack  ?? 0);
    const def  = Number(userProfile?.defense ?? 0);
    const foc  = Number(userProfile?.focus   ?? 0);
    const money = Number(userProfile?.money  ?? 0);
    const totalXp = Number(userProfile?.xp ?? 0);

    let xpLvl = 1, rem = totalXp;
    while (rem >= 100 + Math.floor(xpLvl / 5) * 10 && xpLvl < 5000) {
      rem -= 100 + Math.floor(xpLvl / 5) * 10; xpLvl++;
    }

    const totalStats = atk + def + foc;
    const statsBonus = Math.floor(totalStats / 25);
    const moneyBonus = Math.floor(money / 100_000);

    return { xpLvl, statsBonus, moneyBonus, totalStats, money };
  }, [userProfile]);

  const formatCurrency = (n: number): string => {
    if (!isFinite(n) || isNaN(n)) return "0";
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    const fmt = (val: number, divisor: number, suffix: string): string => {
      const divided = val / divisor;
      const rounded = Math.round(divided * 10) / 10;
      const formatted = rounded.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
      return `${sign}${formatted}${suffix}`;
    };
    if (abs < 10_000)          return `${sign}${abs.toLocaleString("pt-BR")}`;
    if (abs < 1_000_000)       return fmt(abs, 1_000,           "k");
    if (abs < 1_000_000_000)   return fmt(abs, 1_000,           "M");
    if (abs < 1_000_000_000_000) return fmt(abs, 1_000, "B");
    return                            fmt(abs, 1_000, "T");
  };

  if (!userProfile) return null;

  const isRenegade = userFaction === "gangsters";
  const factionColor = isRenegade ? "#ff9500" : "#00d0ff";


  // Original Layout for other factions
  return (
    <div 
      className="w-[280px] h-full flex flex-col relative z-30 transition-all duration-300 overflow-y-auto overflow-x-hidden sidebar-scroll"
      style={{ 
        backgroundColor: 'rgba(0, 15, 35, 0.85)'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 208, 255, 0.5);
        }
        @keyframes slowPing {
          0% { transform: scale(1); opacity: 0.8; }
          70%, 100% { transform: scale(2.2); opacity: 0; }
        }
        .animate-slow-ping {
          animation: slowPing 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes glowPulse {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 5px rgba(6, 182, 212, 0.4)); }
          50% { filter: brightness(1.2) drop-shadow(0 0 15px rgba(6, 182, 212, 0.8)); }
        }
        @keyframes glowPulseGreen {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 4px rgba(132, 204, 22, 0.4)); }
          50% { filter: brightness(1.2) drop-shadow(0 0 10px rgba(132, 204, 22, 0.8)); }
        }
        @keyframes glowPulseAmber {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 4px rgba(245, 158, 11, 0.4)); }
          50% { filter: brightness(1.2) drop-shadow(0 0 10px rgba(245, 158, 11, 0.8)); }
        }
        .animate-glow-pulse {
          animation: glowPulse 4s ease-in-out infinite;
        }
        .animate-glow-pulse-green {
          animation: glowPulseGreen 4s ease-in-out infinite;
        }
        .animate-glow-pulse-amber {
          animation: glowPulseAmber 4s ease-in-out infinite;
        }
        @keyframes neonBreath {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.3) saturate(1.2); }
        }
        .animate-neon-breath {
          animation: neonBreath 4s ease-in-out infinite;
        }
        @keyframes glareSweep {
          0% { transform: rotate(0deg); opacity: 0; }
          10% { opacity: 0.5; }
          40% { opacity: 0.5; }
          50% { transform: rotate(360deg); opacity: 0; }
          100% { transform: rotate(360deg); opacity: 0; }
        }
        .animate-glare-sweep {
          animation: glareSweep 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes corePulse {
          0% { transform: scale(0.95); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.1; }
          100% { transform: scale(0.95); opacity: 0.3; }
        }
        .animate-core-pulse {
          animation: corePulse 4s ease-in-out infinite;
        }
      `}} />

      {/* SVG Definitions for Gradients */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
      </svg>

      {/* HEADER: Circular Avatar - With Neon Faction Ring */}
      <div className="w-full pt-[15px] flex flex-col items-center relative z-10">
        <div className="relative w-[140px] h-[140px] flex items-center justify-center">
          {/* Circular Avatar Photo with Subtle Border */}
          <div 
            className="w-[130px] h-[130px] bg-black/80 rounded-full overflow-hidden z-10 shadow-lg border-[2px] transition-all duration-500"
            style={{ 
              borderColor: factionColor,
              boxShadow: `0 0 4px ${factionColor}, inset 0 0 4px ${factionColor}`
            }}
          >
            {userProfile.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover brightness-110 contrast-110" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black font-orbitron text-4xl text-white/20">?</div>
            )}
          </div>
          
          {/* Pulsing Status Dot with Tooltip */}
          <div 
            className="absolute bottom-[15px] right-[5px] z-40 group cursor-help"
          >
            <div className="relative flex h-5 w-5">
              <span 
                className="animate-slow-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: (() => {
                  const s = userProfile.status?.toLowerCase() || "";
                  if (s.includes("isolamento")) return "#ef4444";
                  if (s.includes("aprimoramento")) return "#22d3ee";
                  if (s.includes("recondicionamento") || s.includes("recupera")) return "#fbbf24";
                  if (s.includes("ruptura") || s.includes("sangrando")) return "#f43f5e";
                  return "#22c55e";
                })()}}
              ></span>
              <span 
                className="relative inline-flex rounded-full h-5 w-5 border-2 border-black/40 shadow-md"
                style={{ backgroundColor: (() => {
                  const s = userProfile.status?.toLowerCase() || "";
                  if (s.includes("isolamento")) return "#ef4444";
                  if (s.includes("aprimoramento")) return "#22d3ee";
                  if (s.includes("recondicionamento") || s.includes("recupera")) return "#fbbf24";
                  if (s.includes("ruptura") || s.includes("sangrando")) return "#f43f5e";
                  return "#22c55e";
                })()}}
              ></span>
            </div>
            
            {/* Hover Tooltip */}
            <div className="absolute right-0 bottom-full mb-3 px-2 py-1 bg-black/95 border border-white/10 rounded-md text-[8px] font-black text-white uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl z-50 scale-90 group-hover:scale-100 origin-bottom-right">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (() => {
                  const s = userProfile.status?.toLowerCase() || "";
                  if (s.includes("isolamento")) return "#ef4444";
                  if (s.includes("aprimoramento")) return "#22d3ee";
                  if (s.includes("recondicionamento") || s.includes("recupera")) return "#fbbf24";
                  if (s.includes("ruptura") || s.includes("sangrando")) return "#f43f5e";
                  return "#22c55e";
                })()}}></div>
                {userProfile.status || "OPERACIONAL"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* XP & ENERGIA - Adjusted margin for the massive circular layout */}
      <div className="flex justify-center gap-6 mt-2 relative z-10">
        <CircularProgress 
          progress={xpPercentage} 
          label="XP" 
          value={`${xpCurrent}/${xpRequired}`} 
          gradientId="xpGradient" 
          glowColor="rgba(217, 70, 239, 0.4)" 
        />
        <CircularProgress 
          progress={energyPercentage} 
          label="Energia" 
          value={`${energyPercentage.toFixed(0)}%`} 
          gradientId="energyGradient" 
          glowColor="rgba(34, 197, 94, 0.4)" 
        />
      </div>

      {/* STATS SECTION */}
      <div className="px-4 mt-4 relative z-10">
        <div className="flex items-center gap-2 mb-2 relative">
          <span className="text-[11px] font-black text-white/80 tracking-widest uppercase">Stats</span>
          <div className="flex-1 h-[1px] bg-white/10"></div>
          
          {/* Level Badge Slot - Centered in the Stats Line (2 Lines) */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center px-3 py-1 rounded border border-white/20 shadow-md min-w-[45px]"
            style={{ 
              backgroundColor: isRenegade ? '#ff6a00' : '#00a2ff',
              boxShadow: `0 0 5px ${isRenegade ? 'rgba(255,106,0,0.3)' : 'rgba(0,162,255,0.3)'}`
            }}
          >
            <span className="text-[6px] font-black text-white/90 font-orbitron tracking-widest uppercase leading-none mb-0.5">NÍVEL</span>
            <span className="text-[14px] font-black text-white font-orbitron leading-none">
              {levelBreakdown.xpLvl + levelBreakdown.statsBonus + levelBreakdown.moneyBonus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 border border-white/5 rounded-sm bg-black/10 backdrop-blur-[2px]">
          <StatItem icon={iconSword} label="Ataque" value={Number(userProfile.attack || 0).toFixed(2)} />
          <StatItem icon={iconShield} label="Defesa" value={Number(userProfile.defense || 0).toFixed(2)} />
          <StatItem icon={iconTarget} label="Foco" value={Number(userProfile.focus || 0).toFixed(2)} />
          <StatItem icon={iconCrit} label="Dano Crit" value={Number(combat.criticalDamage || 0).toFixed(2)} iconScale={1.8} />
          <StatItem icon={iconBrain} label="Chance Crit" value={`${Number(combat.criticalChance || 0).toFixed(2)}%`} />
          <StatItem icon={iconBrain} label="Instinto" value={`${Number(userProfile.instinct || 0).toFixed(2)}%`} />
        </div>
      </div>

      {/* BOTTOM UI SPRITE (AP & ECONOMY) */}
      <div className="mt-auto relative w-full">
        {/* Image dictates the height, guaranteeing percentage coordinates map perfectly to the artwork */}
        <img 
          src={bottomUi} 
          alt="Bottom UI" 
          className="w-full h-auto block pointer-events-none mix-blend-screen opacity-60 saturate-75" 
        />
        
        {/* Dynamic Values - EXACT positioning over the sprite features */}
        <div className="absolute inset-0 z-10">
          {/* Action Points Value - Center of the top box */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex items-center justify-center">
            <span 
              className="text-[48px] font-black text-cyan-400 font-orbitron leading-none tracking-tighter animate-glow-pulse"
              style={{ textShadow: "0 0 10px #06b6d4" }}
            >
              {userProfile.action_points ?? 0}
            </span>
          </div>

          {/* Money Slot - Inside Green Box, shifted left to fit long numbers */}
          <div className="absolute top-[82%] left-[20%] -translate-y-1/2 flex items-center justify-start">
            <span 
              className="font-orbitron font-black text-[16px] text-lime-400 tracking-tighter animate-glow-pulse-green"
              style={{ textShadow: "0 0 8px #84cc16" }}
            >
              {formatCurrency(userProfile.money ?? 0)}
            </span>
          </div>
          
          {/* UC Slot - Inside Yellow Box, shifted right to center in available space */}
          <div className="absolute top-[82%] left-[75%] -translate-y-1/2 flex items-center justify-start">
            <span 
              className="font-orbitron font-black text-[16px] text-amber-400 tracking-tighter animate-glow-pulse-amber"
              style={{ textShadow: "0 0 8px #f59e0b" }}
            >
              {formatCurrency(userProfile.uCrypto ?? 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightPlayerSidebar;
