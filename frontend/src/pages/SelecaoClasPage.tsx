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
    border: 'border-cyan-500/40',
    bg: 'bg-black/80',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.1)]',
    button: 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600',
    icon: Shield,
    label: 'CENTRAL_DE_COMANDO // ESTADO_DE_DIREITO'
  },
  gangsters: {
    accent: 'text-orange-500',
    border: 'border-orange-500/40',
    bg: 'bg-black/80',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.1)]',
    button: 'bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-500 hover:to-red-600',
    icon: Skull,
    label: 'SUBMUNDO_RENEGADO // REDE_LIMITR_ZERO'
  },
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
    } catch (err) {
      console.error("Erro ao entrar na divisão:", err);
      setJoinError("FALHA NA CONEXÃO COM A REDE DA DIVISÃO.");
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
    <div className="relative min-h-screen flex flex-col pt-2 pb-32 overflow-x-hidden">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className={`absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b ${factionName === 'guardas' ? 'from-cyan-500/5' : 'from-orange-500/5'} to-transparent`} />
         <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Triple-A Header HUD */}
        <div className="flex flex-col items-center mb-1">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-1"
          >
             <div className="h-px w-6 sm:w-12 bg-zinc-700" />
             <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/80 border border-white/10">
                <Activity className={`w-3 h-3 ${theme.accent} animate-pulse`} />
                <span className="text-[8px] sm:text-[10px] font-black font-orbitron text-zinc-300 tracking-[0.3em] uppercase whitespace-nowrap">
                  {theme.label}
                </span>
             </div>
             <div className="h-px w-6 sm:w-12 bg-zinc-700" />
          </motion.div>

          <motion.h1 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="text-3xl sm:text-6xl font-black font-orbitron text-white text-center leading-none tracking-tighter"
          >
             ESCOLHA SUA <span className={`${theme.accent} drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]`}>DIVISÃO</span>
          </motion.h1>
          
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.2 }}
             className="text-zinc-300 mt-4 text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-center"
          >
             LISTAGEM DE UNIDADES DISPONÍVEIS PARA: <span className="text-white italic">{getDisplayName(factionName)}</span>
          </motion.p>
        </div>

        {/* Messaging Area */}
        <AnimatePresence>
          {(errorClans || joinError) && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-center font-orbitron text-[10px] uppercase tracking-widest"
            >
              [ AVISO_DE_ERRO: {errorClans || joinError} ]
            </motion.div>
          )}
        </AnimatePresence>

        {/* Elite Clan Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {clans && clans.map((clan, index) => {
            const isJoining = joiningClanId === clan.id;
            const isFull = clan.member_count >= (clan.max_members || 40);
            
            return (
              <motion.div
                key={clan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative flex flex-col rounded-2xl border ${theme.border} ${theme.bg} backdrop-blur-md overflow-hidden transition-all duration-500 hover:-translate-y-2 ${theme.glow}`}
              >
                {/* Visual Accent - Top Notch */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.button} opacity-20 group-hover:opacity-100 transition-opacity`} />
                
                {/* Status Badge */}
                <div className={`absolute top-4 right-4 px-2 py-1 rounded text-[8px] font-black font-orbitron tracking-widest ${isFull ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-green-500/20 text-green-500 border border-green-500/30'}`}>
                   {isFull ? 'LOCKDOWN' : 'OPERACIONAL'}
                </div>

                <div className="p-8 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-6">
                     <div className={`w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                        <FactionIcon className={`w-6 h-6 ${theme.accent} drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                     </div>
                     <div className="flex flex-col min-w-0">
                        <h2 className="text-lg sm:text-xl font-black font-orbitron text-white leading-tight uppercase break-words">
                           {clan.name}
                        </h2>
                        <span className="text-[8px] font-black text-zinc-400 tracking-[0.2em] mt-1.5 uppercase leading-none">ID_SYSTEM: {clan.id}</span>
                     </div>
                  </div>

                  <p className="text-zinc-200 text-sm leading-relaxed mb-8 flex-grow font-medium">
                    {clan.description || "Nenhum protocolo descritivo registrado nesta rede de divisão."}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col items-center">
                        <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-1">CAPACIDADE</span>
                        <div className="flex items-center gap-1.5">
                           <Users className="w-3 h-3 text-zinc-300" />
                           <span className="text-xs font-orbitron font-bold text-white">{clan.member_count}/{clan.max_members || 40}</span>
                        </div>
                     </div>
                     <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col items-center">
                        <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-1">SCORE</span>
                        <div className="flex items-center gap-1.5">
                           <Target className={`w-3 h-3 ${theme.accent} drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]`} />
                           <span className={`text-xs font-orbitron font-bold text-white`}>{clan.score || 0}</span>
                        </div>
                     </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => handleJoinClan(clan.id)}
                    disabled={isJoining || joiningClanId !== null || isFull}
                    className={`relative w-full py-4 rounded-xl font-black font-orbitron text-[10px] tracking-[0.3em] uppercase transition-all duration-300 overflow-hidden ${isFull ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed grayscale' : theme.button + ' text-white shadow-lg shadow-black/40'}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                       {isJoining ? (
                         <div className="flex items-center gap-2">
                           <Cpu className="w-3 h-3 animate-spin" />
                           <span>SINCRONIZANDO...</span>
                         </div>
                       ) : isFull ? (
                         <div className="flex items-center gap-2">
                           <Lock className="w-3 h-3 text-red-500" />
                           <span>DIVISÃO_LOTADA</span>
                         </div>
                       ) : (
                         <div className="flex items-center justify-center gap-2 group-hover:gap-4 transition-all">
                           <span>INGRESSAR_NA_DIVISÃO</span>
                           <ChevronRight className="w-3 h-3" />
                         </div>
                       )}
                    </div>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SelecaoClasPage;