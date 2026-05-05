import React, { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { useNavigate } from "react-router-dom";
import { combatService, RadarTarget, PreCombatInfo, CombatResult } from "../services/combatService";
import { useUserProfile } from "../hooks/useUserProfile";
import { useToast } from "../contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldExclamationIcon, 
  BoltIcon, 
  UserCircleIcon, 
  ExclamationTriangleIcon,
  FingerPrintIcon,
  CpuChipIcon,
  StarIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon,
  FireIcon,
  HeartIcon
} from "@heroicons/react/24/outline";
import NPCCountdown from "../components/combat/NPCCountdown";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";
import VisualBattler from "../components/VisualBattler";
import { calculateCombatStats, calculateTotalPower } from "../utils/combat";

// HUD Corners e utilitários já estão no index.css via classes .military-clip, etc.
// Mas mantemos o objeto para compatibilidade com framer-motion se necessário
const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

const BattleRulesInfo = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all text-slate-400 hover:text-cyan-400 group"
        style={MILITARY_CLIP}
      >
        <QuestionMarkCircleIcon className="w-4 h-4 group-hover:animate-pulse" />
        <span className="text-[10px] font-mono font-black uppercase tracking-wider">Como Funciona?</span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              className="fixed top-1/2 left-1/2 w-[90%] max-w-lg bg-slate-900 border border-slate-700 p-6 md:p-8 z-[1001] shadow-2xl overflow-y-auto max-h-[80vh]"
              style={MILITARY_CLIP}
            >
              <h3 className="font-orbitron font-black text-cyan-400 uppercase text-sm mb-4 flex items-center gap-2 border-b border-cyan-500/20 pb-2">
                <InformationCircleIcon className="w-5 h-5" />
                Matriz de Combate (Power Clash)
              </h3>
              <div className="space-y-4 font-mono text-[10px] leading-relaxed text-slate-400">
                <p>O combate Spectro agora é <span className="text-yellow-500 font-black">INSTANTÂNEO</span> baseado em <span className="text-white">POWER LEVEL</span>:</p>
                <div className="bg-black/40 p-3 border border-cyan-500/20 rounded">
                  <p className="text-cyan-400 font-bold mb-1">Fórmula de Poder:</p>
                  <p>(Ataque × 1.25) + (Defesa × 1.10) + (Foco × 0.90)</p>
                </div>
                <ul className="space-y-2 list-disc list-inside">
                  <li><span className="text-white uppercase">Chips Táticos:</span> Bônus ativos de Chips Diários são aplicados multiplicativamente.</li>
                  <li><span className="text-white uppercase">Fator Sorte:</span> Uma variância de +/- 15% simula o caos das ruas (The Crims Style).</li>
                  <li><span className="text-white uppercase">Veredito:</span> O sinal com maior poder residual após a variância vence o confronto.</li>
                </ul>
                <p className="border-t border-white/5 pt-2 italic text-slate-500 text-[8px]">Nota: O Poder da Dashboard (Power Solo) usa pesos diferentes para o ranking global.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="mt-6 w-full py-2 bg-slate-900 border border-slate-800 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                style={MILITARY_CLIP}
              >
                Entendido
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const RefreshTimer = ({ targets }: { targets: any }) => {
  const [seconds, setSeconds] = useState(20);
  
  useEffect(() => {
    setSeconds(20);
    const interval = setInterval(() => {
      setSeconds(s => (s > 0 ? s - 1 : 20));
    }, 1000);
    return () => clearInterval(interval);
  }, [targets]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-900/20 border border-cyan-500/30 backdrop-blur-sm" style={MILITARY_CLIP}>
      <div className="relative w-3 h-3">
        <ClockIcon className="absolute inset-0 w-3 h-3 text-cyan-500" />
        <motion.div 
          className="absolute inset-0 border border-cyan-500 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-tighter">
        Atualização: <span className="text-white">{seconds}s</span>
      </span>
    </div>
  );
};

