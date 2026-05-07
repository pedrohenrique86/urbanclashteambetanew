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
  HeartIcon,
  XMarkIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import NPCCountdown from "../components/combat/NPCCountdown";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";
import { calculateCombatStats, calculateTotalPower } from "../utils/combat";
import { soundEngine } from "../utils/soundEngine";

// HUD Corners e utilitários já estão no index.css via classes .military-clip, etc.
// Mas mantemos o objeto para compatibilidade com framer-motion se necessário
const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

const BattleRulesInfo = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="ml-auto flex items-center justify-center w-8 h-8 rounded-full bg-cyan-900/40 border border-cyan-500/40 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all text-cyan-400"
      >
        <InformationCircleIcon className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-black border border-cyan-500/30 p-6 max-w-lg w-full relative shadow-[0_0_30px_rgba(6,182,212,0.15)]"
              style={MILITARY_CLIP}
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
              
              <h3 className="text-xl font-orbitron font-black text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                <ShieldCheckIcon className="w-6 h-6 text-cyan-400" />
                Matriz de Combate Rápido
              </h3>
              <div className="space-y-4 font-mono text-[10px] leading-relaxed text-slate-400">
                <p>O combate Spectro é dinâmico e <span className="text-yellow-500 font-black">INSTANTÂNEO</span>, resolvido diretamente pela Matriz do Radar.</p>
                <div className="bg-black/40 p-3 border border-cyan-500/20 rounded mb-2 mt-2">
                  <p className="text-cyan-400 font-bold mb-1">Cálculo de Poder Total (Power Solo):</p>
                  <p className="text-[8px] leading-relaxed">
                    Sua força real considera Atributos (ATK, DEF, FOC), Nível, Crítico e Chips. Essa força é confrontada com o Alvo com fator sorte (~15%).
                  </p>
                </div>
                <ul className="space-y-2 list-disc list-inside mt-2">
                  <li><span className="text-emerald-400 uppercase font-black">Vitória Justa:</span> Roubo de CC, muito XP e chance de ganhar Atributos.</li>
                  <li><span className="text-purple-400 uppercase font-black">Vitória Esmagadora (2x Power):</span> Alvo vai pro hospital direto. Roubo de CC e chance de Atributo.</li>
                  <li><span className="text-yellow-500 uppercase font-black">Empate Tático (Diferença Mínima):</span> Ambos entram em estado de <span className="text-orange-400">Ruptura</span> (20min, -20% Força). Alto ganho de XP e Atributos!</li>
                  <li><span className="text-red-500 uppercase font-black">Derrota:</span> Você entra em Recondicionamento (20min). Se for Suicida (alvo 2x maior), a Base é 45min e há chance de perder atributos!</li>
                </ul>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="mt-6 w-full py-2 bg-slate-900 border border-slate-800 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                style={MILITARY_CLIP}
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleInstantAttack = async (targetId: string) => {
    const currentPA = userProfile?.action_points || 0;
    const currentEN = userProfile?.energy || 0;

    if (currentPA < 100) {
      showToast("PONTOS DE AÇÃO INSUFICIENTES (REQUER 100 PA)", "warning");
      return;
    }
    if (currentEN < 10) {
      showToast("ENERGIA INSUFICIENTE (REQUER 10%)", "warning");
      return;
    }
    
    setIsProcessing(true);
    soundEngine.playClick();
    
    try {
      const result = await combatService.instantAttack(targetId);
      
      let type: "success" | "error" | "warning" = "warning";
      if (result.outcome.includes("WIN")) type = "success";
      if (result.outcome.includes("LOSS")) type = "error";
      if (result.outcome === "DRAW") type = "warning";

      const lootText = result.loot?.money ? `+${result.loot.money.toLocaleString()} CC | ` : (result.loot?.moneyLost ? `-${result.loot.moneyLost.toLocaleString()} CC | ` : "0 CC | ");
      const xpText = `${result.loot?.xp > 0 ? '+' : ''}${result.loot?.xp} XP`;
      
      let statsText = "";
      if (result.loot?.stats && Object.keys(result.loot.stats).length > 0) {
        statsText = ` | Atributos: ` + Object.entries(result.loot.stats).map(([k, v]) => `${k.substring(0,3).toUpperCase()} ${Number(v)>0?'+':''}${v}`).join(', ');
      }
      
      const pCritText = result.battleReport?.pIsCrit ? "🔥 SEU CRÍTICO! " : "";
      const oCritText = result.battleReport?.oIsCrit ? "⚠️ CRÍTICO INIMIGO! " : "";
      const powerComparison = ` [FORÇA: ${result.battleReport?.pPower.toLocaleString()} vs ${result.battleReport?.oPower.toLocaleString()}]`;
      const costsText = ` | -${result.loot?.energyLost}% EN | -${result.loot?.apLost} PA`;
      
      showToast(`${pCritText}${oCritText}${result.message} (${lootText}${xpText}${statsText}${costsText})${powerComparison}`, type, 8000);

      // SÊNIOR: Delay de 2 segundos para o jogador ler o resultado antes da transição de estado
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refreshProfile();
      
      if (result.outcome.includes("LOSS")) {
        navigate("/recovery-base");
      } else {
        mutate();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro no combate", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (userProfile?.status === "Recondicionamento") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ExclamationTriangleIcon className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-orbitron font-black text-white uppercase tracking-widest mb-4">SISTEMA COMPROMETIDO</h1>
        <p className="text-slate-300 font-mono text-sm max-w-md tracking-wider leading-relaxed bg-red-500/5 px-4 py-2 border-x border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          Unidade em <span className="text-red-400 font-black animate-pulse">recondicionamento forçado</span>. Aguarde a sincronização total dos núcleos.
        </p>
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

      <header className="max-w-6xl mx-auto mb-10 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]"></div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl md:text-5xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(234,179,8,0.7), -2px 0px 0px rgba(139,92,246,0.7)" }}>
              Spectro <span className="text-yellow-500">Reckoning</span>
            </h1>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center overflow-hidden border border-yellow-500/40 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-yellow-500 px-2 py-0.5">
                  <span className="text-[9px] font-black text-black uppercase">OP_LEVEL</span>
                </div>
                <div className="px-3 py-0.5">
                  <span className="text-[10px] font-mono text-yellow-500 font-bold tracking-widest">TACTICAL_STRIKE_AUTH</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-yellow-500/80 animate-pulse tracking-widest font-bold uppercase">● Combat_Matrix_Active</span>
              <BattleRulesInfo />
            </div>
          </motion.div>

          <div className="flex flex-wrap items-center gap-3">
             <div className="bg-black/40 backdrop-blur-md border border-orange-500/30 px-4 py-2 flex items-center gap-3" style={MILITARY_CLIP}>
                <FireIcon className="w-5 h-5 text-orange-500" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">POWER_LVL</span>
                  <span className="text-lg font-black font-orbitron text-orange-400 leading-none">{playerPower.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="bg-black/40 backdrop-blur-md border border-emerald-500/30 px-4 py-2 flex items-center gap-3" style={MILITARY_CLIP}>
                <FingerPrintIcon className="w-5 h-5 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">ACTION_PTS</span>
                  <span className="text-lg font-black font-orbitron text-emerald-400 leading-none">{userProfile?.action_points?.toLocaleString() || 0}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <RefreshTimer targets={targets} />
                <div className="flex items-center gap-2 text-[9px] font-mono text-cyan-500/80 font-black uppercase tracking-widest px-2">
                  <div className="w-1 h-1 bg-cyan-500 animate-ping" />
                  Auto-Sync_Enabled
                </div>
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
          {/* SYNCHRONIZATION NOTICE */}
          <div className="bg-cyan-950/80 border border-cyan-500/60 p-3 px-5 flex items-center gap-4 relative overflow-hidden group transition-all duration-300 hover:bg-cyan-900/90" style={MILITARY_CLIP}>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500/50" />
            <div className="relative z-10 p-2 bg-black/40 border border-cyan-500/20 rounded-sm">
              <InformationCircleIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="relative z-10">
              <span className="text-[9px] font-orbitron text-cyan-400 uppercase font-black tracking-[0.3em] flex items-center gap-2 mb-1">
                Protocolo de Sincronização
              </span>
              <p className="text-[10px] font-mono text-slate-400 uppercase leading-tight tracking-wider">
                Grade de alvos em mutação. Nova varredura a cada <span className="text-white font-black">20 segundos</span>.
              </p>
            </div>
          </div>
          
          {/* ENGAGEMENT COSTS NOTICE */}
          <div className="bg-red-950/80 border border-red-500/60 p-3 px-5 flex items-center gap-4 relative overflow-hidden group transition-all duration-300 hover:bg-red-900/90" style={MILITARY_CLIP}>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500/50" />
            <div className="relative z-10 p-2 bg-black/40 border border-red-500/20 rounded-sm">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            </div>
            <div className="relative z-10 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[9px] font-orbitron text-red-500 uppercase font-black tracking-[0.3em] mb-1 block">Requisitos de Engajamento</span>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <FingerPrintIcon className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] font-orbitron font-black text-emerald-400 italic">100 PA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BoltIcon className="w-3 h-3 text-yellow-400" />
                    <span className="text-[9px] font-orbitron font-black text-yellow-400 italic">10% ENERGIA</span>
                  </div>
                </div>
              </div>
              <div className="md:text-right border-l md:border-l-0 md:border-r border-red-500/20 pl-3 md:pl-0 md:pr-3">
                <span className="text-[7px] font-mono text-red-500 font-black uppercase tracking-widest block">Consumo obrigatório</span>
                <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-tighter">Atenção_Operacional</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        {userProfile?.status === "Ruptura" && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-950/90 border-l-4 border-r-4 border-red-500 p-4 flex items-center justify-between shadow-[0_0_30px_rgba(239,68,68,0.4)]" 
            style={MILITARY_CLIP}
          >
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-red-600 border border-red-400 flex items-center justify-center animate-pulse">
                 <ExclamationTriangleIcon className="w-6 h-6 text-white" />
               </div>
               <div>
                 <h3 className="font-orbitron font-black text-white uppercase tracking-widest text-sm md:text-base">Aviso: Estado de Ruptura Ativo</h3>
                 <p className="text-[10px] md:text-xs font-mono text-slate-200 uppercase leading-relaxed">
                   Sistemas avariados. Redução de 20% no Power_Solo. Aguarde a auto-restauração ou visite a <span className="text-white font-black bg-red-600 px-1.5 py-0.5 rounded-sm shadow-[0_0_10px_rgba(220,38,38,0.5)]">Base de Recuperação</span> para reparos imediatos.
                 </p>
               </div>
             </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {targets?.map((tgt) => {
                   const estPower = (tgt.level * 6); 
                   const isRisky = estPower > (playerPower * 1.15);
                   
                   return (
                    <div 
                      key={tgt.id}
                      className="group relative bg-black/40 backdrop-blur-md border border-white/5 hover:border-yellow-500/30 transition-all duration-500 p-5 overflow-hidden shadow-2xl flex flex-col"
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
                            <span className="block text-[8px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">LVL_RANK</span>
                            <span className="text-xl font-black text-white font-orbitron italic">{tgt.level}</span>
                         </div>
                         <div className="bg-white/5 border border-white/5 p-2 text-center group-hover:bg-white/10 transition-colors">
                            <span className="block text-[8px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">EST_POWER</span>
                            <span className={`text-xl font-black font-orbitron italic ${isRisky ? 'text-red-500' : 'text-emerald-500'}`}>~{estPower.toLocaleString()}</span>
                         </div>
                      </div>

                      <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex gap-1 items-center">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className={`w-1 h-3 ${isRisky ? 'bg-red-500/20' : 'bg-emerald-500/20'} group-hover:bg-yellow-500/40 transition-colors`} />
                          ))}
                          <span className="ml-2 text-[8px] font-mono text-white/20 uppercase font-black group-hover:text-yellow-500/60 transition-colors">Instant_Sync</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleInstantAttack(tgt.id); }}
                          disabled={isProcessing}
                          className="px-6 py-2 bg-red-600/90 hover:bg-red-500 text-white font-orbitron font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50 transition-all"
                          style={MILITARY_CLIP}
                        >
                          Atacar
                        </button>
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