import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player, Clan } from "../types/ranking";
import { useRankingCache } from "../hooks/useRankingCache";
import { useHUD } from "../contexts/HUDContext";
import { 
  Skull, 
  Shield, 
  Users, 
  Target, 
  Zap, 
  ChevronRight,
  ShieldAlert,
  Crosshair,
  Crown,
  Activity,
  Check
} from "lucide-react";

// --- Tactical UI Components ---

const RankBadge = ({ position, isGuard }: { position: number, isGuard: boolean }) => {
  const isTop3 = position <= 3;
  const getRankColor = () => {
    if (position === 1) return "text-yellow-400";
    if (position === 2) return "text-slate-300";
    if (position === 3) return isGuard ? "text-blue-400" : "text-orange-500";
    return "text-zinc-500";
  };

  return (
    <div className={`flex flex-col items-center justify-center w-8 sm:w-12`}>
      {position === 1 && <Crown className="w-3 h-3 text-yellow-400 mb-0.5 animate-bounce" />}
      <span className={`font-orbitron font-black ${isTop3 ? 'text-xl' : 'text-sm'} ${getRankColor()} leading-none`}>
        {String(position).padStart(2, '0')}
      </span>
    </div>
  );
};

const PlayerRankingItem = React.memo(function PlayerRankingItem({ player, config, onSelect }: {
  player: Player;
  config: any;
  onSelect: (id: string) => void;
}) {
  const factionName = player.faction?.toLowerCase() || "";
  const isGuard = factionName.includes("guard") || factionName.includes("polic") || factionName.includes("guarda");
  const FactionIcon = isGuard ? Shield : Skull;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005, backgroundColor: "rgba(255,255,255,0.02)" }}
      onClick={() => onSelect(player.id)}
      className="group relative flex items-center gap-3 sm:gap-6 p-2 sm:p-3 rounded border border-white/10 bg-black/80 cursor-pointer transition-all duration-300 mb-1 shadow-lg"
    >
      {/* Selection Glow Indicator */}
      <div className={`absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b ${config.gradient} opacity-40 group-hover:opacity-100 transition-opacity`} />
      
      {/* Rank */}
      <RankBadge position={player.position || 0} isGuard={isGuard} />

      {/* Profile */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        <div className={`relative w-8 h-8 sm:w-11 sm:h-11 rounded border ${isGuard ? 'border-blue-500/40' : 'border-orange-500/40'} bg-zinc-900 overflow-hidden flex-shrink-0`}>
           {player.avatar_url ? (
             <img src={player.avatar_url} className="w-full h-full object-cover" alt="" />
           ) : (
             <div className="w-full h-full flex items-center justify-center">
               <FactionIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${isGuard ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]'}`} />
             </div>
           )}
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            {player.country && <img src={`https://flagcdn.com/w20/${player.country.toLowerCase()}.png`} className="w-3.5 h-auto opacity-50" alt="" />}
            <span className="text-sm sm:text-base font-orbitron font-bold text-white truncate uppercase tracking-tight">{player.username}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[8px] sm:text-[10px] font-black tracking-[0.2em] ${isGuard ? 'text-blue-400/70' : 'text-orange-500/70'} uppercase leading-none`}>
              ID: {player.id.slice(0, 8)}
            </span>
            <>
              <span className="text-[8px] sm:text-[10px] font-black text-zinc-600 leading-none">|</span>
              <span className={`text-[8px] sm:text-[10px] font-black tracking-[0.3em] ${player.clan_name ? (isGuard ? 'text-blue-400' : 'text-orange-500') : 'text-yellow-400'} uppercase leading-none truncate max-w-[100px] sm:max-w-[200px]`}>
                {player.clan_name || "SOLO"}
              </span>
            </>
          </div>
        </div>
      </div>

      {/* Stats - Standardized horizontal layout */}
      <div className="flex items-center gap-4 sm:gap-16 pr-2">
         <div className="flex flex-col items-center">
            <span className="text-[7px] text-zinc-400 font-black uppercase tracking-widest leading-none mb-1">NVL</span>
            <span className="text-xs sm:text-base font-orbitron font-black text-white leading-none">{player.level}</span>
         </div>
         <div className="hidden sm:flex flex-col items-center w-20">
            <span className="text-[7px] text-zinc-600 font-black uppercase tracking-widest mb-1 text-center">STATUS</span>
            <div className="flex items-center justify-center">
              {player.status === 'Isolamento' ? (
                 <div className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                    <Shield className="w-2 h-2" /> ISOLAMENTO
                 </div>
              ) : player.status === 'Recondicionamento' ? (
                 <div className="flex items-center gap-1 text-[8px] font-black text-yellow-500 uppercase animate-pulse drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">
                    <Activity className="w-2 h-2" /> RECOND
                 </div>
              ) : (
                 <div className="flex items-center gap-1 text-[8px] font-black text-green-500/60 uppercase">
                    <Check className="w-2 h-2" /> OPERACIONAL
                 </div>
              )}
            </div>
         </div>
         <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-700 group-hover:text-white" />
      </div>

      {/* Rank 1-3 Accent */}
      {(player.position || 0) <= 3 && (
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
           <div className={`absolute top-0 right-0 w-[150%] h-[20%] bg-gradient-to-r ${config.gradient} rotate-45 translate-x-[40%] -translate-y-[40%] opacity-10`} />
        </div>
      )}
    </motion.div>
  );
});

const ClanRankingItem = React.memo(function ClanRankingItem({ clan, config }: {
  clan: Clan;
  config: any;
}) {
  const factionName = clan.faction?.toLowerCase() || "";
  const isRenegado = factionName.includes("gangster") || factionName.includes("renegado");
  const FactionIcon = isRenegado ? Crosshair : ShieldAlert;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005, backgroundColor: "rgba(255,255,255,0.02)" }}
      className="group relative flex items-center gap-3 sm:gap-6 p-2 sm:p-3 rounded border border-white/10 bg-black/80 transition-all duration-300 mb-1 shadow-lg"
    >
      <div className={`absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b ${config.gradient} opacity-40 group-hover:opacity-100 transition-opacity`} />
      
      <RankBadge position={clan.position || 0} isGuard={!isRenegado} />

      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded border ${isRenegado ? 'border-orange-500/40' : 'border-blue-500/40'} bg-zinc-900 flex items-center justify-center flex-shrink-0`}>
          <FactionIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${isRenegado ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]'}`} />
        </div>
        
          <div className="flex flex-col min-w-0">
            <span className={`text-sm sm:text-base font-orbitron font-bold ${isRenegado ? 'text-orange-500' : 'text-blue-400'} truncate uppercase tracking-tight`}>{clan.name}</span>
            <span className={`text-[8px] sm:text-[10px] font-black tracking-[0.2em] ${isRenegado ? 'text-orange-500/50' : 'text-blue-500/50'} uppercase`}>
              LÍDER: {clan.leaderName || "RECRUTA"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-16 pr-2">
          <div className="flex flex-col items-center">
            <span className="text-[7px] text-zinc-600 font-black uppercase tracking-widest">PONTOS</span>
            <span className={`text-xs sm:text-base font-orbitron font-black ${config.accent} italic`}>{clan.score}</span>
          </div>
      </div>
    </motion.div>
  );
});

