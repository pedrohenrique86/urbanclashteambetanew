import React, { useMemo } from "react";
import { UserProfile } from "../../contexts/UserProfileContext";
import { calculateCombatStats } from "../../utils/combat";
import { FACTION_ALIAS_MAP_FRONTEND } from "../../utils/faction";
import { useTheme } from "../../contexts/ThemeContext";
import { 
  Sword, 
  Shield, 
  Target, 
  Zap, 
  Brain, 
  Cpu, 
  Banknote 
} from "lucide-react";

interface RightPlayerSidebarProps {
  userProfile: UserProfile | null;
}

const CircularProgress = ({ progress, label, value, gradientId, glowColor }: { progress: number, label: string, value: string, gradientId: string, glowColor: string }) => {
  const radius = 42;
  const stroke = 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-[90px] h-[90px]">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90 absolute inset-0" style={{ filter: `drop-shadow(0 0 10px ${glowColor})` }}>
        {/* Track */}
        <circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress */}
        <circle
          stroke={`url(#${gradientId})`}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
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

const StatItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="flex flex-col items-center justify-center py-2 px-1">
    <div className="flex items-center gap-1 text-cyan-400/80 mb-0.5">
      <span className="opacity-70 scale-75">{icon}</span>
      <span className="text-[7px] font-black uppercase tracking-tighter">{label}</span>
    </div>
    <span className="text-[15px] font-black text-white font-orbitron leading-none tracking-tight">
      {value}
    </span>
  </div>
);

const EconomyBox = ({ icon, value, colorClass, textClass, glowClass, labels }: { icon: React.ReactNode, value: string, colorClass: string, textClass: string, glowClass: string, labels: { topL: string, topR: string, botL: string, botR: string } }) => (
  <div className="flex-1 flex flex-col gap-0.5">
    {/* Micro labels top */}
    <div className="flex justify-between px-1 opacity-60">
      <span className="text-[5px] font-bold text-white uppercase">{labels.topL}</span>
      <span className="text-[5px] font-bold text-white uppercase">{labels.topR}</span>
    </div>
    
    <div 
      className={`relative border-2 ${colorClass} bg-[#05070a]/90 h-[42px] flex items-center px-2 rounded-sm overflow-hidden`}
      style={{ boxShadow: `0 0 15px ${glowClass}` }}
    >
      {/* Decorative tech notches */}
      <div className={`absolute top-0 left-0 w-1.5 h-[3px] ${colorClass.replace('border-', 'bg-')}`}></div>
      <div className={`absolute bottom-0 right-0 w-1.5 h-[3px] ${colorClass.replace('border-', 'bg-')}`}></div>
      
      <div className={`flex items-center gap-2 w-full ${textClass}`}>
        <div className="bg-white/10 p-1 rounded-sm">{icon}</div>
        <span className="font-orbitron font-black text-[14px] w-full text-right drop-shadow-[0_0_8px_currentColor] text-white">
          {value}
        </span>
      </div>
    </div>

    {/* Micro labels bottom */}
    <div className="flex justify-between px-1 opacity-60">
      <span className="text-[5px] font-bold text-white uppercase">{labels.botL}</span>
      <span className="text-[5px] font-bold text-white uppercase">{labels.botR}</span>
    </div>
  </div>
);

