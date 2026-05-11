import React, { useState } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useClans } from '../hooks/useClans';
import { apiClient } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { getDisplayName } from '../utils/displayNames';
import { FACTION_ALIAS_MAP_FRONTEND } from '../utils/faction';
import { 
  Users, 
  Shield, 
  Target, 
  Cpu, 
  Activity, 
  ChevronRight, 
  Lock,
  Zap,
  Skull
} from 'lucide-react';

const FactionThemes = {
  guardas: {
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    bg: 'bg-slate-950/80',
    glow: 'shadow-[0_0_30px_rgba(34,211,238,0.1)]',
    button: 'bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]',
    icon: Shield,
    label: 'CENTRAL_DE_COMANDO // ESTRUTURA_ESTATAL'
  },
  gangsters: {
    accent: 'text-orange-500',
    accentBg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    bg: 'bg-zinc-950/85',
    glow: 'shadow-[0_0_30px_rgba(249,115,22,0.1)]',
    button: 'bg-orange-600/20 border border-orange-500/50 hover:bg-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]',
    icon: Skull,
    label: 'SUBMUNDO_RENEGADO // REDE_LIMITROFE'
  },
};

const HUDCorner = ({ position, colorClass }: { position: 'tl' | 'tr' | 'bl' | 'br', colorClass: string }) => {
  const corners = {
    tl: "top-0 left-0 border-t-2 border-l-2",
    tr: "top-0 right-0 border-t-2 border-r-2",
    bl: "bottom-0 left-0 border-b-2 border-l-2",
    br: "bottom-0 right-0 border-b-2 border-r-2"
  };
  return <div className={`absolute w-3 h-3 ${corners[position]} ${colorClass} opacity-60`} />;
};


type FactionName = keyof typeof FactionThemes;

