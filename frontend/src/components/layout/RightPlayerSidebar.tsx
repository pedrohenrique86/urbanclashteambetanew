import React, { useMemo, useState } from "react";
import { UserProfile } from "../../contexts/UserProfileContext";
import { calculateCombatStats } from "../../utils/combat";
import { FACTION_ALIAS_MAP_FRONTEND } from "../../utils/faction";
import { useTheme } from "../../contexts/ThemeContext";
import { Tooltip } from "react-tooltip";
import { X, Zap, Banknote, Swords, Shield, Target, Brain, Dices, Flame, ArrowLeftRight, Star, Skull } from "lucide-react";

// Import Assets
// bottomUi import removed as per user request
import iconCrit from "../../assets/assetscardplayer/sprite_0004.webp";
import iconTarget from "../../assets/assetscardplayer/sprite_0005.webp";
import iconSword from "../../assets/assetscardplayer/sprite_0006.webp";
import iconBrain from "../../assets/assetscardplayer/sprite_0007.webp";
import iconShield from "../../assets/assetscardplayer/sprite_0008.webp";

interface RightPlayerSidebarProps {
  userProfile: UserProfile | null;
}

const JuicyBar = ({ progress, label, value, color }: { progress: number, label: string, value: string, color: string }) => (
  <div className="w-full flex flex-col gap-1 mb-1 group/bar relative">
    <div className="flex justify-between items-center px-1">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rotate-45 border border-white/20 group-hover/bar:bg-white transition-colors" style={{ borderColor: color }} />
        <span className="text-[8px] font-black text-white/70 uppercase tracking-[0.25em] drop-shadow-md group-hover/bar:text-white transition-colors">{label}</span>
      </div>
      <span className="text-[10px] font-orbitron font-black text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,0.5)] bg-black/40 px-1.5 rounded-sm border border-white/5">{value}</span>
    </div>
    
    <div 
      className={`h-3 w-full bg-[#020617] rounded-[2px] border border-white/10 overflow-hidden relative shadow-[0_0_15px_rgba(0,0,0,0.5)] ${progress >= 100 ? 'border-white/40 animate-pulse-full' : ''}`}
      style={{ '--pulse-color': color } as React.CSSProperties}
    >
       {/* Background Grid Pattern */}
       <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '10px 100%' }} />
       
       {/* Progress Fill */}
       <div 
         className="h-full transition-all duration-1000 relative" 
         style={{ width: `${progress}%`, backgroundColor: `${color}44` }}
       >
          {/* Main Solid Color Line at top */}
          <div className="absolute top-0 left-0 right-0 h-[1px] opacity-80" style={{ backgroundColor: color }} />
          
          {/* Segmented Fill Effect */}
          <div className="absolute inset-0 flex">
             <div className="h-full w-full relative overflow-hidden">
                <div 
                  className="absolute inset-0 animate-stripes" 
                  style={{ 
                    backgroundColor: color,
                    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                    backgroundSize: '16px 16px',
                    boxShadow: progress >= 100 ? `0 0 30px ${color}` : `0 0 15px ${color}`
                  }} 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
             </div>
          </div>

          {/* Glowing Head with Spark */}
          <div className="absolute right-0 top-0 bottom-0 w-3 blur-[6px] z-20 animate-pulse opacity-80" style={{ backgroundColor: color }} />
          <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-white z-30 shadow-[0_0_15px_#fff] animate-spark" />
          <div className="absolute right-0 top-0 bottom-0 w-[6px] bg-white/20 z-25 blur-[2px] animate-spark" />
       </div>

       {/* Glass Reflection Overlay */}
       <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />
    </div>
  </div>
);

