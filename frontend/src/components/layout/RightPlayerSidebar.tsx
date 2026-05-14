import React, { useMemo } from "react";
import { UserProfile } from "../../contexts/UserProfileContext";
import { calculateCombatStats } from "../../utils/combat";
import { FACTION_ALIAS_MAP_FRONTEND } from "../../utils/faction";
import { useTheme } from "../../contexts/ThemeContext";

// Import Assets
import spriterenegadoBg from "../../assets/assetscardplayer/spriterenegado.webp";
import bottomUi from "../../assets/assetscardplayer/sprite_0002.webp";
import iconTarget from "../../assets/assetscardplayer/sprite_0005.webp";
import iconSword from "../../assets/assetscardplayer/sprite_0006.webp";
import iconBrain from "../../assets/assetscardplayer/sprite_0007.webp";
import iconShield from "../../assets/assetscardplayer/sprite_0008.webp";

interface RightPlayerSidebarProps {
  userProfile: UserProfile | null;
}

const CircularProgress = ({ progress, label, value, gradientId, glowColor }: { progress: number, label: string, value: string, gradientId: string, glowColor: string }) => {
  const radius = 34;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-[72px] h-[72px]">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90 absolute inset-0">
        <circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={`url(#${gradientId})`}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 2px ${glowColor})` }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-black text-white/90 tracking-widest uppercase leading-none mb-1">{label}</span>
        <span className="text-[12px] text-white font-orbitron font-bold leading-none">{value}</span>
      </div>
    </div>
  );
};

const StatItem = ({ icon, label, value }: { icon: string, label: string, value: string | number }) => (
  <div className="flex flex-col items-center justify-center py-1.5 px-1">
    <div className="flex items-center gap-1 text-white/60 mb-0.5">
      <img src={icon} alt={label} className="w-2.5 h-2.5 object-contain opacity-80" />
      <span className="text-[7px] font-black uppercase tracking-tighter">{label}</span>
    </div>
    <span className="text-[12px] font-black text-white font-orbitron leading-none tracking-tight">
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

  return (
    <div 
      className="w-[280px] h-full flex flex-col relative z-30 transition-all duration-300 overflow-hidden"
      style={{ 
        backgroundImage: isRenegade ? `url(${spriterenegadoBg})` : 'none',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundColor: isRenegade ? 'rgba(20, 10, 0, 0.8)' : 'rgba(0, 15, 35, 0.95)',
        backgroundBlendMode: isRenegade ? 'overlay' : 'normal'
      }}
    >
      {/* Moving Honeycomb Effect for Corners */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='69.2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 17.3L20 28.8 0 17.3V-5.8l20-11.5L40-5.8V17.3zM0 51.9l-20 11.5L-40 51.9V28.8l20-11.5 20 11.5V51.9zM40 51.9l-20 11.5L0 51.9V28.8l20-11.5 20 11.5V51.9z' stroke='%23${isRenegade ? 'ff6a00' : '00d0ff'}' stroke-width='1' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 69.2px',
          animation: 'honeycombScroll 60s linear infinite',
          maskImage: 'radial-gradient(circle at center, transparent 30%, black 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, transparent 30%, black 100%)',
        }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes honeycombScroll {
          from { background-position: 0 0; }
          to { background-position: 400px 692px; }
        }
      `}} />

      {/* SVG Definitions for Gradients */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
      </svg>

      {/* HEADER: Circular Avatar - With Neon Faction Ring */}
      <div className="w-full pt-[15px] flex flex-col items-center relative z-10">
        <div className="relative w-[180px] h-[180px] flex items-center justify-center">
          {/* Circular Avatar Photo with Subtle Border */}
          <div 
            className="w-[170px] h-[170px] bg-black/80 rounded-full overflow-hidden z-10 shadow-lg border-[2px] transition-all duration-500"
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
          
          {/* Level Badge Slot */}
          <div className="absolute bottom-[5px] right-[0px] z-30 flex flex-col items-center justify-center w-[40px] h-[40px] bg-black/60 rounded-full border border-white/20 backdrop-blur-sm shadow-lg">
            <span className="text-[6px] font-black text-white/80 uppercase tracking-tighter leading-none mb-0.5">Nível</span>
            <span className="text-[16px] font-black text-white font-orbitron leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {levelBreakdown.xpLvl + levelBreakdown.statsBonus + levelBreakdown.moneyBonus}
            </span>
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

      {/* STATS GRID */}
      <div className="w-full mt-4 px-6 z-10 relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-black text-white/80 tracking-widest uppercase">Stats</span>
          <div className="flex-1 h-[1px] bg-white/10"></div>
        </div>

        <div className="grid grid-cols-3 border border-white/5 rounded-sm bg-black/10 backdrop-blur-[2px]">
          <StatItem icon={iconSword} label="Ataque" value={Number(userProfile.attack || 0).toFixed(2)} />
          <StatItem icon={iconShield} label="Defesa" value={Number(userProfile.defense || 0).toFixed(2)} />
          <StatItem icon={iconTarget} label="Foco" value={Number(userProfile.focus || 0).toFixed(2)} />
          <StatItem icon={iconBrain} label="Dano Crit" value={Number(combat.criticalDamage || 0).toFixed(2)} />
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
          className="w-full h-auto block pointer-events-none mix-blend-screen opacity-90" 
        />
        
        {/* Dynamic Values - EXACT positioning over the sprite features */}
        <div className="absolute inset-0 z-10">
          {/* Action Points Value - Center of the top box */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex items-center justify-center">
            <span className="text-[48px] font-black text-white font-orbitron leading-none tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {userProfile.action_points ?? 0}
            </span>
          </div>

          {/* Money Slot - Inside Green Box, shifted left to fit long numbers */}
          <div className="absolute top-[82%] left-[20%] -translate-y-1/2 flex items-center justify-start">
            <span className="font-orbitron font-black text-[20px] text-white drop-shadow-[0_0_4px_#22c55e] tracking-tighter">
              {formatCurrency(userProfile.money ?? 0)}
            </span>
          </div>
          
          {/* UC Slot - Inside Yellow Box, shifted right to center in available space */}
          <div className="absolute top-[82%] left-[75%] -translate-y-1/2 flex items-center justify-start">
            <span className="font-orbitron font-black text-[20px] text-white drop-shadow-[0_0_4px_#f59e0b] tracking-tighter">
              {formatCurrency(userProfile.uCrypto ?? 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightPlayerSidebar;
