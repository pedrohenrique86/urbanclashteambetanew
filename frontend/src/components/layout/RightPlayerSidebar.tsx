import React, { useMemo, useState } from "react";
import { UserProfile } from "../../contexts/UserProfileContext";
import { calculateCombatStats } from "../../utils/combat";
import { FACTION_ALIAS_MAP_FRONTEND } from "../../utils/faction";
import { useTheme } from "../../contexts/ThemeContext";
import { Tooltip } from "react-tooltip";
import { X } from "lucide-react";

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

const StatItem = ({ icon, label, value, iconScale = 1, tooltipId, cursorClass = "cursor-default" }: { icon: string, label: string, value: string | number, iconScale?: number, tooltipId?: string, cursorClass?: string }) => (
  <div className={`flex flex-col items-center justify-center py-1.5 px-1 ${cursorClass}`} data-tooltip-id={tooltipId}>
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

  const [activeModal, setActiveModal] = useState<string | null>(null);

  if (!userProfile) return null;

  const isRenegade = userFaction === "gangsters";
  const factionColor = isRenegade ? "#ff9500" : "#00d0ff";

  // Modal Component for Central Display
  const StatModal = ({ type, onClose }: { type: string, onClose: () => void }) => {
    const getContent = () => {
      switch (type) {
        case 'level':
          return (
            <div className="p-6 space-y-5 font-orbitron">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 font-black text-lg tracking-widest uppercase">Análise de Rank Operacional</span>
                </div>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-white/60 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Composição de Prestígio:</p>
                
                <div className="grid gap-3">
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-white/40 text-[9px] uppercase font-bold mb-1">Nível Base (XP)</span>
                      <span className="text-white/90 text-xs font-medium">Progressão de Carreira</span>
                    </div>
                    <span className="text-purple-400 font-black text-xl">+{levelBreakdown.xpLvl}</span>
                  </div>

                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-white/40 text-[9px] uppercase font-bold mb-1">Maestria Técnica</span>
                      <span className="text-white/90 text-xs font-medium">Bônus de Atributos ({Math.floor(levelBreakdown.totalStats)} / 25)</span>
                    </div>
                    <span className="text-cyan-400 font-black text-xl">+{levelBreakdown.statsBonus}</span>
                  </div>

                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-white/40 text-[9px] uppercase font-bold mb-1">Reputação Monetária</span>
                      <span className="text-white/90 text-xs font-medium">Bônus de Riqueza (${(levelBreakdown.money).toLocaleString("pt-BR")} / 100k)</span>
                    </div>
                    <span className="text-lime-400 font-black text-xl">+{levelBreakdown.moneyBonus}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-white font-black text-sm uppercase tracking-widest">Nível Final</span>
                    <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Status Dinâmico em Tempo Real</span>
                  </div>
                  <span className="text-green-400 font-black text-4xl drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">
                    {levelBreakdown.xpLvl + levelBreakdown.statsBonus + levelBreakdown.moneyBonus}
                  </span>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/5 mt-2">
                  <p className="text-[10px] text-zinc-300 leading-relaxed font-medium">
                    <span className="text-green-400/80 font-black uppercase text-[8px] tracking-[0.2em] block mb-1.5">Análise de Balanço:</span>
                    O divisor <span className="text-cyan-400 font-bold">25</span> nos atributos equilibra seu treino físico com o XP. Isso garante que sua maestria técnica e reputação monetária contribuam para o rank de forma justa, premiando o investimento em sua build.
                  </p>
                </div>
              </div>
            </div>
          );
        case 'xp':
          return (
            <div className="p-6 space-y-5 font-orbitron">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-purple-400 font-black text-lg tracking-widest uppercase">Experiência (XP)</span>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="bg-black/40 p-5 rounded-2xl border border-purple-500/20 space-y-4">
                  <p className="text-white/80 text-sm leading-relaxed">Concedida passivamente ao concluir treinamentos diários e operações de risco.</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <span className="text-[10px] text-purple-300/60 uppercase block mb-1">Atual / Requisito</span>
                        <span className="text-white font-black text-lg">{xpCurrent.toLocaleString()} / {xpRequired.toLocaleString()}</span>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <span className="text-[10px] text-purple-300/60 uppercase block mb-1">XP Total</span>
                        <span className="text-white font-black text-lg">{Number(userProfile?.xp ?? 0).toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-white leading-relaxed italic border-l-2 border-purple-500/30 pl-4">
                  O XP forma a base central vital da progressão na Faction, elevando o &apos;Nível Base&apos; do seu status militar antes de receber os cálculos de prestígio (riqueza & treino).
                </p>
              </div>
            </div>
          );
        case 'crit_dmg':
          return (
            <div className="p-6 space-y-5 font-orbitron">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex flex-col">
                  <span className="text-rose-400 font-black text-lg tracking-widest uppercase">Multiplicador Crítico</span>
                  <span className="text-[9px] text-zinc-500 uppercase font-mono">Cálculo de Letalidade Final</span>
                </div>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="bg-black/40 p-5 rounded-2xl border border-rose-500/20 shadow-inner">
                  <div className="flex justify-between items-end mb-6">
                    <div className="flex flex-col">
                      <span className="text-rose-400/60 text-[10px] uppercase font-bold tracking-tighter">Potencial Letal</span>
                      <span className="text-white font-black text-4xl leading-none">{combat.criticalDamage.toFixed(2)}x</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono italic">MAX 4.0x</span>
                  </div>
                  <div className="space-y-3 text-[10px] opacity-90 font-mono">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-zinc-400 uppercase">Base de Facção</span> 
                      <span className="text-white font-bold">+{((isRenegade?150:130)/100).toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-cyan-400 uppercase">Treino Stats (Soma/50)</span> 
                      <span className="text-white font-bold">+{(Math.floor((Number(userProfile.attack ?? 0)+Number(userProfile.defense ?? 0)+Number(userProfile.focus ?? 0))/50)/100).toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-rose-400 uppercase">Pontos Acumulados</span> 
                      <span className="text-white font-bold">+{(Number(userProfile.critical_damage ?? 0)/100).toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-400">
                      <span className="uppercase">Bônus de Instinto</span> 
                      <span className="font-bold">+{(Number((userProfile.instinct ?? 0)*0.5)/100).toFixed(2)}x</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-center">
                   <span className="text-[9px] text-white uppercase tracking-[0.2em] font-mono">Fórmula: 1 + (base+stats+acum+inst) / 100</span>
                </div>
              </div>
            </div>
          );
        case 'crit_pct':
          return (
            <div className="p-6 space-y-5 font-orbitron">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex flex-col">
                  <span className="text-yellow-400 font-black text-lg tracking-widest uppercase">Chance Crítica</span>
                  <span className="text-[9px] text-white uppercase font-mono">Probabilidade de Crítico</span>
                </div>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="bg-black/40 p-5 rounded-2xl border border-yellow-500/20">
                  <div className="flex justify-between items-end mb-6">
                    <div className="flex flex-col">
                      <span className="text-yellow-400/60 text-[10px] uppercase font-bold tracking-tighter">Probabilidade</span>
                      <span className="text-white font-black text-4xl leading-none">{combat.criticalChance.toFixed(2)}%</span>
                    </div>
                    <span className="text-[10px] text-white font-mono italic">MAX 60%</span>
                  </div>
                  <div className="space-y-3 text-[10px] opacity-90 font-mono text-yellow-50/70">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="uppercase">Base Fixa Global</span> 
                      <span className="text-white font-bold">5.00%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-cyan-400 uppercase">Bônus de Foco (Foco × 0.08)</span> 
                      <span className="text-white font-bold">+{(Number(userProfile.focus ?? 0) * 0.08).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-yellow-400 uppercase">Treino Acumulado</span> 
                      <span className="text-white font-bold">+{Number(userProfile.critical_chance ?? 0).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-400">
                      <span className="uppercase">Instinto Crítico (Instinto × 0.15)</span> 
                      <span className="font-bold">+{(Number(userProfile.instinct ?? 0) * 0.15).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-center">
                   <p className="text-[9px] text-white leading-relaxed">Seu treinamento em <span className="text-cyan-400">Foco</span> e <span className="text-emerald-400">Instinto</span> são os pilares para garantir acertos letais consistentes.</p>
                </div>
              </div>
            </div>
          );
        default: return null;
      }
    };

    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div 
          className="bg-slate-900/95 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-[400px] overflow-hidden animate-in zoom-in-95 duration-300"
          style={{ borderTopColor: type === 'level' ? '#22c55e' : type === 'xp' ? '#a855f7' : type === 'crit_dmg' ? '#f43f5e' : '#eab308' }}
        >
          {getContent()}
        </div>
        <div className="absolute inset-0 -z-10" onClick={onClose} />
      </div>
    );
  };


  // Original Layout for other factions
  return (
    <>
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
        <button onClick={() => setActiveModal('xp')} className="hover:scale-105 transition-transform">
          <CircularProgress 
            progress={xpPercentage} 
            label="XP" 
            value={`${xpCurrent}/${xpRequired}`} 
            gradientId="xpGradient" 
            glowColor="rgba(217, 70, 239, 0.4)" 
          />
        </button>
        <div 
          className="hover:scale-105 transition-transform cursor-help"
          data-tooltip-id="right-sidebar-tooltip"
          data-tooltip-content="+1% / 3 MINUTOS"
          data-tooltip-place="left"
          title=""
        >
          <CircularProgress 
            progress={energyPercentage} 
            label="Energia" 
            value={`${energyPercentage.toFixed(0)}%`} 
            gradientId="energyGradient" 
            glowColor="rgba(34, 197, 94, 0.4)" 
          />
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="px-4 mt-4 relative z-10">
        <div className="flex items-center gap-2 mb-2 relative">
          <span className="text-[11px] font-black text-white/80 tracking-widest uppercase">Stats</span>
          <div className="flex-1 h-[1px] bg-white/10"></div>
          
          {/* Level Badge Slot - Centered in the Stats Line (2 Lines) */}
          <button 
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center px-3 py-1 rounded border border-white/20 shadow-md min-w-[45px] cursor-pointer hover:brightness-125 transition-all"
            style={{ 
              backgroundColor: isRenegade ? '#ff6a00' : '#00a2ff',
              boxShadow: `0 0 5px ${isRenegade ? 'rgba(255,106,0,0.3)' : 'rgba(0,162,255,0.3)'}`
            }}
            onClick={() => setActiveModal('level')}
          >
            <span className="text-[6px] font-black text-white/90 font-orbitron tracking-widest uppercase leading-none mb-0.5">NÍVEL</span>
            <span className="text-[14px] font-black text-white font-orbitron leading-none">
              {levelBreakdown.xpLvl + levelBreakdown.statsBonus + levelBreakdown.moneyBonus}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-3 border border-white/5 rounded-sm bg-black/10 backdrop-blur-[2px]">
          <StatItem icon={iconSword} label="Ataque" value={Number(userProfile.attack || 0).toFixed(2)} cursorClass="cursor-default" />
          <StatItem icon={iconShield} label="Defesa" value={Number(userProfile.defense || 0).toFixed(2)} cursorClass="cursor-default" />
          <StatItem icon={iconTarget} label="Foco" value={Number(userProfile.focus || 0).toFixed(2)} cursorClass="cursor-default" />
          <div onClick={() => setActiveModal('crit_dmg')} className="cursor-pointer hover:bg-white/5 transition-colors">
            <StatItem icon={iconCrit} label="Dano Crit" value={Number(combat.criticalDamage || 0).toFixed(2)} iconScale={1.8} cursorClass="cursor-pointer" />
          </div>
          <div onClick={() => setActiveModal('crit_pct')} className="cursor-pointer hover:bg-white/5 transition-colors">
            <StatItem icon={iconBrain} label="Chance Crit" value={`${Number(combat.criticalChance || 0).toFixed(2)}%`} cursorClass="cursor-pointer" />
          </div>
          <StatItem icon={iconBrain} label="Instinto" value={`${Number(userProfile.instinct ?? 0).toFixed(2)}%`} cursorClass="cursor-default" />
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
          <div 
            className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex items-center justify-center cursor-help"
            data-tooltip-id="right-sidebar-tooltip"
            data-tooltip-content={`Pontos de Ação: ${ (userProfile.action_points ?? 0).toLocaleString() } / 20.000 reset diário 00:00h`}
            data-tooltip-place="left"
            title=""
          >
            <span 
              className="text-[48px] font-black text-cyan-400 font-orbitron leading-none tracking-tighter animate-glow-pulse"
              style={{ textShadow: "0 0 10px #06b6d4" }}
            >
              {userProfile.action_points ?? 0}
            </span>
          </div>

          {/* Money Slot - Inside Green Box, shifted left to fit long numbers */}
          <div 
            className="absolute top-[82%] left-[20%] -translate-y-1/2 flex items-center justify-start cursor-help"
            data-tooltip-id="right-sidebar-tooltip"
            data-tooltip-content={`Dinheiro: $${(userProfile.money ?? 0).toLocaleString("pt-BR")}`}
            data-tooltip-place="left"
            title=""
          >
            <span 
              className="font-orbitron font-black text-[16px] text-lime-400 tracking-tighter animate-glow-pulse-green"
              style={{ textShadow: "0 0 8px #84cc16" }}
            >
              {formatCurrency(userProfile.money ?? 0)}
            </span>
          </div>
          
          {/* UC Slot - Inside Yellow Box, shifted right to center in available space */}
          <div 
            className="absolute top-[82%] left-[75%] -translate-y-1/2 flex items-center justify-start cursor-help"
            data-tooltip-id="right-sidebar-tooltip"
            data-tooltip-content={`U-CRYPTON TOKENS: ${(userProfile.uCrypto ?? 0).toLocaleString("pt-BR")}`}
            data-tooltip-place="left"
            title=""
          >
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

      {/* TACTICAL TOOLTIPS - Economy & Quick Glance */}
      <Tooltip
        id="right-sidebar-tooltip"
        place="left"
        positionStrategy="fixed"
        style={{ zIndex: 99999 }}
        className="!bg-black/95 !backdrop-blur-xl !text-white !rounded-xl !px-4 !py-2 !text-[10px] !border !border-white/10 !shadow-2xl font-orbitron uppercase tracking-widest"
      />

      {/* RENDER ACTIVE MODAL */}
      {activeModal && <StatModal type={activeModal as string} onClose={() => setActiveModal(null)} />}
    </>
  );
};

export default RightPlayerSidebar;