const StatRibbon = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => (
  <div className="relative flex items-center justify-between px-1.5 py-0 mb-[1px] overflow-hidden rounded-md border-b bg-gradient-to-r from-slate-900/90 to-slate-800/50 group hover:brightness-110 transition-all shadow-sm" style={{ borderBottomColor: color }}>
    <div className="absolute left-0 top-0 bottom-0 w-1 opacity-90" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
    
    <div className="flex items-center gap-1.5 pl-1.5 relative z-10">
      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-black/60 border border-white/10 shadow-inner group-hover:border-white/30 transition-colors">
        <Icon size={14} className="opacity-90 group-hover:scale-110 transition-transform duration-300" style={{ color: color, filter: `drop-shadow(0 0 3px ${color})` }} />
      </div>
      <span className="text-[8px] font-black text-white/80 uppercase tracking-widest">{label}</span>
    </div>
    
    <span className="text-[13px] font-black text-white font-orbitron drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] relative z-10 pr-1">
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("right_sidebar_collapsed");
      return saved ? JSON.parse(saved) : false;
    } catch (error) {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev: boolean) => {
      const newState = !prev;
      localStorage.setItem("right_sidebar_collapsed", JSON.stringify(newState));
      return newState;
    });
  };

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


  return (
    <>
      <div 
        className={`${isCollapsed ? 'w-16' : 'w-[280px]'} h-full flex flex-col relative z-30 transition-all duration-300 overflow-y-auto overflow-x-hidden sidebar-scroll bg-black/25 backdrop-blur-xl border-l border-white/10 rounded-l-xl shadow-2xl`} 
        style={{ boxShadow: "inset 4px 0 12px -4px rgba(0,0,0,0.4)" }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .sidebar-scroll::-webkit-scrollbar { width: 4px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
          .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.4); }
          @keyframes scanning {
            0% { transform: translateY(-100%); opacity: 0; }
            50% { opacity: 0.3; }
            100% { transform: translateY(100%); opacity: 0; }
          }
          .animate-scanning { animation: scanning 3s linear infinite; }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; filter: blur(8px); }
            50% { opacity: 0.8; filter: blur(12px); }
          }
          .animate-glow { animation: pulse-glow 2s ease-in-out infinite; }
          @keyframes rotation {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-slow { animation: rotation 12s linear infinite; }
          .animate-spin-reverse { animation: rotation 8s linear reverse infinite; }
          @keyframes stripe-move {
            0% { background-position: 0 0; }
            100% { background-position: 16px 0; }
          }
          .animate-stripes { animation: stripe-move 1s linear infinite; }
          @keyframes spark-flicker {
            0%, 100% { opacity: 0.8; transform: scaleY(1) translateX(0); }
            33% { opacity: 1; transform: scaleY(1.1) translateX(1px); }
            66% { opacity: 0.9; transform: scaleY(0.9) translateX(-1px); }
          }
          .animate-spark { animation: spark-flicker 0.15s ease-in-out infinite; }
          @keyframes electric-pulse {
            0%, 100% { box-shadow: 0 0 15px rgba(6, 182, 212, 0.4), inset 0 0 5px rgba(6, 182, 212, 0.2); }
            50% { box-shadow: 0 0 25px rgba(6, 182, 212, 0.8), inset 0 0 10px rgba(6, 182, 212, 0.4); }
          }
          .animate-electric { animation: electric-pulse 1.5s infinite; }
          @keyframes explosion-flash {
            0% { transform: scale(0.8); opacity: 0; }
            10% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(2); opacity: 0; }
          }
          .animate-explosion { animation: explosion-flash 0.8s ease-out infinite; }
          @keyframes bar-shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(1px); }
            75% { transform: translateX(-1px); }
          }
          .animate-shake { animation: bar-shake 0.1s linear infinite; }
          @keyframes pulse-full {
            0%, 100% { opacity: 1; filter: brightness(1); }
            50% { opacity: 0.8; filter: brightness(1.3) drop-shadow(0 0 5px var(--pulse-color, white)); }
          }
          .animate-pulse-full { animation: pulse-full 4s ease-in-out infinite; }
          @keyframes flow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-flow { background-size: 200% 200%; animation: flow 5s ease infinite; }
        `}} />
        
        {/* Game Background & Patterns */}
        <div className="absolute inset-0 pointer-events-none" />
        
        {/* Scanline Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />

        {/* AVATAR HERO SECTION */}
        <div className={`relative px-3 pt-1 pb-0.5 flex flex-col items-center shrink-0 ${isCollapsed ? 'gap-4' : ''}`}>
          
          {/* Faction Emblem floating top & TOGGLE BUTTON */}
          <div className={`flex flex-col items-center gap-2 ${isCollapsed ? 'mt-2' : 'absolute top-1 left-2'}`}>
            <div 
              className="w-7 h-7 rounded-lg bg-[#020617] border shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center relative z-20 overflow-hidden transform rotate-45 group cursor-help transition-all" 
              style={{ borderColor: factionColor }} 
              data-tooltip-id="right-sidebar-tooltip" 
              data-tooltip-content={`Facção: ${userFaction === 'guardas' ? 'Guardião' : 'Renegado'}`}
            >
               <div className="absolute inset-0 opacity-20" style={{ backgroundColor: factionColor }} />
               <span className="text-[12px] font-black text-white drop-shadow-md relative z-10 -rotate-45">
                 {userFaction === 'guardas' ? 'G' : 'R'}
               </span>
            </div>

            <button 
              onClick={toggleSidebar}
              className="w-7 h-7 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-lg group"
              data-tooltip-id="right-sidebar-tooltip"
              data-tooltip-content={isCollapsed ? "Expandir HUD" : "Recolher HUD"}
            >
              <ArrowLeftRight className={`w-4 h-4 transition-transform duration-500 ${isCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* Avatar Shield/Frame */}
          <div className={`relative group mt-0 transition-all duration-300 ${isCollapsed ? 'w-10 h-10 mb-2' : 'w-[85px] h-[85px] mb-4'}`}>
            {!isCollapsed && (
              <>
                <div className="absolute -inset-3 border border-dashed border-cyan-500/20 rounded-full animate-spin-slow pointer-events-none" />
                <div className="absolute -inset-2 border border-t-purple-500/40 border-r-transparent border-b-cyan-500/40 border-l-transparent rounded-full animate-spin-reverse pointer-events-none" />
                <div className="absolute -inset-1 bg-gradient-to-b from-cyan-500/30 to-purple-500/30 rounded-full blur-lg opacity-40 group-hover:opacity-80 transition-opacity duration-500 pointer-events-none" />
              </>
            )}
            
            <div className="w-full h-full rounded-full p-[2px] bg-[#1e293b] shadow-[0_8px_20px_rgba(0,0,0,0.9)] relative z-10 overflow-hidden">
              <div className="w-full h-full rounded-full overflow-hidden bg-black border-2 border-[#0f172a] relative">
                {userProfile.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center bg-slate-900 font-orbitron text-white/10 ${isCollapsed ? 'text-xs' : 'text-2xl'}`}>?</div>
                )}
              </div>
            </div>

            {!isCollapsed && (
              <button 
                onClick={() => setActiveModal('level')} 
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30 hover:-translate-y-0.5 transition-all group/lvl"
              >
                <div 
                  className="relative w-[55px] h-[30px] bg-[#020617] border border-amber-500/80 shadow-[0_5px_10px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center overflow-hidden transition-all group-hover/lvl:border-amber-400"
                  style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 to-transparent" />
                  <span className="text-[7px] font-black text-white uppercase tracking-[0.15em] leading-none mb-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Nível</span>
                  <span className="text-sm font-black text-white font-orbitron leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {levelBreakdown.xpLvl + levelBreakdown.statsBonus + levelBreakdown.moneyBonus}
                  </span>
                </div>
              </button>
            )}
          </div>
          
          <div className="mb-2">
             <div className={`${isCollapsed ? 'w-6 h-6 rounded-full flex items-center justify-center' : 'px-2.5 py-0.5 bg-black/80 rounded-sm border-x border-white/10 flex items-center gap-1.5 shadow-xl'} relative overflow-hidden group transition-all`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: (() => {
                  const s = userProfile.status?.toLowerCase() || "";
                  if (s.includes("isolamento")) return "#ef4444";
                  if (s.includes("aprimoramento")) return "#22d3ee";
                  if (s.includes("recondicionamento") || s.includes("recupera")) return "#fbbf24";
                  if (s.includes("ruptura") || s.includes("sangrando")) return "#f43f5e";
                  return "#10b981";
                })()}}></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: (() => {
                  const s = userProfile.status?.toLowerCase() || "";
                  if (s.includes("isolamento")) return "#ef4444";
                  if (s.includes("aprimoramento")) return "#22d3ee";
                  if (s.includes("recondicionamento") || s.includes("recupera")) return "#fbbf24";
                  if (s.includes("ruptura") || s.includes("sangrando")) return "#f43f5e";
                  return "#10b981";
                })()}}></span>
                </span>
                {!isCollapsed && <span className="text-[7px] font-black text-white/90 uppercase tracking-[0.2em] font-orbitron">{userProfile.status || "OPERACIONAL"}</span>}
             </div>
          </div>

          {!isCollapsed && (
            <div className="w-full space-y-0.5">
              <button onClick={() => setActiveModal('xp')} className="w-full text-left cursor-pointer hover:brightness-110 transition-all">
                <JuicyBar progress={xpPercentage} label="Experiência" value={`${xpCurrent}/${xpRequired}`} color="#a855f7" />
              </button>
              <div className="w-full cursor-help hover:brightness-110 transition-all" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content="Recupera 1% a cada 3 minutos">
                <JuicyBar progress={energyPercentage} label="Energia Vital" value={`${energyPercentage.toFixed(0)}%`} color="#22c55e" />
              </div>
            </div>
          )}
        </div>

        {!isCollapsed ? (
          <div className="px-3 pb-0 flex-1 relative z-10">
            <div className="flex items-center gap-2 mb-0.5 mt-0">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
              <span className="text-[8px] font-black text-white/40 tracking-[0.2em] uppercase drop-shadow-md">Atributos</span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
            </div>

            <div className="flex flex-col">
               <StatRibbon icon={Swords} label="Ataque" value={Number(userProfile.attack || 0).toFixed(2)} color="#ef4444" />
               <StatRibbon icon={Shield} label="Defesa" value={Number(userProfile.defense || 0).toFixed(2)} color="#3b82f6" />
               <StatRibbon icon={Target} label="Foco Mental" value={Number(userProfile.focus || 0).toFixed(2)} color="#8b5cf6" />
               <StatRibbon icon={Brain} label="Instinto" value={`${Number(userProfile.instinct ?? 0).toFixed(2)}%`} color="#10b981" />
               <div onClick={() => setActiveModal('crit_dmg')} className="cursor-pointer">
                 <StatRibbon icon={Flame} label="Dano Crítico" value={`${Number(combat.criticalDamage || 0).toFixed(2)}x`} color="#f43f5e" />
               </div>
               <div onClick={() => setActiveModal('crit_pct')} className="cursor-pointer">
                 <StatRibbon icon={Dices} label="Chance Crítica" value={`${Number(combat.criticalChance || 0).toFixed(2)}%`} color="#eab308" />
               </div>
               {userFaction === 'guardas' ? (
                 <StatRibbon icon={Star} label="Mérito" value={Number(userProfile.merit || 0).toString()} color="#3b82f6" />
               ) : (
                 <StatRibbon icon={Skull} label="Infâmia" value={Number(userProfile.corruption || 0).toString()} color="#f97316" />
               )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2 flex-1 border-t border-white/5">
             <Swords size={16} className="text-red-400 cursor-help" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content={`ATAQUE: ${Number(userProfile.attack || 0).toFixed(2)}`} />
             <Shield size={16} className="text-blue-400 cursor-help" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content={`DEFESA: ${Number(userProfile.defense || 0).toFixed(2)}`} />
             <Target size={16} className="text-purple-400 cursor-help" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content={`FOCO MENTAL: ${Number(userProfile.focus || 0).toFixed(2)}`} />
             <Brain size={16} className="text-emerald-400 cursor-help" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content={`INSTINTO: ${Number(userProfile.instinct ?? 0).toFixed(2)}%`} />
             <Flame size={16} className="text-pink-400 cursor-help" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content={`DANO CRÍTICO: ${Number(combat.criticalDamage || 0).toFixed(2)}x`} />
             <Dices size={16} className="text-yellow-400 cursor-help" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content={`CHANCE CRÍTICA: ${Number(combat.criticalChance || 0).toFixed(2)}%`} />
             {userFaction === 'guardas' ? (
               <Star size={16} className="text-blue-400 cursor-help" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content={`MÉRITO: ${userProfile.merit || 0}`} />
             ) : (
               <Skull size={16} className="text-orange-400 cursor-help" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content={`INFÂMIA: ${userProfile.corruption || 0}`} />
             )}
          </div>
        )}

        <div className={`mt-auto px-3 pb-2 pt-1 relative z-10 ${isCollapsed ? 'flex flex-col items-center gap-4' : ''}`}>
           {!isCollapsed && <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />}
           
           {!isCollapsed ? (
             <>
               <div 
                 className="mb-2 relative w-full h-[46px] bg-gradient-to-br from-[#083344] via-[#020617] to-[#083344] animate-flow rounded-xl border border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-between px-4 cursor-help overflow-hidden group hover:border-cyan-300 transition-all hover:scale-[1.01]" 
                 data-tooltip-id="right-sidebar-tooltip" 
                 data-tooltip-content={`Pontos de Ação: ${ (userProfile.action_points ?? 0).toLocaleString() } / 20.000`}
               >
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15),transparent)]" />
                 <div className="absolute top-0 left-0 w-full h-full animate-scanning bg-gradient-to-b from-transparent via-cyan-300/20 to-transparent pointer-events-none" />
                 <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #22d3ee 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                 <div className="flex items-center gap-2 relative z-10">
                    <div className="relative">
                      <div className="absolute -inset-1.5 bg-cyan-400 rounded-full blur-md opacity-30 animate-pulse" />
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-700 animate-electric flex items-center justify-center border-2 border-white shadow-2xl text-white relative z-10 group-hover:scale-110 transition-transform">
                        <Zap size={16} fill="white" className="drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-cyan-400 uppercase tracking-[0.2em] leading-none drop-shadow-sm">Ação</span>
                      <span className="text-[8px] font-black text-white uppercase tracking-[0.2em] leading-none mt-0.5">Diária</span>
                    </div>
                 </div>

                 <div className="flex flex-col items-end relative z-10">
                   <span className="text-[24px] font-black text-white font-orbitron leading-none drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                     {userProfile.action_points ?? 0}
                   </span>
                   <div className="h-1 w-24 bg-black/40 mt-1 rounded-full overflow-hidden border border-white/10 relative">
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-scanning" />
                     <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300 shadow-[0_0_10px_#22d3ee]" style={{ width: `${Math.min(100, ((userProfile.action_points ?? 0) / 20000) * 100)}%` }} />
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-2.5">
                 <div 
                   className="bg-gradient-to-br from-[#064e3b] to-[#020617] p-2 rounded-lg border-l-4 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)] flex flex-col items-center justify-center relative overflow-hidden group cursor-help transition-all hover:scale-[1.02] hover:brightness-125" 
                   style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%)' }}
                   data-tooltip-id="right-sidebar-tooltip" 
                   data-tooltip-content={`CASH: $${(userProfile.money ?? 0).toLocaleString()}`}
                 >
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.3),transparent)]" />
                   <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50" />
                   
                   <Banknote size={18} className="text-emerald-400 mb-1 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)] group-hover:scale-110 transition-transform" />
                   <div className="flex flex-col items-center relative z-10">
                     <span className="text-[7px] text-emerald-300/60 uppercase font-black tracking-[0.2em] mb-0.5">Cash</span>
                     <span className="text-[15px] font-black text-white font-orbitron tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{formatCurrency(userProfile.money ?? 0)}</span>
                   </div>
                   
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                 </div>
                 
                 <div 
                   className="bg-gradient-to-br from-[#78350f] to-[#020617] p-2 rounded-lg border-r-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)] flex flex-col items-center justify-center relative overflow-hidden group cursor-help transition-all hover:scale-[1.02] hover:brightness-125" 
                   style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%, 0 15%)' }}
                   data-tooltip-id="right-sidebar-tooltip" 
                   data-tooltip-content={`U-CRYPTO: ${(userProfile.uCrypto ?? 0).toLocaleString()}`}
                 >
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,8,0.3),transparent)]" />
                   <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50" />

                   <div className="relative mb-1">
                     <div className="absolute -inset-2 bg-yellow-600 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity" />
                     <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-200 via-yellow-500 to-amber-700 flex items-center justify-center border-2 border-white/60 shadow-[0_0_15px_rgba(234,179,8,1)] relative z-10 group-hover:scale-110 transition-transform">
                       <span className="text-[10px] font-black text-black leading-none">U</span>
                     </div>
                   </div>
                   <div className="flex flex-col items-center relative z-10">
                     <span className="text-[7px] text-yellow-300/60 uppercase font-black tracking-[0.2em] mb-0.5">Gold Crypto</span>
                     <span className="text-[15px] font-black text-white font-orbitron tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{formatCurrency(userProfile.uCrypto ?? 0)}</span>
                   </div>

                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                 </div>
               </div>
             </>
           ) : (
             <div className="flex flex-col items-center gap-4 py-2">
                <Zap size={20} className="text-cyan-400 animate-pulse cursor-help" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content={`AÇÃO DIÁRIA: ${userProfile.action_points ?? 0}`} />
                <Banknote size={20} className="text-emerald-400 cursor-help" data-tooltip-id="right-sidebar-tooltip" data-tooltip-content={`CASH: $${(userProfile.money ?? 0).toLocaleString()}`} />
                <div 
                  className="w-6 h-6 rounded-full bg-yellow-500 border border-white/50 flex items-center justify-center cursor-help"
                  data-tooltip-id="right-sidebar-tooltip" 
                  data-tooltip-content={`U-CRYPTO: ${(userProfile.uCrypto ?? 0).toLocaleString()}`}
                >
                  <span className="text-[8px] font-black text-black">U</span>
                </div>
             </div>
           )}
        </div>
      </div>

      <Tooltip id="right-sidebar-tooltip" place="left" positionStrategy="fixed" style={{ zIndex: 99999 }} className="!bg-black/95 !backdrop-blur-xl !text-white !rounded-sm !px-3 !py-1.5 !text-[9px] !border !border-white/10 !shadow-2xl font-orbitron uppercase tracking-widest" />

      {/* RENDER ACTIVE MODAL */}
      {activeModal && <StatModal type={activeModal as string} onClose={() => setActiveModal(null)} />}
    </>
  );
};

export default RightPlayerSidebar;