const EmptyRankingItem = ({ position }: { position: number }) => (
  <div className="group relative flex items-center gap-6 p-4 rounded border border-dashed border-white/5 bg-white/[0.01] mb-1 overflow-hidden">
    <div className="w-8 sm:w-12 text-center text-zinc-800 font-orbitron font-black italic text-lg opacity-40">
      {String(position).padStart(2, '0')}
    </div>
    <div className="flex-1 flex flex-col gap-2">
      <div className="h-2 w-32 bg-zinc-900 rounded" />
      <div className="h-1.5 w-24 bg-zinc-900/50 rounded" />
    </div>
    <div className="flex items-center gap-2 grayscale opacity-10">
       <span className="text-[8px] font-black text-zinc-500 tracking-widest uppercase">[ SEM_DADOS_REGISTRADOS ]</span>
       <Zap className="w-3 h-3 text-zinc-500" />
    </div>
    
    {/* Scanning Animation for Empty Slots */}
    <motion.div 
      animate={{ x: ['100%', '-100%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none"
    />
  </div>
);

// --- Main Page ---

export default function RankingPage() {
  const { openUserPanel, openClanPanel } = useHUD();
  const [selectedRanking, setSelectedRanking] = useState(0);
  const { data, loading: isLoading, error } = useRankingCache();

  const rankingData = useMemo(() => {
    const { gangsters, guardas, clans } = data || { gangsters: [], guardas: [], clans: [] };
    return [
      { id: 'renegados', label: "RENEGADOS", icon: Target, gradient: "from-orange-600 to-red-500", accent: "text-orange-500", data: gangsters, type: "player" },
      { id: 'guardioes', label: "GUARDIÕES", icon: Shield, gradient: "from-blue-600 to-cyan-500", accent: "text-blue-400", data: guardas, type: "player" },
      { id: 'divisoes', label: "DIVISÕES", icon: Users, gradient: "from-[#8b5cf6] to-[#6366f1]", accent: "text-purple-400", data: clans, type: "clan" }
    ];
  }, [data]);

  const currentTab = rankingData[selectedRanking];

  return (
    <div className="relative min-h-screen flex flex-col pt-2 sm:pt-6">
      {/* Subtle Aesthetic Background Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-orange-500/5 blur-[120px] rounded-full" />
         <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-2 sm:px-6 pb-24">
        
        {/* ═══════════════════════════════════════════
            UNIFIED RANKING PANEL
        ═══════════════════════════════════════════ */}
        <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden shadow-2xl">

          {/* Tab Navigation */}
          <div className="flex items-center bg-black/40 border-b border-white/5 p-1.5 gap-1.5">
            {rankingData.map((tab, idx) => {
              const Icon = tab.icon;
              const active = selectedRanking === idx;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedRanking(idx)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-orbitron font-black tracking-widest transition-all duration-300 ${
                    active
                      ? `bg-gradient-to-r ${tab.gradient} text-white shadow-[0_0_24px_rgba(255,255,255,0.08)] border border-white/20`
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* System Header Bar */}
          <div className={`flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 border-l-4 transition-all duration-500 ${currentTab.id === 'renegados' ? 'border-l-orange-500 bg-orange-500/5' : 'border-l-blue-500 bg-blue-500/5'}`}>
            <div className="flex items-center gap-3">
              <Zap className={`w-5 h-5 transition-colors duration-500 ${currentTab.id === 'renegados' ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]'} animate-pulse`} />
              <span className="text-sm sm:text-base font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-[0.3em] uppercase">SYSTEM.RANKING.V2</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <span className="hidden sm:inline text-[10px] font-mono text-zinc-500 tracking-[0.15em] uppercase border border-white/10 rounded px-2 py-1 bg-white/5">
                ↻ ATUALIZA A CADA 10 MINUTOS INTEIROS
              </span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.9)] animate-pulse" />
                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest leading-none">LIVE</span>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && <div className="px-4 py-3 border-b border-red-500/20 bg-red-500/5 text-red-400 text-center font-mono text-[10px] uppercase tracking-widest">[ ERROR_{error} ]</div>}

          {/* Ranking List */}
          <div className="p-1.5 sm:p-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col"
              >
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <EmptyRankingItem key={i} position={i + 1} />)
                ) : currentTab.data.length > 0 ? (
                  currentTab.data.map((item: any) => (
                    currentTab.type === 'clan'
                      ? <ClanRankingItem key={item.id} clan={item} config={currentTab} />
                      : <PlayerRankingItem key={item.id} player={item} config={currentTab} onSelect={openUserPanel} />
                  ))
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center opacity-40">
                    <div className="p-4 rounded-full bg-zinc-900/50 border border-white/5 mb-4">
                      <Target className="w-8 h-8 text-zinc-500" />
                    </div>
                    <span className="text-[10px] font-black font-orbitron text-zinc-600 tracking-[0.3em] uppercase">NENHUM_REGISTRO_LOCALIZADO</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Panel Footer */}
          <div className="flex items-center justify-center gap-4 px-4 py-2.5 border-t border-white/5 bg-black/30">
            <span className="sm:hidden text-[8px] font-mono text-zinc-600 uppercase tracking-widest">↻ ATUALIZAÇÃO A CADA 10 MINUTOS INTEIROS</span>
            <div className="hidden sm:flex items-center gap-6 opacity-30">
              <span className="text-[8px] font-mono text-white uppercase tracking-wider">UPDT_FREQ: 10_MIN_INT</span>
              <div className="h-3 w-px bg-white/20" />
              <span className="text-[8px] font-mono text-white uppercase tracking-wider">DATA_SRC: CENTRAL_DB_01</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}