const RightPlayerSidebar: React.FC<RightPlayerSidebarProps> = ({ userProfile }) => {
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
    if (abs < 1_000_000_000_000) return fmt(abs, 1_000,           "B"); // Corrected to keep consistency
    return                            fmt(abs, 1_000_000_000_000, "T");
  };

  if (!userProfile) return null;

  const isRenegade = userFaction === "gangsters";
  const colorPrimary = isRenegade ? "#ff6a00" : "#00d0ff";
  const shadowGlow = isRenegade ? "rgba(255,106,0,0.25)" : "rgba(0,208,255,0.25)";

  return (
    <div 
      className="w-[280px] h-full flex flex-col relative z-30 transition-all duration-300 pb-8 overflow-x-hidden overflow-y-auto thin-scrollbar"
      style={{ 
        background: `linear-gradient(to bottom, ${isRenegade ? '#120600, #020202' : '#00060d, #020202'})`,
        borderLeft: `1px solid ${colorPrimary}66`,
        boxShadow: `-5px 0 20px rgba(0,0,0,0.5)`
      }}
    >
      {/* SVG Definitions */}
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

      {/* Honeycomb Pattern - Reduced opacity */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-15 animate-pulse">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='50' height='86.6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 21.65L25 36.08 0 21.65V-7.22l25-14.43 25 14.43V21.65zM0 64.95l-25 14.43-25-14.43V36.08l25-14.43 25 14.43V64.95zM50 64.95l-25 14.43-25-14.43V36.08l25-14.43 25 14.43V64.95z' stroke='%23ffffff' stroke-width='1.2' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '50px 86.6px',
          }} 
        />
      </div>

      {/* HEADER: Hex Avatar - Toned down filter */}
      <div className="w-full pt-10 pb-4 flex flex-col items-center relative z-10">
        <div 
          className="relative w-[130px] h-[142px]"
          style={{ filter: `drop-shadow(0 0 10px ${colorPrimary}88)` }}
        >
          <div 
            className="absolute inset-0 p-[1.5px]"
            style={{ 
              background: `${colorPrimary}cc`,
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          >
            <div 
              className="w-full h-full bg-[#05070a]"
              style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
            >
              {userProfile.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover opacity-90" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-orbitron text-5xl text-white/40">?</div>
              )}
            </div>
          </div>
          
          {/* Level Badge */}
          <div className="absolute bottom-[-5px] right-[-10px] z-20">
            <div 
              className="w-[55px] h-[64px] p-[1.5px] flex items-center justify-center"
              style={{ 
                background: `${colorPrimary}cc`,
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              }}
            >
              <div 
                className="w-full h-full bg-[#05070a] flex flex-col items-center justify-center pt-1"
                style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
              >
                <span className="text-[7px] font-bold text-white/60 uppercase tracking-tighter">Nível</span>
                <span className="text-[22px] font-black text-white leading-none font-orbitron">
                  {levelBreakdown.xpLvl + levelBreakdown.statsBonus + levelBreakdown.moneyBonus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* XP & ENERGIA - Toned down drop-shadow */}
      <div className="flex justify-center gap-8 mt-4 relative z-10">
        <CircularProgress 
          progress={xpPercentage} 
          label="XP" 
          value={`${xpCurrent}/${xpRequired}`} 
          gradientId="xpGradient" 
          glowColor="rgba(217, 70, 239, 0.2)" 
        />
        <CircularProgress 
          progress={energyPercentage} 
          label="Energia" 
          value={`${energyPercentage.toFixed(0)}%`} 
          gradientId="energyGradient" 
          glowColor="rgba(34, 197, 94, 0.2)" 
        />
      </div>

      {/* STATS GRID WITH LINES */}
      <div className="w-full mt-10 px-6 z-10 relative">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[12px] font-black text-white tracking-[0.2em] uppercase">Stats</span>
          <div className="flex-1 h-[1px] bg-white/20"></div>
        </div>

        <div className="relative border border-white/5 rounded-sm overflow-hidden bg-black/10">
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5"></div>
          <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-white/5"></div>
          <div className="absolute top-0 bottom-0 left-2/3 w-[1px] bg-white/5"></div>

          <div className="grid grid-cols-3">
            <StatItem icon={<Sword size={12}/>} label="Ataque" value={Number(userProfile.attack || 0).toFixed(2)} />
            <StatItem icon={<Shield size={12}/>} label="Defesa" value={Number(userProfile.defense || 0).toFixed(2)} />
            <StatItem icon={<Target size={12}/>} label="Foco" value={Number(userProfile.focus || 0).toFixed(2)} />
            <StatItem icon={<Zap size={12}/>} label="Dano Crit" value={Number(combat.criticalDamage || 0).toFixed(2)} />
            <StatItem icon={<Brain size={12}/>} label="Chance Crit" value={`${Number(combat.criticalChance || 0).toFixed(2)}%`} />
            <StatItem icon={<Cpu size={12}/>} label="Instinto" value={`${Number(userProfile.instinct || 0).toFixed(2)}%`} />
          </div>
        </div>
      </div>

      {/* ACTION POINTS - Toned down background glow */}
      <div className="w-full mt-10 px-6 z-10 relative">
        <div 
          className={`relative w-full p-[1px] rounded-sm group overflow-hidden`}
          style={{ 
            background: `linear-gradient(to right, transparent, ${colorPrimary}66, transparent)`,
          }}
        >
          <div className="bg-[#05070a] w-full py-5 flex flex-col items-center justify-center relative rounded-sm border border-white/5">
             <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-current opacity-40" style={{ color: colorPrimary }}></div>
             <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-current opacity-40" style={{ color: colorPrimary }}></div>
             <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-current opacity-40" style={{ color: colorPrimary }}></div>
             <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-current opacity-40" style={{ color: colorPrimary }}></div>

             <span className="text-[12px] font-bold text-white/70 tracking-[0.3em] uppercase mb-1">
               Pontos de Ação
             </span>
             <span className="text-[36px] font-black text-white font-orbitron leading-none">
               {userProfile.action_points ?? 0}
             </span>
          </div>
        </div>
      </div>

      {/* ECONOMY - Toned down glow and borders */}
      <div className="w-full mt-8 px-6 z-10 relative flex gap-4">
        <EconomyBox 
          icon={<Banknote size={16}/>} 
          value={`$${formatCurrency(userProfile.money ?? 0)}`} 
          colorClass="border-emerald-500/30" 
          textClass="text-emerald-400/90" 
          glowClass="rgba(16, 185, 129, 0.1)"
          labels={{ topL: "BORNES", topR: "ACTIVE", botL: "CREDITS", botR: "VALOR" }}
        />
        <EconomyBox 
          icon={<div className="bg-amber-500/80 text-black text-[9px] font-black px-1.5 rounded-sm">UC</div>} 
          value={formatCurrency(userProfile.uCrypto ?? 0)} 
          colorClass="border-amber-500/30" 
          textClass="text-amber-400/90" 
          glowClass="rgba(245, 158, 11, 0.1)"
          labels={{ topL: "U-CRYPTO", topR: "REDE", botL: "STORAGE", botR: "SECURE" }}
        />
      </div>
    </div>
  );
};

export default RightPlayerSidebar;

