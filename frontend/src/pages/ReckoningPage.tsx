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
                Matriz de Combate 1x1
              </h3>
              <div className="space-y-4 font-mono text-[10px] leading-relaxed text-slate-400">
                <p>O combate Spectro evoluiu para o sistema <span className="text-yellow-500 font-black">SQUADRON CLASH (4 ROUNDS)</span>:</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li><span className="text-white uppercase">Choque:</span> Seu <span className="text-cyan-400">Ataque</span> vs <span className="text-cyan-400">Defesa</span> inimiga.</li>
                  <li><span className="text-white uppercase">Sincronia:</span> Duelo de reflexos através do <span className="text-cyan-400">Foco</span>.</li>
                  <li><span className="text-white uppercase">Resiliência:</span> Sua <span className="text-cyan-400">Defesa</span> vs <span className="text-cyan-400">Ataque</span> inimigo.</li>
                  <li><span className="text-white uppercase">Protocolo Letal:</span> Comparação de <span className="text-cyan-400">Poder Total</span> absoluto.</li>
                </ul>
                <p className="border-t border-white/5 pt-2 italic text-slate-500">Regra de Veredito: Vence a maioria. Em 2-2, o maior Nível de Prestígio leva a vitória.</p>
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

export default function ReckoningPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
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
    if ((userProfile?.action_points || 0) < 300 || (userProfile?.energy || 0) < 50) {
      showToast("RECURSOS INSUFICIENTES (REQUER 300 PA | 50% ENERGIA)", "warning");
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

  const handleAttack = async () => {
    if (!selectedTarget) return;
    setFinalResult(null); 
    try {
      setCombatPhase("fighting");
      const result = await combatService.attack(selectedTarget.id);
      setFinalResult({ ...result, winner: result.outcome.startsWith("win"), timestamp: Date.now() });
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao iniciar combate", "error");
      cancelCombat();
    }
  };

  const handleCombatComplete = useCallback(async () => {
    await refreshProfile();
    const outcome = finalResult?.outcome;
    // Só vai para a base se for Derrota Crítica (KO) ou Empate Crítico (DKO)
    const isCriticalFailure = outcome === "loss_ko" || outcome === "draw_dko";
    
    if (finalResult?.winner || outcome === "draw_flee" || outcome === "loss_bleeding") {
      closeResult();
    } else if (isCriticalFailure) {
      navigate("/recovery-base");
    } else {
      // Fallback
      closeResult();
    }
  }, [refreshProfile, finalResult, closeResult, navigate]);

  if (userProfile?.status === "Recondicionamento" && combatPhase === "radar") {
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
    <div className="min-h-[80vh] p-4 md:p-8 font-sans text-slate-300 relative selection:bg-yellow-500/30">
      <header className="max-w-6xl mx-auto mb-12 relative z-10 flex flex-wrap gap-4 items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(234,179,8,0.7)" }}>
            Spectro <span className="text-yellow-500">Reckoning</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-mono tracking-[0.2em] uppercase mt-2">Tactical Interception & Intelligence Matrix</p>
        </motion.div>
        
        <div className="flex items-center gap-6">
          <BattleRulesInfo />
          <div className="bg-black/50 border border-slate-800 p-3 flex items-center gap-3">
             <FingerPrintIcon className="w-6 h-6 text-emerald-500" />
             <div className="flex flex-col">
               <span className="text-[10px] font-mono text-slate-500 uppercase">PA</span>
               <span className="text-lg font-black font-orbitron text-emerald-400">{userProfile?.action_points?.toLocaleString() || 0}</span>
             </div>
          </div>
          <div className="bg-black/50 border border-slate-800 p-3 flex items-center gap-3">
             <BoltIcon className="w-6 h-6 text-yellow-500" />
             <div className="flex flex-col">
               <span className="text-[10px] font-mono text-slate-500 uppercase">ENERGIA</span>
               <span className="text-lg font-black font-orbitron text-yellow-400">{userProfile?.energy || 0}%</span>
             </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {combatPhase === "radar" && (
            <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {targets?.map((tgt) => (
                   <div 
                     key={tgt.id}
                     onClick={() => !loadingPreCalc && handleSelectTarget(tgt)}
                     className="cursor-pointer group relative bg-black/60 backdrop-blur-md border border-slate-800 hover:border-yellow-500/50 hover:bg-slate-900 transition-all p-5"
                     style={MILITARY_CLIP}
                   >
                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:text-yellow-500">
                          <UserCircleIcon className="w-8 h-8" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase font-mono text-slate-500">ALVO_{tgt.is_npc ? 'SINTÉTICO' : 'JOGADOR'}</p>
                          <h3 className="font-orbitron font-black text-sm text-white truncate">{tgt.name}</h3>
                        </div>
                     </div>
                     <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="bg-white/5 p-2 text-center">
                           <span className="block text-[8px] text-slate-500 uppercase">Nível</span>
                           <span className="text-lg font-black text-white">{tgt.level}</span>
                        </div>
                        <div className="bg-white/5 p-2 text-center">
                           <span className="block text-[8px] text-slate-500 uppercase">Status</span>
                           <span className="text-xs text-emerald-400 font-mono">LOCALIZADO</span>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
            </motion.div>
          )}

          {combatPhase === "precalc" && preCalc && (
            <motion.div key="precalc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
              <div className="bg-black/80 border border-slate-800 p-8" style={MILITARY_CLIP}>
                <h2 className="font-orbitron font-black text-2xl text-white uppercase mb-6 flex items-center gap-3">
                   <CpuChipIcon className="w-8 h-8 text-cyan-400" /> Sinal Captado
                </h2>
                <p className="bg-slate-900 p-4 border-l-2 border-cyan-400 text-cyan-100 font-mono italic mb-8">&ldquo;{preCalc.spectroHint}&rdquo;</p>
                <div className="flex gap-4">
                  <button onClick={cancelCombat} className="flex-1 p-4 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-black uppercase tracking-widest hover:text-white">Abortar</button>
                  <button onClick={handleAttack} className="flex-[2] p-4 bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 text-sm font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-black">Confirmar Engajamento</button>
                </div>
              </div>
            </motion.div>
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

      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex justify-between items-center opacity-30 text-[10px] font-mono uppercase tracking-[0.2em]">
        <span>AES-256_ACTIVE</span>
        <span>Spectro Tactical Interface v4.0.2</span>
        <span>{new Date().toLocaleTimeString()}</span>
      </footer>
    </div>
  );
}