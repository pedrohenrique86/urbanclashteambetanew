import React, { useState, useEffect } from "react";
import useSWR from "swr";
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
  StarIcon
} from "@heroicons/react/24/outline";
import NPCCountdown from "../components/combat/NPCCountdown";

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

export default function ReckoningPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  
  const { data: targets, error, mutate } = useSWR("/combat/radar", combatService.getRadarTokens);
  
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);
  const [preCalc, setPreCalc] = useState<PreCombatInfo | null>(null);
  const [loadingPreCalc, setLoadingPreCalc] = useState(false);
  
  const [combatPhase, setCombatPhase] = useState<"radar" | "precalc" | "fighting" | "result">("radar");
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState<CombatResult | null>(null);
  
  const handleSelectTarget = async (target: RadarTarget) => {
    setSelectedTarget(target);
    setLoadingPreCalc(true);
    try {
      const info = await combatService.getPreCalc(target.id);
      setPreCalc(info);
      setCombatPhase("precalc");
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
      setSelectedTarget(null);
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
    try {
      setCombatPhase("fighting");
      setBattleLog([]);
      setFinalResult(null);
      
      const result = await combatService.attack(selectedTarget.id);
      
      // Dynamic delay: NPCs are fast, PvP is immersive
      const turnDelay = selectedTarget.is_npc ? 600 : 1800;
      
      for (let i = 0; i < result.log.length; i++) {
        await new Promise(r => setTimeout(r, turnDelay));
        setBattleLog(prev => [...prev, result.log[i]]);
      }
      
      await new Promise(r => setTimeout(r, 1000));
      setFinalResult(result);
      setCombatPhase("result");
      
      // Update our player profile
      await refreshProfile();
      
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
      cancelCombat();
    }
  };

  const closeResult = () => {
    setCombatPhase("radar");
    setSelectedTarget(null);
    setPreCalc(null);
    mutate(); // Refresh radar
  };

  if ((userProfile?.level || 1) < 10) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldExclamationIcon className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-orbitron font-black text-white uppercase tracking-widest mb-4">ACESSO NEGADO</h1>
        <p className="text-slate-400 font-mono">Nível 10 requerido para acessar o Radar do Spectro.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] p-4 md:p-8 font-sans text-slate-300 relative selection:bg-red-500/30">
       <header className="max-w-6xl mx-auto mb-12 relative z-10 flex flex-wrap gap-4 items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-5xl font-orbitron font-black text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(220,38,38,0.7), -2px 0px 0px rgba(139,92,246,0.7)" }}>
            Acerto de <span className="text-red-500">Contas</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 text-slate-300">RADAR SPECTRO</span>
            <span className="text-[10px] font-mono text-red-500 tracking-widest">● LIVE_TARGETS</span>
          </div>
        </motion.div>
        <div className="bg-black/50 border border-slate-700 p-2 md:p-3 flex items-center gap-3">
           <BoltIcon className="w-6 h-6 text-yellow-500 animate-pulse" />
           <div className="flex flex-col">
             <span className="text-[10px] font-mono text-slate-400 uppercase">Energia Disponível</span>
             <span className="text-lg font-black font-orbitron text-yellow-400">{userProfile?.energy || 0}%</span>
           </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {/* FASE: RADAR */}
          {combatPhase === "radar" && (
            <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
               {!targets && !error && (
                 <div className="flex justify-center items-center py-20">
                   <div className="w-10 h-10 border-2 border-red-500 border-t-transparent flex rounded-full animate-spin"></div>
                 </div>
               )}
               {error && (
                 <p className="text-center text-red-400 py-10 font-mono">Erro ao varrer a rede por alvos.</p>
               )}
               {targets && targets.length === 0 && (
                 <div className="text-center py-20 border border-slate-800 bg-black/40">
                   <p className="font-mono text-slate-500 mb-2">Nenhum alvo viável encontrado na rede no momento.</p>
                   <button onClick={() => mutate()} className="text-xs text-red-400 font-bold hover:underline">REESCANEAR REDE</button>
                 </div>
               )}
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {targets?.map((tgt) => (
                   <div 
                     key={tgt.id}
                     onClick={() => !loadingPreCalc && handleSelectTarget(tgt)}
                     className={`cursor-pointer group relative bg-black/60 backdrop-blur-md border transition-all duration-300 
                       ${tgt.is_rare ? 'border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'border-slate-800'}
                       ${loadingPreCalc ? 'opacity-50 pointer-events-none' : 'hover:border-red-500/50 hover:bg-slate-900 shadow-[0_0_20px_rgba(220,38,38,0)] hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]'}`}
                     style={MILITARY_CLIP}
                   >
                     {tgt.is_rare && (
                       <div className="absolute top-0 left-0 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 tracking-tighter z-10">
                         RARE_HVT
                       </div>
                     )}
                     {tgt.online && (
                       <div className="absolute top-3 right-3 flex items-center gap-1.5">
                         <span className={`w-2 h-2 rounded-full animate-pulse ${tgt.is_rare ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                         <span className={`text-[8px] font-mono ${tgt.is_rare ? 'text-red-400' : 'text-emerald-400'}`}>{tgt.is_rare ? 'SINAL_INSTÁVEL' : 'ONLINE'}</span>
                       </div>
                     )}
                     <div className="p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 bg-slate-900 border flex items-center justify-center transition-colors
                            ${tgt.is_rare ? 'border-red-500/50 text-red-500' : 'border-slate-800 text-slate-600 group-hover:text-red-500'}`}>
                            {tgt.is_rare ? <ExclamationTriangleIcon className="w-8 h-8 animate-pulse" /> : <UserCircleIcon className="w-8 h-8" />}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-mono text-slate-500">{tgt.is_npc ? 'ALVO_SINTÉTICO' : 'IDENTIDADE (ENCRIPTADA)'}</p>
                            <h3 className={`font-orbitron font-black text-lg tracking-widest ${tgt.is_rare ? 'text-red-500' : 'text-white'}`}>{tgt.name}</h3>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2">
                           <div className="bg-white/5 border border-white/5 p-2 flex flex-col items-center">
                              <span className="text-[8px] font-black uppercase text-slate-400">NÍVEL_LVL</span>
                              <span className="font-mono text-sm text-white">{tgt.level}</span>
                           </div>
                           <div className="bg-white/5 border border-white/5 p-2 flex flex-col items-center">
                              <span className="text-[8px] font-black uppercase text-slate-400">STATUS</span>
                              <span className={`font-mono text-[10px] capitalize ${tgt.is_rare ? 'text-red-400' : 'text-slate-400'}`}>
                                {tgt.is_rare ? 'VOLÁTIL' : 'LOCALIZADO'}
                              </span>
                           </div>
                        </div>

                        {tgt.expires_at && (
                          <NPCCountdown expiresAt={tgt.expires_at} onExpire={() => mutate()} />
                        )}
                     </div>
                     <div className={`bg-slate-900 border-t border-slate-800 p-2 text-center text-[10px] font-mono transition-colors
                       ${tgt.is_rare ? 'text-red-400 font-black' : 'text-slate-500 group-hover:text-red-400'}`}>
                       {tgt.is_rare ? '>>> INTERCEPTAR_AGORA <<<' : 'CLIQUE PARA RASTREAR...'}
                     </div>
                   </div>
                 ))}
               </div>
            </motion.div>
          )}

          {/* FASE: PRE-CALC */}
          {combatPhase === "precalc" && preCalc && (
            <motion.div key="precalc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto">
              <div className="bg-black/60 border border-slate-700 backdrop-blur-xl p-8" style={MILITARY_CLIP}>
                <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4">
                   <CpuChipIcon className="w-10 h-10 text-cyan-400" />
                   <div>
                     <h2 className="font-orbitron font-black text-2xl text-white uppercase">Sinal Rastreado</h2>
                     <p className="text-cyan-400 font-mono text-[10px] tracking-widest">TRANSMISSÃO_SPECTRO_SECURE</p>
                   </div>
                </div>

                <div className="bg-slate-900/50 border-l-4 border-cyan-500 p-4 mb-8 font-mono text-sm text-cyan-100 flex gap-3 italic">
                  <span className="text-cyan-500 mt-0.5">&ldquo;</span>
                  <p>{preCalc.spectroHint}</p>
                  <span className="text-cyan-500 self-end">&rdquo;</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="bg-black border border-slate-800 p-4">
                     <span className="block text-[10px] text-slate-500 font-mono uppercase mb-1">Seu Nível</span>
                     <span className="font-orbitron font-black text-2xl text-white">{userProfile?.level || 1}</span>
                   </div>
                   <div className="bg-black border border-slate-800 p-4">
                     <span className="block text-[10px] text-slate-500 font-mono uppercase mb-1">Alvo [{preCalc.targetInfo.name}]</span>
                     <span className="font-orbitron font-black text-2xl text-red-500">{preCalc.targetInfo.level}</span>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={cancelCombat} className="w-1/3 p-4 bg-slate-900 border border-slate-700 text-slate-300 font-orbitron font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors" style={MILITARY_CLIP}>
                    Abortar
                  </button>
                  <button onClick={handleAttack} className="w-2/3 p-4 bg-red-500/10 border border-red-500/50 text-red-400 font-orbitron font-bold text-sm uppercase tracking-widest hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all" style={MILITARY_CLIP}>
                    INICIAR ATAQUE (CUSTO: 10% EN)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* FASE: LUTANDO */}
          {combatPhase === "fighting" && (
            <motion.div key="fighting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto min-h-[50vh] flex flex-col justify-center">
              <div className="bg-black border border-red-500/30 p-8 shadow-[0_0_50px_rgba(220,38,38,0.1)] relative" style={MILITARY_CLIP}>
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.03)_10px,rgba(220,38,38,0.03)_20px)] pointer-events-none"></div>
                <h3 className="text-red-500 font-orbitron font-black tracking-[0.2em] mb-8 text-center animate-pulse">
                  CONEXÃO DE COMBATE ESTABELECIDA
                </h3>
                
                <div className="space-y-4">
                  {battleLog.map((log, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-slate-900/60 border-l-2 border-red-500 p-4 font-mono text-sm shadow-[0_0_15px_rgba(220,38,38,0.1)] relative overflow-hidden"
                    >
                      {log}
                      <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-red-500/10 to-transparent pointer-events-none"></div>
                    </motion.div>
                  ))}
                  
                  {battleLog.length < 3 && (
                    <div className="p-4 text-center">
                      <span className="inline-flex w-2 h-4 bg-red-400 animate-[pulse_0.7s_infinite]"></span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* FASE: RESULTADO */}
          {combatPhase === "result" && finalResult && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto">
              <div 
                className={`border p-8 md:p-12 text-center backdrop-blur-xl relative overflow-hidden
                  ${finalResult.winner ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_60px_rgba(16,185,129,0.1)]' : 'bg-red-950/40 border-red-500/50 shadow-[0_0_60px_rgba(220,38,38,0.1)]'}`}
                style={MILITARY_CLIP}
              >
                <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none"></div>
                
                <h2 className={`font-orbitron font-black text-4xl md:text-6xl uppercase tracking-widest mb-2
                  ${finalResult.winner ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]'}`}
                >
                  {finalResult.winner ? "VITÓRIA" : "SISTEMA COMPROMETIDO"}
                </h2>
                
                <div className="flex justify-center items-center gap-2 mb-10 font-mono text-xs uppercase tracking-widest text-slate-400">
                  <FingerPrintIcon className="w-4 h-4" />
                  <span>IDENTIDADE VERDADEIRA DECODIFICADA: <span className="text-white font-bold">{finalResult.targetRealName}</span></span>
                </div>

                <div className="bg-black/60 p-6 max-w-2xl mx-auto border border-white/5 mb-8 text-left space-y-6">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">Sinal de Interceptação: Spectro</span>
                    <p className="mt-2 text-slate-300 italic">&ldquo;{finalResult.spectroComment}&rdquo;</p>
                  </div>
                  
                  <div className="w-full h-px bg-slate-800"></div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {finalResult.loot?.xp !== undefined && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] tracking-widest uppercase font-mono text-slate-500">Experiência</span>
                        <span className={`font-black font-orbitron text-xl ${finalResult.loot.xp > 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          {finalResult.loot.xp > 0 ? '+' : ''}{finalResult.loot.xp}
                        </span>
                      </div>
                    )}
                    
                    {finalResult.winner && finalResult.loot?.money !== undefined ? (
                      <div className="flex flex-col gap-1 relative group">
                        <span className="text-[10px] tracking-widest uppercase font-mono text-slate-500">Dinheiro Sujo</span>
                        <span className="font-black font-orbitron text-xl text-green-400">+${finalResult.loot.money}</span>
                        {/* Tooltip sobre taxa do Spectro */}
                        {finalResult.loot.tax !== undefined && finalResult.loot.tax > 0 && (
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black border border-slate-700 p-2 text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            O saque total foi ${(finalResult.loot.money + finalResult.loot.tax)}. Spectro cobrou ${finalResult.loot.tax} de taxa de lavagem.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] tracking-widest uppercase font-mono text-slate-500">Fundos Queimados</span>
                        <span className="font-black font-orbitron text-xl text-red-500">-${finalResult.loot?.moneyLost || 0}</span>
                      </div>
                    )}

                    {finalResult.winner && finalResult.loot?.stats && (
                      <div className="col-span-2 grid grid-cols-3 bg-white/5 border border-white/5 py-2">
                        <div className="flex flex-col items-center">
                           <span className="text-[9px] uppercase font-mono text-slate-500">Roubo ATK</span>
                           <span className="text-cyan-400 font-bold font-mono">+{finalResult.loot.stats.attack.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                           <span className="text-[9px] uppercase font-mono text-slate-500">Roubo DEF</span>
                           <span className="text-cyan-400 font-bold font-mono">+{finalResult.loot.stats.defense.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                           <span className="text-[9px] uppercase font-mono text-slate-500">Roubo FOC</span>
                           <span className="text-cyan-400 font-bold font-mono">+{finalResult.loot.stats.focus.toFixed(1)}</span>
                        </div>
                      </div>
                    )}

                    {finalResult.loot?.rare_drop && (
                      <div className="col-span-2 md:col-span-4 bg-red-500/10 border border-red-500/30 p-2 mt-2 flex items-center justify-center gap-4">
                        <StarIcon className="w-5 h-5 text-yellow-400 animate-bounce" />
                        <div className="text-left">
                          <span className="text-[8px] font-mono text-red-500 block uppercase">ITEM_RARIDADE_S</span>
                          <span className="text-white font-orbitron font-black text-xs uppercase tracking-widest">{finalResult.loot.rare_drop}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button onClick={closeResult} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-orbitron font-bold py-3 px-10 uppercase tracking-[0.2em] transition-colors" style={MILITARY_CLIP}>
                  VOLTAR AO RADAR
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}