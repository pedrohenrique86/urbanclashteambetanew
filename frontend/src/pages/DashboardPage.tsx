import React, { useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import { getDisplayName } from "../utils/displayNames";
import { getFactionRank, getRankIcon } from "../utils/leveling";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";
import {
  BoltIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  TrophyIcon as EmblemIcon,
  AcademicCapIcon as CrownIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { calculateTotalPower } from "../utils/combat";


// --- Componente de Painel Genérico ---

const DashboardPanel: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  background?: React.ReactNode;
}> = ({ title, children, className = "", icon, background }) => (
  <div
    className={`bg-black/20 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 flex flex-col shadow-lg relative overflow-hidden ${className}`}
    style={{
      boxShadow:
        "inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 0 30px rgba(0, 0, 0, 0.5)",
    }}
  >
    {/* Background Chart Layer */}
    {background && (
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        {background}
      </div>
    )}
    
    <div className="relative z-10 flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-slate-200 font-orbitron uppercase tracking-wider">
        {title}
      </h2>
      {icon}
    </div>
    <div className="relative z-10 flex-1">{children}</div>
  </div>
);

// --- Painel de Nível ---
const CircularProgressBar: React.FC<{ progress: number; isGangster: boolean }> = ({ progress, isGangster }) => {
  const size = 120; // Aumentado para dar margem ao brilho e stroke
  const strokeWidth = 10;
  const center = size / 2;
  const radius = 45; // Mantém o tamanho real do círculo consistente
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const colors = isGangster 
    ? { stop1: "#fb923c", stop2: "#ea580c", shadow: "rgba(249, 115, 22, 0.5)" }
    : { stop1: "#60a5fa", stop2: "#2563eb", shadow: "rgba(59, 130, 246, 0.5)" };

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size,
      }}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 overflow-visible"
        style={{ filter: `drop-shadow(0 0 8px ${colors.shadow})` }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(0, 0, 0, 0.4)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#levelGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
        <defs>
          <linearGradient
            id="levelGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={colors.stop1} />
            <stop offset="100%" stopColor={colors.stop2} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const RankBadge = ({ level, isGangster }: { level: number; isGangster: boolean }) => {
  const iconData = getRankIcon(level);
  const colorClass = isGangster ? "text-orange-500" : "text-blue-500";
  const glowClass = isGangster ? "drop-shadow-[0_0_5px_rgba(234,88,12,0.6)]" : "drop-shadow-[0_0_5px_rgba(37,99,235,0.6)]";

  if (iconData.type === 'stars') {
    const count = iconData.count || 0;
    return (
      <div className="flex gap-0.5 mb-1">
        {Array.from({ length: count }).map((_, i) => (
          <StarSolid key={i} className={`w-3 h-3 ${colorClass} ${glowClass}`} />
        ))}
      </div>
    );
  }

  if (iconData.id === 'elite') {
    return <EmblemIcon className={`w-6 h-6 mb-1 ${colorClass} ${glowClass} animate-pulse`} />;
  }

  return (
    <div className="relative mb-1">
      <CrownIcon className={`w-8 h-8 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-bounce`} />
      <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full animate-pulse" />
    </div>
  );
};

const LevelPanel = React.memo(({ user }: { user: any }) => {
  const factionNameStr = typeof user?.faction === 'string' 
    ? user.faction 
    : (user?.faction as any)?.name ?? "GANGSTERS";
  const canonicalFaction = FACTION_ALIAS_MAP_FRONTEND[factionNameStr.toLowerCase().trim()] || "gangsters";
  const isGangster = canonicalFaction === "gangsters";
  
  const currentLevel = user.level || 1;
  const rankName = getFactionRank(currentLevel, canonicalFaction);

  // Lógica de Faixas de Patente para o Progresso
  const thresholds = [1, 51, 151, 301, 501, 701, 901, 1001];
  let currentTierIdx = 0;
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (currentLevel >= thresholds[i] && currentLevel < thresholds[i+1]) {
      currentTierIdx = i;
      break;
    }
  }
  if (currentLevel >= 901) currentTierIdx = 6;

  const startLevel = thresholds[currentTierIdx];
  const endLevel = thresholds[currentTierIdx + 1];
  const nextRankName = getFactionRank(endLevel, canonicalFaction);
  
  // Cálculo do progresso dentro da patente atual
  const progressToNextRank = currentLevel >= 901 
    ? 100 
    : ((currentLevel - startLevel) / (endLevel - startLevel)) * 100;

  return (
    <DashboardPanel
      title="PRESTÍGIO MILITAR"
      icon={<BoltIcon className={`w-6 h-6 ${isGangster ? "text-orange-400" : "text-blue-400"}`} />}
    >
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around text-center sm:text-left h-full gap-6 p-2">
        <CircularProgressBar progress={progressToNextRank} isGangster={isGangster} />
        
        <div className="flex-1 space-y-4">
          {/* Patente Atual */}
          <div>
            <RankBadge level={currentLevel} isGangster={isGangster} />
            <span className={`text-[10px] font-orbitron uppercase tracking-[0.3em] ${isGangster ? 'text-orange-500/60' : 'text-blue-400/60'}`}>
              Patente Atual
            </span>
            <p className={`text-xl sm:text-2xl font-black font-orbitron leading-tight ${isGangster ? 'text-orange-400 drop-shadow-[0_0_12px_rgba(234,88,12,0.5)]' : 'text-blue-400 drop-shadow-[0_0_12px_rgba(37,99,235,0.5)]'}`}>
              {rankName}
            </p>
          </div>

          {/* Próxima Patente (se não for a última) */}
          {currentLevel < 901 && (
            <div className="pt-2 border-t border-white/5">
              <span className="text-[9px] font-orbitron uppercase tracking-widest text-slate-500">
                Objetivo: Próxima Promoção
              </span>
              <p className="text-sm font-bold text-slate-300 font-orbitron opacity-80">
                {nextRankName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${isGangster ? 'bg-orange-500' : 'bg-blue-500'}`}
                    style={{ width: `${progressToNextRank}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-500">{Math.floor(progressToNextRank)}%</span>
              </div>
            </div>
          )}

          {currentLevel >= 901 && (
            <div className="pt-2 border-t border-white/5">
              <span className="text-[10px] font-orbitron text-yellow-500 animate-pulse uppercase tracking-[0.2em]">
                ● NÍVEL MÁXIMO ALCANÇADO
              </span>
            </div>
          )}
        </div>
      </div>
    </DashboardPanel>
  );
});

// --- Painel de Recursos ---
const GreenLineChart: React.FC<{ gain: number }> = ({ gain }) => {
  const trend = gain > 0 ? 0.8 : 0.2;
  const points = [
    { x: 0, y: 100 },
    { x: 25, y: 80 - trend * 10 },
    { x: 50, y: 85 - trend * 30 },
    { x: 75, y: 60 - trend * 40 },
    { x: 100, y: 90 - trend * 60 }
  ];
  
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="greenGradientFull" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L 100 100 L 0 100 Z`}
        fill="url(#greenGradientFull)"
        className="transition-all duration-1000"
      />
      <path
        d={d}
        stroke="#22c55e"
        strokeWidth="1"
        fill="none"
        className="transition-all duration-1000"
      />
    </svg>
  );
};

const ResourcesPanel = React.memo(({ user }: { user: any }) => (
  <DashboardPanel
    title="RECURSOS"
    icon={<BanknotesIcon className="w-6 h-6 text-green-400" />}
    background={<GreenLineChart gain={user.money_daily_gain || 0} />}
  >
    <div className="h-full flex flex-col justify-center text-slate-300 py-4">
      <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Total Disponível</p>
      <p className="text-4xl font-black text-white font-orbitron">
        $ {(user?.money ?? 0).toLocaleString("pt-BR")}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <div className="px-2 py-1 bg-green-500/20 rounded border border-green-500/30 text-[10px] font-bold text-green-400">
          +${(user?.money_daily_gain ?? 0).toLocaleString("pt-BR")} / DIA
        </div>
      </div>
    </div>
  </DashboardPanel>
));

// --- Painel de Facção ---
const FactionPanel = React.memo(({ user }: { user: any }) => {
  const factionNameStr = typeof user?.faction === 'string' 
    ? user.faction 
    : (user?.faction as any)?.name ?? "GANGSTERS";
  const canonicalFaction = FACTION_ALIAS_MAP_FRONTEND[factionNameStr.toLowerCase().trim()] || "gangsters";
  const isGangster = canonicalFaction === "gangsters";
    
  const factionData = isGangster
    ? {
        skill: "Intimidação",
        value: user.intimidation || 0,
        description: "Reduz a defesa do oponente",
        theme: "text-orange-400",
        shadow: "#f97316"
      }
    : {
        skill: "Disciplina",
        value: user.discipline || 0,
        description: "Reduz o dano crítico recebido",
        theme: "text-blue-400",
        shadow: "#3b82f6"
      };
    
    return (
      <DashboardPanel
        title="FACÇÃO"
        icon={<ShieldCheckIcon className={`w-6 h-6 ${factionData.theme}`} />}
      >
        <div className="h-full flex flex-col justify-center items-center text-center text-slate-300">
          <h3
            className={`text-2xl font-orbitron uppercase ${factionData.theme}`}
            style={{ textShadow: `0 0 5px ${factionData.shadow}` }}
          >
            {getDisplayName(factionNameStr).toUpperCase()}
          </h3>
          <p className="text-sm mt-2">
            Habilidade Especial:{" "}
            <span className="font-bold text-white">{factionData.skill}</span>
          </p>
          <p className="text-xs">
            Valor: <span className="font-bold text-white">{factionData.value.toFixed(1)}%</span>
          </p>
          <p className="text-xs">{factionData.description}</p>
        </div>
      </DashboardPanel>
    );
});

// --- Painel de Estatísticas ---
const OrangeLineChart: React.FC<{ victories: number; defeats: number }> = ({ victories, defeats }) => {
  const total = victories + defeats || 1;
  const winRate = victories / total;
  
  const points = [
    { x: 0, y: 100 },
    { x: 20, y: 90 - winRate * 20 },
    { x: 40, y: 95 - winRate * 40 },
    { x: 60, y: 70 - winRate * 30 },
    { x: 80, y: 80 - winRate * 50 },
    { x: 100, y: 100 - winRate * 60 }
  ];
  
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="orangeGradientFull" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L 100 100 L 0 100 Z`}
        fill="url(#orangeGradientFull)"
        className="transition-all duration-1000"
      />
      <path
        d={d}
        stroke="#f97316"
        strokeWidth="1"
        fill="none"
        className="transition-all duration-1000"
      />
    </svg>
  );
};