const SelecaoClasPage: React.FC = () => {
  const { userProfile, refreshProfile, setUserProfile } = useUserProfile();
  
  const rawFaction = userProfile?.faction as any;
  const rawFactionName = typeof rawFaction === 'string' ? rawFaction : (rawFaction?.name || '');
  const factionName: FactionName = FACTION_ALIAS_MAP_FRONTEND[rawFactionName.toLowerCase().trim()] || 'gangsters';

  const { clans, isLoading: isLoadingClans, error: errorClans } = useClans(factionName);
  const [joiningClanId, setJoiningClanId] = useState<number | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoinClan = async (clanId: number) => {
    if (!userProfile) return;
    setJoiningClanId(clanId);
    setJoinError(null);
    try {
      await apiClient.joinClan(String(clanId));
      setUserProfile({ ...userProfile, clan_id: String(clanId) });
    } catch (err: any) {
      console.error("Erro ao entrar na divisão:", err);
      // Se for um erro conhecido do backend, mostramos a mensagem real
      const errorMsg = err.message || "FALHA NA CONEXÃO COM A REDE DA DIVISÃO.";
      setJoinError(errorMsg.toUpperCase());
      setJoiningClanId(null);
    }
  };

  const theme = FactionThemes[factionName];
  const FactionIcon = theme.icon;

  if (isLoadingClans) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white">
        <Zap className="w-12 h-12 text-zinc-800 animate-pulse mb-4" />
        <span className="text-[10px] font-black font-orbitron text-zinc-600 tracking-[0.4em] uppercase">CARREGANDO_REDES_DE_ELITE</span>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full flex flex-col overflow-hidden bg-black select-none">
      {/* Triple-A Background Layering */}
      <div className="absolute inset-0 pointer-events-none z-0">
         {/* Base Gradient Overlay */}
         <div className={`absolute inset-0 bg-gradient-to-br ${factionName === 'guardas' ? 'from-blue-900/10 via-black to-black' : 'from-orange-950/10 via-black to-black'}`} />
         
         {/* Vignette Effect */}
         <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
         
         {/* Subtle Scanlines */}
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
         
         {/* Floating Glows */}
         <motion.div 
           animate={{ 
             opacity: [0.01, 0.03, 0.01],
             scale: [1, 1.1, 1],
           }}
           transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[10%] left-[20%] w-[800px] h-[800px] bg-white rounded-full blur-[150px]" 
         />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col h-full px-4 sm:px-8 py-6">
        
        {/* Compact Header HUD */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 shrink-0 border-b border-white/10 pb-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
             <span className="text-[10px] font-black font-orbitron text-white/40 tracking-[0.4em] uppercase leading-none mb-1">
                SISTEMA // {theme.label.split(' // ')[1]}
             </span>
             <h1 className="text-2xl sm:text-4xl font-black font-orbitron text-white leading-none tracking-tight">
                DIVISÕES <span className={`${theme.accent}`}>ATIVAS</span>
             </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 text-right self-end sm:self-auto"
          >
             <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-500 tracking-widest uppercase">RECURSOS_DISPONIVEIS</span>
                <span className="text-xs font-black text-white font-orbitron">{getDisplayName(factionName)}</span>
             </div>
             <div className={`w-10 h-10 rounded-sm bg-black/40 border ${theme.border} flex items-center justify-center`}>
                <FactionIcon className={`w-5 h-5 ${theme.accent}`} />
             </div>
          </motion.div>
        </div>

        {/* Messaging Area - Compact */}
        <AnimatePresence>
          {(errorClans || joinError) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-4 p-2 rounded-sm border border-red-500/20 bg-red-500/5 text-red-500 text-center font-orbitron text-[9px] uppercase tracking-widest"
            >
              [ ALERT: {errorClans || joinError} ]
            </motion.div>
          )}
        </AnimatePresence>


        {/* Elite Clan Grid - Scrollable content within fixed frame if needed, but aimed at no-scrollbar */}
        <div className="flex-1 flex items-center justify-center overflow-hidden py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-h-full overflow-y-auto no-scrollbar pb-12 px-2">
            {clans && clans.map((clan, index) => {
              const isJoining = joiningClanId === clan.id;
              const isFull = clan.member_count >= (clan.max_members || 40);
              
              return (
                <motion.div
                  key={clan.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.1, ease: [0.23, 1, 0.32, 1] }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className={`group relative flex flex-col rounded-sm border ${theme.border} ${theme.bg} backdrop-blur-2xl transition-all duration-500 ${theme.glow} h-full`}
                >
                  {/* HUD Elements */}
                  <HUDCorner position="tl" colorClass={theme.accent.replace('text-', 'border-')} />
                  <HUDCorner position="tr" colorClass={theme.accent.replace('text-', 'border-')} />
                  <HUDCorner position="bl" colorClass={theme.accent.replace('text-', 'border-')} />
                  <HUDCorner position="br" colorClass={theme.accent.replace('text-', 'border-')} />

                  {/* Top Scanline Animation */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                     <motion.div 
                        animate={{ top: ['-10%', '110%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        className={`absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-${theme.accent.split('-')[1]}-500/50 to-transparent`}
                     />
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-sm text-[8px] font-black font-orbitron tracking-[0.2em] z-20 ${isFull ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 animate-pulse'}`}>
                     {isFull ? 'LOCKDOWN' : 'OPERACIONAL'}
                  </div>

                  <div className="p-6 flex flex-col h-full relative z-10">
                    <div className="flex items-start justify-between mb-4">
                       <div className="flex flex-col min-w-0">
                          <h2 className="text-lg sm:text-x font-black font-orbitron text-white leading-none uppercase tracking-tighter group-hover:text-white transition-colors truncate">
                             {clan.name}
                          </h2>
                          <span className="text-[8px] font-bold text-zinc-500 tracking-widest mt-1 uppercase">NET_ID_{clan.id.toString().padStart(4, '0')}</span>
                       </div>
                       <div className={`w-10 h-10 shrink-0 rounded-sm bg-black/40 border ${theme.border} flex items-center justify-center`}>
                          <FactionIcon className={`w-5 h-5 ${theme.accent}`} />
                       </div>
                    </div>

                    <div className="flex-grow">
                      <p className="text-zinc-400 text-[11px] leading-relaxed mb-4 line-clamp-2 font-medium">
                        {clan.description || "PROTOCOLOS DE DESCRIÇÃO NÃO ENCONTRADOS."}
                      </p>

                      <div className="flex gap-3 mb-6">
                         <div className="flex-1 px-3 py-2 rounded-sm bg-white/[0.02] border border-white/5 flex flex-col items-center">
                            <span className="text-[6px] font-black text-zinc-500 uppercase tracking-widest mb-1">EFETIVO</span>
                            <div className="flex items-center gap-1.5">
                               <Users className="w-2.5 h-2.5 text-zinc-400" />
                               <span className="text-[10px] font-orbitron font-bold text-white tracking-widest">{clan.member_count}/{clan.max_members || 40}</span>
                            </div>
                         </div>
                         <div className="flex-1 px-3 py-2 rounded-sm bg-white/[0.02] border border-white/5 flex flex-col items-center">
                            <span className="text-[6px] font-black text-zinc-500 uppercase tracking-widest mb-1">SCORE</span>
                            <div className="flex items-center gap-1.5">
                               <Target className={`w-2.5 h-2.5 ${theme.accent}`} />
                               <span className={`text-[10px] font-orbitron font-bold text-white tracking-widest`}>{clan.score || 0}</span>
                            </div>
                         </div>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleJoinClan(clan.id)}
                      disabled={isJoining || joiningClanId !== null || isFull}
                      className={`relative w-full py-3 rounded-sm font-black font-orbitron text-[9px] tracking-[0.4em] uppercase transition-all duration-300 overflow-hidden ${isFull ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' : theme.button + ' text-white'}`}
                    >
                      <div className="flex items-center justify-center gap-2 relative z-10">
                         {isJoining ? (
                           <Cpu className={`w-3 h-3 animate-spin ${theme.accent}`} />
                         ) : isFull ? (
                           <span>LOCKED</span>
                         ) : (
                           <div className="flex items-center gap-2 group-hover:gap-3 transition-all">
                             <span>INGRESSAR</span>
                             <ChevronRight className="w-3 h-3" />
                           </div>
                         )}
                      </div>
                      
                      {!isFull && !isJoining && (
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${theme.accentBg} pointer-events-none`} />
                      )}
                    </button>
                  </div>

                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer HUD decorative element */}
        <div className="mt-4 flex justify-between items-end shrink-0 border-t border-white/5 pt-4">
           <div className="flex flex-col">
              <span className="text-[8px] font-bold text-zinc-600 tracking-[0.2em]">SISTEMA_OPERACIONAL</span>
              <span className="text-[10px] font-black text-white/30 font-orbitron">UC_INTERFACE_V2.0.48</span>
           </div>
           <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                 <span className="text-[8px] font-bold text-zinc-600 tracking-[0.2em]">LATÊNCIA_REDE</span>
                 <span className="text-[10px] font-black text-emerald-500 font-orbitron">12MS // ESTÁVEL</span>
              </div>
              <div className={`w-12 h-1 bg-${factionName === 'guardas' ? 'cyan' : 'orange'}-500/20`}>
                 <motion.div 
                    animate={{ width: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`h-full bg-${factionName === 'guardas' ? 'cyan' : 'orange'}-500`}
                 />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SelecaoClasPage;