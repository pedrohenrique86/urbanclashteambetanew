import React, { useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import { getDisplayName } from "../utils/displayNames";
import {
  BoltIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";

// --- Componente de Painel Genérico ---
const DashboardPanel: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}> = ({ title, children, className = "", icon }) => (
  <div
    className={`bg-black/20 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 flex flex-col shadow-lg ${className}`}
    style={{
      boxShadow:
        "inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 0 30px rgba(0, 0, 0, 0.5)",
    }}
  >
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-slate-200 font-orbitron uppercase tracking-wider">
        {title}
      </h2>
      {icon}
    </div>
    <div className="flex-1\">{children}</div>
  </div>
);

// --- Painel de Nível ---
const CircularProgressBar: React.FC<{ progress: number; isGangster: boolean }> = ({ progress, isGangster }) => {
  const size = 100;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const colors = isGangster 
    ? { stop1: "#fb923c", stop2: "#ea580c", shadow: "#f97316" }
    : { stop1: "#60a5fa", stop2: "#2563eb", shadow: "#3b82f6" };

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 7px ${colors.shadow})`,
      }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(0, 0, 0, 0.5)"
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
          style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
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

const LevelPanel = React.memo(({ user }: { user: any }) => {
  const progress = user.xp_needed ? (user.xp / user.xp_needed) * 100 : 0;
  const factionNameStr = typeof user?.faction === 'string' 
    ? user.faction 
    : (user?.faction as any)?.name ?? "GANGSTERS";
  const canonicalFaction = FACTION_ALIAS_MAP_FRONTEND[factionNameStr.toLowerCase().trim()] || "gangsters";
  const isGangster = canonicalFaction === "gangsters";

  return (
    <DashboardPanel
      title="NÍVEL"
      icon={<BoltIcon className={`w-6 h-6 ${isGangster ? "text-orange-400" : "text-blue-400"}`} />}
    >
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around text-center sm:text-left h-full gap-4 p-2">
        <CircularProgressBar progress={progress} isGangster={isGangster} />
        <div className="text-slate-300 space-y-1 text-sm">
          <p>
            <span className="font-bold text-white">
              {user.xp} / {user.xp_needed} XP
            </span>
          </p>
          <p>
            Total:{" "}
            <span className="font-bold text-white">
              {user.total_xp ?? 0} XP
            </span>
          </p>
          <p>
            Progresso:{" "}
            <span className="font-bold text-white">{user.level}</span>
          </p>
        </div>
      </div>
    </DashboardPanel>
  );
});

// --- Painel de Recursos ---
const GreenLineChart: React.FC = () => (
  <svg
    viewBox="0 0 100 40"
    className="w-full h-16"
    style={{ filter: "drop-shadow(0 0 5px #22c55e)" }}
  >
    <defs>
      <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M 0 30 L 10 25 L 20 28 L 30 20 L 40 22 L 50 15 L 60 18 L 70 25 L 80 22 L 90 28 L 100 20"
      stroke="#22c55e"
      strokeWidth="2"
      fill="url(#greenGradient)"
    />
    <circle
      cx="50"
      cy="15"
      r="3"
      fill="#22c55e"
      stroke="black"
      strokeWidth="1"
    />
  </svg>
);

const ResourcesPanel = React.memo(({ user }: { user: any }) => (
  <DashboardPanel
    title="RECURSOS"
    icon={<BanknotesIcon className="w-6 h-6 text-green-400" />}
  >
    <div className="h-full flex flex-col justify-between text-slate-300">
      <div>
        <p className="text-sm">
          Cash:{" "}
          <span className="font-bold text-white">
            $ {(user?.money ?? 0).toLocaleString("pt-BR")}
          </span>
        </p>
        <p className="text-sm">
          Ganhos diários: <span className="font-bold text-white">+$0</span>
        </p>
      </div>
      <GreenLineChart />
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
const OrangeLineChart: React.FC = () => (
  <svg
    viewBox="0 0 100 25"
    className="w-full h-12"
    style={{ filter: "drop-shadow(0 0 4px #f97316)" }}
  >
    <path
      d="M 0 20 L 20 15 L 40 18 L 60 10 L 80 15 L 100 5"
      stroke="#f97316"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

const StatisticsPanel = React.memo(({ user }: { user: any }) => (
  <DashboardPanel
    title="ESTATÍSTICAS"
    icon={<ChartBarIcon className="w-6 h-6 text-cyan-400" />}
  >
    <div className="h-full flex flex-col justify-between text-slate-300 text-sm">
      <div className="grid grid-cols-3 text-center">
        <div>
          <p className="text-slate-400">Vitórias</p>
          <p className="font-bold text-white text-lg">{user.wins ?? 0}</p>
        </div>
        <div>
          <p className="text-slate-400">Derrotas</p>
          <p className="font-bold text-white text-lg">{user.losses ?? 0}</p>
        </div>
        <div>
          <p className="text-slate-400">Sequência</p>
          <p className="font-bold text-white text-lg">{user.streak ?? 0}</p>
        </div>
      </div>
      <div>
        <OrangeLineChart />
        <p className="text-center mt-1">
          Taxa de Vitória: <span className="font-bold text-white">0%</span>
        </p>
      </div>
    </div>
  </DashboardPanel>
));

// --- Painel de Poder de Combate (Power Solo/War) ---
const PowerPanel = React.memo(({ user }: { user: any }) => {
  const atk = user.attack || 0;
  const def = user.defense || 0;
  const foc = user.focus || 0;
  const level = user.level || 1;
  const critChance = user.crit_chance_pct || 0;
  const critMult = user.crit_damage_mult || 0;
  const specialValue = user.intimidation || user.discipline || 0;

  // Cálculos baseados no backend
  const powerSolo = Math.floor(
    atk * 10 + def * 15 + foc * 8 + level * 50 + critChance * 2 + critMult * 10
  );
  const powerWar = Math.floor(powerSolo + specialValue * 10);

  return (
    <DashboardPanel
      title="PODER DE COMBATE"
      icon={<ShieldCheckIcon className="w-6 h-6 text-yellow-400" />}
      className="border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
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
          {/* Tooltip Hover */}
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-zinc-900 border border-zinc-700 text-xs text-slate-300 p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
            <h4 className="font-bold text-white mb-2 border-b border-zinc-700 pb-1">Cálculo Power Solo</h4>
            <ul className="space-y-1 font-mono">
              <li>ATK ({atk}) × 10 = {atk * 10}</li>
              <li>DEF ({def}) × 15 = {def * 15}</li>
              <li>FOC ({foc}) × 8 = {foc * 8}</li>
              <li>CRIT% ({critChance}%) × 2 = {Math.floor(critChance * 2)}</li>
              <li>CRITx ({critMult}x) × 10 = {Math.floor(critMult * 10)}</li>
              <li>NÍVEL ({level}) × 50 = {level * 50}</li>
            </ul>
            <div className="mt-2 text-yellow-400 border-t border-zinc-700 pt-1 font-bold">Total: {powerSolo}</div>
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
          {/* Tooltip Hover */}
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-zinc-900 border border-yellow-500/50 text-xs text-slate-300 p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
            <h4 className="font-bold text-yellow-400 mb-2 border-b border-yellow-500/30 pb-1">Cálculo Power War</h4>
            <p className="mb-2 text-[10px]">O poder verdadeiro revelado apenas no PvP. Utiliza os bônus ocultos de sua facção.</p>
            <ul className="space-y-1 font-mono">
              <li>Power Solo Base: {powerSolo}</li>
              <li>Habilidade ({specialValue}%) × 10 = {Math.floor(specialValue * 10)}</li>
            </ul>
            <div className="mt-2 text-yellow-400 border-t border-yellow-500/30 pt-1 font-bold">Total PVP: {powerWar}</div>
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
    <div className="flex justify-center p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
        <LevelPanel user={userProfile} />
        <PowerPanel user={userProfile} />
        <ResourcesPanel user={userProfile} />
        <FactionPanel user={userProfile} />
        <StatisticsPanel user={userProfile} />
      </div>
    </div>
  );
}