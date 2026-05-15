import React, { useState } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useClans } from '../hooks/useClans';
import { apiClient } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserGroupIcon, 
  ViewfinderCircleIcon, 
  ChevronRightIcon, 
  CpuChipIcon, 
  ShieldCheckIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

const SelecaoDivisoesPage: React.FC = () => {
  const { userProfile, setUserProfile } = useUserProfile();
  
  // Forçamos o tema para Violet/Purple conforme pedido
  const theme = {
    accent: 'text-violet-400',
    accentBg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    glow: 'shadow-[0_0_30px_rgba(139,92,246,0.1)]',
    button: 'cyber-button border-violet-500/50 hover:bg-violet-500/20',
    label: 'CENTRAL_DE_COMANDO // QG_TACTICAL_INTERFACE'
  };

  // SÊNIOR: Normalização de tipo para o hook useClans
  const factionName = (userProfile?.faction?.name?.toLowerCase() === 'gangsters' ? 'gangsters' : 'guardas') as 'gangsters' | 'guardas';
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
      setJoinError(err.message || "FALHA NA SINCRONIZAÇÃO COM A DIVISÃO.");
      setJoiningClanId(null);
    }
  };

  if (isLoadingClans) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-white">
        <CpuChipIcon className="w-12 h-12 text-violet-500 animate-spin mb-4" />
        <span className="text-[10px] font-black font-orbitron text-violet-400 tracking-[0.4em] uppercase animate-pulse">
          Sincronizando Banco de Dados de Elite...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-transparent relative text-slate-300 font-sans selection:bg-violet-500/30">
      
      {/* HUD DECORATION (Igual Training) */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-violet-500/10 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-violet-500/50"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-violet-500/50"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-violet-500/50"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-violet-500/50"></div>
      </div>

      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center overflow-hidden border border-violet-500/40 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-violet-500 px-2 py-0.5">
                   <span className="text-[9px] font-black text-black uppercase tracking-tighter">HQ_DEPLOYMENT</span>
                </div>
                <div className="px-3 py-0.5">
                   <span className="text-[10px] font-mono text-violet-400 font-bold tracking-widest uppercase">Select_Your_Elite_Division</span>
                </div>
              </div>
              <div className="h-4 w-px bg-slate-800"></div>
              <span className="text-[10px] font-mono text-violet-400/80 animate-pulse tracking-widest font-bold uppercase">● Uplink_Established</span>
            </div>
            <p className="text-slate-300 text-[10px] font-mono tracking-[0.2em] uppercase bg-white/5 py-1 px-3 border-l-2 border-violet-500/50 w-fit backdrop-blur-sm italic">
              &quot;A FORÇA DA ALCATEIA É O LOBO, E A FORÇA DO LOBO É A ALCATEIA.&quot;
            </p>
          </div>
        </motion.div>
      </header>

      <div className="max-w-7xl mx-auto">
        <AnimatePresence>
          {(errorClans || joinError) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 cyber-card border-red-500/40 bg-red-500/10 text-red-500 flex items-center gap-3"
              style={MILITARY_CLIP}
            >
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="font-orbitron text-[10px] font-black tracking-widest uppercase">[ ERRO_CRÍTICO: {errorClans || joinError} ]</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CLAN GRID */}
        {!clans || clans.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-white/5 military-clip opacity-40">
             <UserGroupIcon className="w-16 h-16 mb-4 text-slate-700" />
             <p className="font-orbitron text-[10px] tracking-[0.2em] uppercase">Nenhuma divisão operacional detectada neste setor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {clans.map((clan, idx) => {
              const isFull = clan.member_count >= (clan.max_members || 40);
              const isJoining = joiningClanId === clan.id;

              return (
                <motion.div
                  key={clan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className={`group relative cyber-card cyber-card-violet transition-all duration-300 hover:bg-white/5 hover:-translate-y-1 h-full flex flex-col`}
                  style={MILITARY_CLIP}
                >
                  {/* Linha de Scan (Igual Training) */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-violet-400 animate-scan"></div>
                  </div>

                  <div className="p-6 flex flex-col h-full">
                    {/* Header do Card */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-violet-500 tracking-[0.3em] font-orbitron uppercase leading-none">Net_ID_{clan.id}</span>
                        <h3 className="text-lg font-orbitron font-black text-white tracking-tighter uppercase group-hover:text-violet-400 transition-colors">
                          {clan.name}
                        </h3>
                      </div>
                      <div className={`p-2 bg-white/5 border border-white/10 ${isFull ? 'text-red-500' : 'text-emerald-500 animate-pulse'}`}>
                        {isFull ? <ShieldCheckIcon className="w-5 h-5 opacity-40" /> : <SparklesIcon className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Descrição */}
                    <div className="mb-6 flex-grow">
                      <p className="text-slate-400 text-xs leading-relaxed italic line-clamp-3">
                        {clan.description || "Protocolos de descrição não definidos para esta divisão de elite."}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="bg-black/40 border border-white/5 p-3 flex flex-col items-center justify-center">
                          <span className="text-[7px] font-black text-slate-500 tracking-widest uppercase mb-1">Efetivo</span>
                          <div className="flex items-center gap-2">
                             <UserGroupIcon className="w-3 h-3 text-violet-400" />
                             <span className="text-xs font-orbitron font-bold text-white tracking-widest">{clan.member_count}/{clan.max_members || 40}</span>
                          </div>
                       </div>
                       <div className="bg-black/40 border border-white/5 p-3 flex flex-col items-center justify-center">
                          <span className="text-[7px] font-black text-slate-500 tracking-widest uppercase mb-1">Status_Score</span>
                          <div className="flex items-center gap-2">
                             <ViewfinderCircleIcon className="w-3 h-3 text-violet-400" />
                             <span className="text-xs font-orbitron font-bold text-white tracking-widest">{clan.score || 0}</span>
                          </div>
                       </div>
                    </div>

                    {/* Botão de Ação */}
                    <button
                      onClick={() => handleJoinClan(clan.id)}
                      disabled={isJoining || joiningClanId !== null || isFull}
                      className={`w-full py-3 cyber-button military-clip border-violet-500/50 text-violet-400 flex items-center justify-center gap-2 group/btn transition-all duration-300 ${isFull ? 'opacity-40 grayscale' : 'hover:bg-violet-500/20 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]'}`}
                    >
                      {isJoining ? (
                        <CpuChipIcon className="w-4 h-4 animate-spin" />
                      ) : isFull ? (
                        <span className="tracking-[0.1em] text-[10px]">LOCKDOWN</span>
                      ) : (
                        <>
                          <span className="tracking-[0.1em] text-[10px]">INGRESSAR</span>
                          <ChevronRightIcon className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Barra lateral roxa (Padrão Training) */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]"></div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="max-w-6xl mx-auto mt-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50 relative z-10 font-mono text-[9px] uppercase tracking-[0.3em]">
        <div className="flex gap-8">
           <div className="flex flex-col"><span className="text-[7px] font-black">Sync_Protocol</span><span className="text-violet-400">VIOLET_NETWORK_v4</span></div>
           <div className="flex flex-col"><span className="text-[7px] font-black">Tactical_Layer</span><span>ELITE_ENCRYPTED</span></div>
        </div>
        <div>UrbanClash Headquarters Selection Interface</div>
      </footer>
    </div>
  );
};

export default SelecaoDivisoesPage;