const StatisticsPanel = React.memo(({ user }: { user: any }) => {
  const winRate =
    (user?.victories ?? 0) + (user?.defeats ?? 0) > 0
      ? Math.round(
          ((user?.victories ?? 0) /
            ((user?.victories ?? 0) + (user?.defeats ?? 0))) *
            100,
        )
      : 0;

  return (
    <DashboardPanel
      title="ESTATÍSTICAS"
      icon={<ChartBarIcon className="w-6 h-6 text-cyan-400" />}
    >
      <div className="h-full flex flex-col justify-between text-slate-300 py-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/30 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
            <p className="text-slate-400 text-[9px] uppercase tracking-wider mb-1">Vitórias</p>
            <p className="font-black text-green-400 text-xl font-orbitron">{user.victories ?? 0}</p>
          </div>
          <div className="bg-black/30 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
            <p className="text-slate-400 text-[9px] uppercase tracking-wider mb-1">Derrotas</p>
            <p className="font-black text-red-500 text-xl font-orbitron">{user.defeats ?? 0}</p>
          </div>
          <div className="bg-black/30 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
            <p className="text-slate-400 text-[9px] uppercase tracking-wider mb-1">Streak</p>
            <p className="font-black text-yellow-400 text-xl font-orbitron">x{user.winning_streak ?? 0}</p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="font-orbitron">
             <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Taxa de Eficiência</p>
             <p className={`text-2xl font-black ${winRate >= 50 ? 'text-green-400' : 'text-orange-500'}`}>{winRate}%</p>
          </div>
          <div className="text-right">
             <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${winRate >= 50 ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
               {winRate >= 50 ? 'OPERAÇÃO OK' : 'CRÍTICO'}
             </div>
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
});

// --- Painel de Poder de Combate (Power Solo/War) ---
const PowerPanel = React.memo(({ user }: { user: any }) => {
  const { powerSolo, powerWar } = calculateTotalPower(user, user.active_chips || []);
  const specialValue = user.intimidation || user.discipline || 0;

  return (
    <DashboardPanel
      title="PODER DE COMBATE"
      icon={<ShieldCheckIcon className="w-6 h-6 text-yellow-400" />}
      className="border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)] relative z-10 hover:z-50"
    >
      <div className="flex flex-col justify-around h-full p-2 space-y-4">
        {/* Power Solo */}
        <div className="relative group flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Power Solo</p>
            <p className="text-2xl font-orbitron font-black text-white">{powerSolo.toLocaleString()}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 cursor-help">
            ?
          </div>
          {/* Tooltip Hover - Simplificado e centralizado */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 text-[11px] text-slate-300 p-3 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none">
            <p className="font-bold text-white border-b border-zinc-700 pb-1 mb-2 text-center uppercase tracking-tighter">Fórmula Power Solo</p>
            <p className="text-center leading-relaxed text-[10px]">
              (ATK + ARMA + DEF + ESCUDO + FOC×0.5)<br/>
              + (NVL×2) + (CRIT%×0.2 + CRITx)<br/>
              <span className="text-emerald-400">× BÔNUS DE CHIPS</span>
            </p>
            <div className="mt-2 text-yellow-400 font-black text-center text-sm border-t border-zinc-800 pt-1">Total: {powerSolo}</div>
          </div>
        </div>

        {/* Power War */}
        <div className="relative group flex justify-between items-center bg-black/40 p-3 rounded-xl border border-yellow-500/20">
          <div>
            <p className="text-xs text-yellow-500/80 uppercase tracking-widest font-bold">Power War</p>
            <p className="text-2xl font-orbitron font-black text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">{powerWar.toLocaleString()}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 cursor-help">
            ?
          </div>
          {/* Tooltip Hover - Simplificado e centralizado */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-zinc-900/95 backdrop-blur-md border border-yellow-500/30 text-[11px] text-slate-300 p-3 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none">
            <p className="font-bold text-yellow-400 border-b border-yellow-500/20 pb-1 mb-2 text-center">Fórmula Power War</p>
            <p className="text-center leading-relaxed">Power Solo + Bônus de Facção ({specialValue}%)</p>
            <div className="mt-2 text-yellow-400 font-black text-center text-sm text-shadow-glow border-t border-yellow-500/10 pt-1">Total War: {powerWar}</div>
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
});

// --- Página Principal do Dashboard ---
export default function DashboardPage() {
  const { userProfile } = useUserProfile();

  if (!userProfile || !userProfile.faction) {
    // Enquanto o perfil está carregando ou incompleto, não fazemos nada.
    // O spinner global continuará visível, cobrindo a tela.
    return null;
  }

  return (
    <div className="flex justify-center p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl">
        <LevelPanel user={userProfile} />
        <PowerPanel user={userProfile} />
        <ResourcesPanel user={userProfile} />
        <FactionPanel user={userProfile} />
        <StatisticsPanel user={userProfile} />
      </div>
    </div>
  );
}