export default function ReckoningPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const playerStats = calculateCombatStats(userProfile);
  const { powerSolo: playerPower } = calculateTotalPower(userProfile || {}, userProfile?.active_chips || []);

  const playerLevel = userProfile?.level || 1;
  const { data: targets, mutate } = useSWR(
    playerLevel >= 10 ? "/combat/radar" : null, 
    combatService.getRadarTokens,
    { revalidateOnFocus: false, refreshInterval: 20000 }
  );
  
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);
  const [preCalc, setPreCalc] = useState<PreCombatInfo | null>(null);
  const [loadingPreCalc, setLoadingPreCalc] = useState(false);
  const [combatPhase, setCombatPhase] = useState<"radar" | "precalc" | "fighting">("radar");
  const [finalResult, setFinalResult] = useState<CombatResult | null>(null);

  const closeResult = useCallback(() => {
    setCombatPhase("radar");
    setSelectedTarget(null);
    setPreCalc(null);
    mutate();
  }, [mutate]);

  const handleSelectTarget = async (target: RadarTarget) => {
    const currentPA = userProfile?.action_points || 0;
    const currentEN = userProfile?.energy || 0;

    if (currentPA < 150) {
      showToast("PONTOS DE AÇÃO INSUFICIENTES (REQUER 150 PA)", "warning");
      return;
    }
    if (currentEN < 10) {
      showToast("ENERGIA INSUFICIENTE (REQUER 10%)", "warning");
      return;
    }
    setSelectedTarget(target);
    setLoadingPreCalc(true);
    try {
      const info = await combatService.getPreCalc(target.id);
      setPreCalc(info);
      setCombatPhase("precalc");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro de conexão", "error");
    } finally {
      setLoadingPreCalc(false);
    }
  };

  const cancelCombat = () => {
    setSelectedTarget(null);
    setPreCalc(null);
    setCombatPhase("radar");
  };

  const handleAttack = async (tactic: string = 'technological') => {
    if (!selectedTarget) return;
    setFinalResult(null); 
    try {
      setCombatPhase("fighting");
      const result = await combatService.attack(selectedTarget.id, tactic);
      setFinalResult({ ...result, winner: result.outcome.startsWith("win"), timestamp: Date.now() });
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao iniciar combate", "error");
      cancelCombat();
    }
  };

  const handleCombatComplete = useCallback(async () => {
    await refreshProfile();
    const outcome = finalResult?.outcome;
    const isCriticalFailure = outcome === "loss_ko" || outcome === "draw_dko";
    
    if (finalResult?.winner || outcome === "draw_flee" || outcome === "loss_bleeding") {
      closeResult();
    } else if (isCriticalFailure) {
      navigate("/recovery-base");
    } else {
      closeResult();
    }
  }, [refreshProfile, finalResult, closeResult, navigate]);

  if (userProfile?.status === "Recondicionamento") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ExclamationTriangleIcon className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-orbitron font-black text-white uppercase tracking-widest mb-4">SISTEMA COMPROMETIDO</h1>
        <p className="text-slate-500 font-mono text-sm max-w-md">Unidade em recondicionamento forçado. Aguarde a sincronização total dos núcleos.</p>
        <button onClick={() => navigate("/recovery-base")} className="mt-8 px-8 py-3 bg-red-600/20 border border-red-600 text-red-500 font-black uppercase text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all" style={MILITARY_CLIP}>Ir para Base de Recuperação</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-transparent relative text-slate-300 font-sans selection:bg-yellow-500/30">
      
      {/* HUD DECORATION - CORNERS */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-yellow-500/10 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-yellow-500/50"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-yellow-500/50"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-yellow-500/50"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-yellow-500/50"></div>
      </div>

      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(234,179,8,0.7), -2px 0px 0px rgba(139,92,246,0.7)" }}>
            Spectro <span className="text-yellow-500">Reckoning</span>
          </h1>
          
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mt-4">
              <div className="flex items-center gap-4">
                {/* Badge SEC LEVEL Estilizado */}
                <div className="flex items-center overflow-hidden border border-yellow-500/40 bg-black/60" style={MILITARY_CLIP}>
                  <div className="bg-yellow-500 px-2 py-0.5">
                    <span className="text-[9px] font-black text-black uppercase">OP_LEVEL</span>
                  </div>
                  <div className="px-3 py-0.5">
                    <span className="text-[10px] font-mono text-yellow-500 font-bold tracking-widest">TACTICAL_STRIKE_AUTH</span>
                  </div>
                </div>

                <div className="h-4 w-px bg-slate-800"></div>

                <span className="text-[10px] font-mono text-yellow-500/80 animate-pulse tracking-widest font-bold uppercase">● Combat_Matrix_Active</span>
                
                <BattleRulesInfo />
              </div>

              <div className="flex items-center gap-3">
                <RefreshTimer targets={targets} />
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  <div className="w-1 h-1 bg-cyan-500 animate-ping" />
                  Auto-Sync_Enabled
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center mt-6">
              <div className="hidden lg:flex items-center gap-2">
                {userProfile?.active_chips?.map((chip: any, i: number) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded" title={chip.name}>
                    <CpuChipIcon className="w-3 h-3 text-cyan-400" />
                    <span className="text-[8px] font-black font-mono text-cyan-400 uppercase">{chip.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>

              <div className="bg-black/40 backdrop-blur-md border border-orange-500/30 p-3 flex items-center gap-3" style={MILITARY_CLIP}>
                <FireIcon className="w-6 h-6 text-orange-500" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">POWER_LVL</span>
                  <span className="text-lg font-black font-orbitron text-orange-400">{playerPower.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="bg-black/40 backdrop-blur-md border border-emerald-500/30 p-3 flex items-center gap-3" style={MILITARY_CLIP}>
                <FingerPrintIcon className="w-6 h-6 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">ACTION_PTS</span>
                  <span className="text-lg font-black font-orbitron text-emerald-400">{userProfile?.action_points?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* SYNCHRONIZATION NOTICE */}
              <div className="bg-cyan-500/10 border-2 border-cyan-500/40 p-4 px-6 flex items-center gap-6 relative overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.1)] group transition-all duration-300 hover:bg-cyan-500/20" style={MILITARY_CLIP}>
                <div className="absolute inset-0 bg-tactical-grid opacity-30 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
                <div className="absolute left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-scan pointer-events-none" />
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500 shadow-[5px_0_15px_rgba(34,211,238,0.5)]" />
                <div className="absolute top-1 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-500/40" />
                <div className="absolute top-1 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-500/40" />
                <div className="absolute bottom-1 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-500/40" />
                <div className="absolute bottom-1 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-500/40" />

                <div className="relative z-10 flex-shrink-0 p-3 bg-black/60 border border-cyan-500/30 rounded-sm">
                  <InformationCircleIcon className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                </div>

                <div className="relative z-10">
                  <span className="text-[10px] font-orbitron text-cyan-400 uppercase font-black tracking-[0.4em] flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]" />
                    Protocolo de Sincronização
                  </span>
                  <p className="text-xs font-mono text-slate-100 uppercase leading-relaxed tracking-wider max-w-md">
                    Grade de alvos em constante mutação. O radar realiza uma <span className="text-cyan-400 font-black underline underline-offset-4 decoration-cyan-500/50">nova varredura</span> automaticamente a cada <span className="text-white font-black bg-cyan-500/20 px-1">20 segundos</span>.
                  </p>
                </div>
              </div>
              
              {/* ENGAGEMENT COSTS NOTICE */}
              <div className="bg-red-500/10 border-2 border-red-500/40 p-4 px-6 flex items-center gap-6 relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.1)] group transition-all duration-300 hover:bg-red-500/20" style={MILITARY_CLIP}>
                <div className="absolute inset-0 bg-tactical-grid opacity-20 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-transparent pointer-events-none" />
                <div className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-scan pointer-events-none" />
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 shadow-[5px_0_15px_rgba(239,68,68,0.5)]" />
                <div className="absolute top-1 left-2 w-3 h-3 border-t-2 border-l-2 border-red-500/40" />
                <div className="absolute top-1 right-2 w-3 h-3 border-t-2 border-r-2 border-red-500/40" />
                <div className="absolute bottom-1 left-2 w-3 h-3 border-b-2 border-l-2 border-red-500/40" />
                <div className="absolute bottom-1 right-2 w-3 h-3 border-b-2 border-r-2 border-red-500/40" />

                <div className="relative z-10 flex-shrink-0 p-3 bg-black/60 border border-red-500/30 rounded-sm">
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                </div>

                <div className="relative z-10 flex-1">
                  <span className="text-[10px] font-orbitron text-red-500 uppercase font-black tracking-[0.4em] flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]" />
                    Requisitos de Engajamento
                  </span>
                  <div className="flex flex-col md:flex-row gap-6 mt-1">
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-sm">
                          <FingerPrintIcon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-mono text-slate-500 uppercase">Custo PA</span>
                          <span className="text-sm font-orbitron font-black text-emerald-400 tracking-tighter italic">150 PONTOS</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-sm">
                          <BoltIcon className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-mono text-slate-500 uppercase">Energia</span>
                          <span className="text-sm font-orbitron font-black text-yellow-400 tracking-tighter italic">10% UNIDADE</span>
                        </div>
                      </div>
                    </div>
                    <div className="md:ml-auto md:text-right flex flex-col justify-center border-l-2 md:border-l-0 md:border-r-2 border-red-500/30 pl-4 md:pl-0 md:pr-4">
                      <span className="text-[8px] font-mono text-red-500 font-bold uppercase tracking-widest leading-none mb-1">Atenção_Operacional</span>
                      <span className="text-[9px] font-mono text-slate-400 uppercase leading-none">Consumo obrigatório</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </header>

      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {combatPhase === "radar" && (
            <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {targets?.map((tgt) => {
                   const estPower = (tgt.level * 6); 
                   const isRisky = estPower > (playerPower * 1.15);
                   
                   return (
                    <div 
                      key={tgt.id}
                      onClick={() => !loadingPreCalc && handleSelectTarget(tgt)}
                      className="cursor-pointer group relative bg-black/40 backdrop-blur-md border border-white/5 hover:border-yellow-500/30 transition-all duration-500 p-5 overflow-hidden shadow-2xl"
                      style={MILITARY_CLIP}
                    >
                      {/* Background scanning effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 via-yellow-500/0 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                      <div className="relative z-10 flex items-center gap-3">
                         <div className="w-12 h-12 bg-black/60 border border-white/10 group-hover:border-yellow-500/40 flex items-center justify-center text-slate-600 group-hover:text-yellow-500 transition-all duration-300 transform group-hover:scale-105">
                           <UserCircleIcon className="w-8 h-8" />
                         </div>
                         <div className="min-w-0 flex-1">
                           <p className="text-[9px] uppercase font-mono text-yellow-500/60 font-black tracking-[0.2em]">{tgt.is_npc ? 'SYNC_BOT' : 'PLAYER_SIGNAL'}</p>
                           <h3 className="font-orbitron font-black text-sm text-white truncate tracking-wider group-hover:text-yellow-400 transition-colors">{tgt.name}</h3>
                         </div>
                      </div>

                      <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
                         <div className="bg-white/5 border border-white/5 p-2 text-center group-hover:bg-white/10 transition-colors">
                            <span className="block text-[8px] text-slate-500 uppercase font-bold tracking-widest mb-1">LVL_RANK</span>
                            <span className="text-xl font-black text-white font-orbitron italic">{tgt.level}</span>
                         </div>
                         <div className="bg-white/5 border border-white/5 p-2 text-center group-hover:bg-white/10 transition-colors">
                            <span className="block text-[8px] text-slate-500 uppercase font-bold tracking-widest mb-1">EST_POWER</span>
                            <span className={`text-xl font-black font-orbitron italic ${isRisky ? 'text-red-500' : 'text-emerald-500'}`}>~{estPower.toLocaleString()}</span>
                         </div>
                      </div>

                      <div className="relative z-10 mt-4 flex items-center justify-between">
                        <div className="flex gap-1">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className={`w-1 h-3 ${isRisky ? 'bg-red-500/20' : 'bg-emerald-500/20'} group-hover:bg-yellow-500/40 transition-colors`} />
                          ))}
                        </div>
                        <span className="text-[8px] font-mono text-white/20 uppercase font-black group-hover:text-yellow-500/60 transition-colors">Intercept_Protocol_v4</span>
                      </div>

                      {/* Decorative side bar for the card */}
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-yellow-500/20 group-hover:bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0)] group-hover:shadow-[0_0_15px_rgba(234,179,8,0.6)] transition-all duration-300"></div>

                      {isRisky && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-500/20 px-2 py-0.5 border border-red-500/30">
                          <ExclamationTriangleIcon className="w-3 h-3 text-red-500 animate-pulse" />
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">ALTO RISCO</span>
                        </div>
                      )}
                      
                      {!isRisky && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <BoltIcon className="w-3 h-3 text-emerald-500" />
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">ALVO ÓTIMO</span>
                        </div>
                      )}
                    </div>
                   );
                 })}
               </div>
            </motion.div>
          )}

          {combatPhase === "precalc" && preCalc && (
            <motion.div key="precalc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
              <div className="bg-black/80 border border-slate-800 p-8" style={MILITARY_CLIP}>
                <h2 className="font-orbitron font-black text-2xl text-white uppercase mb-4 flex items-center gap-3">
                   <CpuChipIcon className="w-8 h-8 text-cyan-400" /> Protocolo de Engajamento
                </h2>
                <p className="bg-slate-900 p-4 border-l-2 border-cyan-400 text-cyan-100 font-mono italic mb-8">&ldquo;{preCalc.spectroHint}&rdquo;</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <button 
                    onClick={() => handleAttack('brutal')}
                    className="flex flex-col items-center gap-3 p-4 bg-red-600/10 border border-red-600/30 hover:bg-red-600/30 transition-all group"
                    style={MILITARY_CLIP}
                  >
                    <FireIcon className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
                    <div className="text-center">
                      <span className="block text-xs font-black text-white uppercase">Assalto Brutal</span>
                      <span className="block text-[8px] text-red-400/70 font-mono mt-1">ATK x1.4 | RISCO ALTO</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleAttack('defensive')}
                    className="flex flex-col items-center gap-3 p-4 bg-emerald-600/10 border border-emerald-600/30 hover:bg-emerald-600/30 transition-all group"
                    style={MILITARY_CLIP}
                  >
                    <ShieldExclamationIcon className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <div className="text-center">
                      <span className="block text-xs font-black text-white uppercase">Postura Defensiva</span>
                      <span className="block text-[8px] text-emerald-400/70 font-mono mt-1">DEF x1.5 | RISCO BAIXO</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleAttack('technological')}
                    className="flex flex-col items-center gap-3 p-4 bg-cyan-600/10 border border-cyan-600/30 hover:bg-cyan-600/30 transition-all group"
                    style={MILITARY_CLIP}
                  >
                    <CpuChipIcon className="w-8 h-8 text-cyan-500 group-hover:scale-110 transition-transform" />
                    <div className="text-center">
                      <span className="block text-xs font-black text-white uppercase">Infiltração Hacker</span>
                      <span className="block text-[8px] text-cyan-400/70 font-mono mt-1">FOC x1.4 | ESTRATÉGICO</span>
                    </div>
                  </button>
                </div>

                <div className="flex justify-center border-t border-white/5 pt-6">
                  <button onClick={cancelCombat} className="px-10 py-2 bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">Abortar Operação</button>
                </div>
              </div>
            </motion.div>
          )}

          {combatPhase === "fighting" && !finalResult && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin" />
              <p className="text-red-500 font-black font-orbitron animate-pulse uppercase tracking-[0.3em]">Inicializando Protocolo de Ataque...</p>
            </div>
          )}

          {combatPhase === "fighting" && finalResult?.details?.turns && preCalc && (
            <motion.div key="combat_hub" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto">
              <div className="bg-black/90 border-2 border-red-500/30 p-6 md:p-10 relative overflow-hidden" style={MILITARY_CLIP}>
                <div className="flex justify-between items-center mb-8 relative z-10 border-b border-white/5 pb-6">
                   <div>
                      <span className="text-[10px] font-mono text-red-500 block">OPERADOR</span>
                      <h4 className="text-xl font-black text-white uppercase">{userProfile?.username}</h4>
                   </div>
                   <div className="text-center font-black font-orbitron animate-pulse text-red-500">VS</div>
                   <div className="text-right">
                      <span className="text-[10px] font-mono text-red-500 block">ALVO</span>
                      <h4 className="text-xl font-black text-red-500 uppercase">{selectedTarget?.name}</h4>
                   </div>
                </div>

                <VisualBattler 
                  key={finalResult.timestamp}
                  player={{ name: userProfile?.username || 'Player', level: userProfile?.level || 1, hp: preCalc.playerInfo.hp, maxHP: preCalc.playerInfo.maxHP }}
                  target={{ name: selectedTarget?.name || 'Target', level: selectedTarget?.level || 1, hp: preCalc.targetInfo.maxHP, maxHP: preCalc.targetInfo.maxHP }}
                  turns={finalResult.details.turns}
                  logs={finalResult.log}
                  onComplete={handleCombatComplete}
                  outcome={finalResult.outcome}
                  loot={finalResult.loot}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all relative z-10">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
             <span className="text-[8px] font-black tracking-widest uppercase">Encryption</span>
             <span className="text-[10px] font-mono">AES-256_ACTIVE</span>
          </div>
          <div className="flex flex-col">
             <span className="text-[8px] font-black tracking-widest uppercase">Coordinates</span>
             <span className="text-[10px] font-mono">34.0522° N, 118.2437° W</span>
          </div>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.5em]">
          UrbanClash Tactical Interface v4.0.2
        </div>
      </footer>
    </div>
  );
}