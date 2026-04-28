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
  ClockIcon
} from "@heroicons/react/24/outline";
import NPCCountdown from "../components/combat/NPCCountdown";

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

const ANALYZING_PHRASES = [
  "ANALISANDO DADOS DO ALVO...",
  "RASTREANDO PACOTES DE REDE...",
  "CALCULANDO IMPACTO NEURAL...",
  "SINCRONIZANDO COM SPECTRO...",
  "VERIFICANDO VULNERABILIDADES ARQUITETÔNICAS...",
  "DECODIFICANDO FIREWALL DE DEFESA...",
  "MONITORANDO FLUXO DE CRÉDITOS ESCUSOS...",
  "MAPEANDO BACKDOORS DE FUGA..."
];

const RESULT_PHRASES = [
  "REASSIMILANDO CONEXÃO...",
  "COMPILANDO RELATÓRIO DO CONFRONTO...",
  "CALCULANDO GANHOS E PERDAS...",
  "FINALIZANDO PROTOCOLO DE ACERTO...",
  "VERIFICANDO INTEGRIDADE DO CAIXA..."
];

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
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [turnCountdown, setTurnCountdown] = useState<number | null>(null);
  const [countdownMessage, setCountdownMessage] = useState("");
  const navigate = useNavigate();

  const closeResult = useCallback(() => {
    setCombatPhase("radar");
    setSelectedTarget(null);
    setPreCalc(null);
    mutate(); // Refresh radar
  }, [mutate]);

  // Countdown para redirecionamento automático pós-luta
  useEffect(() => {
    if (combatPhase === "result" && finalResult) {
      setRedirectCountdown(15);
      const timer = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            if (finalResult.winner || finalResult.outcome === "draw_flee") {
              closeResult(); // Volta para o radar se ganhou ou se fugiu sem danos críticos
            } else {
              navigate("/recovery-base"); // Manda para a base de recuperação se perdeu ou empate DKO
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [combatPhase, finalResult, navigate, closeResult]);
  
  const handleSelectTarget = async (target: RadarTarget) => {
    if ((userProfile?.energy || 0) < 100) {
      showToast("Energia insuficiente. Recarregue para 100% para abrir o rastreador.", "warning");
      return;
    }
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
    if ((userProfile?.energy || 0) < 100) {
      showToast("Protocolo Negado: Você precisa de 100% de energia para iniciar um Acerto de Contas.", "error");
      return;
    }
    try {
      setCombatPhase("fighting");
      setBattleLog([]);
      setFinalResult(null);
      
      const result = await combatService.attack(selectedTarget.id);
      
      // Countdown Inicial (5 segundos)
      const initPhrases = [
        "ESTABELECENDO TÚNEL NEURAL SEGURO...",
        "SINCRONIZANDO RELÓGIO DE COMBATE...",
        "CARREGANDO MÓDULOS SPECTRO_v9.1...",
        "INJETANDO SCRIPTS DE INTERCEPTAÇÃO...",
        "LOCALIZANDO NÓ DE DEFESA DO ALVO..."
      ];
      setCountdownMessage(initPhrases[Math.floor(Math.random() * initPhrases.length)]);
      for (let s = 5; s > 0; s--) {
        setTurnCountdown(s);
        await new Promise(r => setTimeout(r, 1000));
      }
      setTurnCountdown(null);
      setCountdownMessage("");

      // Sequência de 3 turnos
      for (let i = 0; i < 3; i++) {
        // Exibe o texto do turno
        const turnText = result.log[i];
        setBattleLog(prev => [...prev, turnText]);
        
        // Espera o texto ser "digitado" (60ms por caractere + margem)
        const typingDuration = turnText.length * 60 + 1500;
        await new Promise(r => setTimeout(r, typingDuration));

        // Determina mensagem do countdown baseado no turno
        let msg = "";
        if (i === 0) {
          // Análise de Poderes (Turno 1)
          const pPwr = (userProfile?.attack || 0) + (userProfile?.defense || 0) + (userProfile?.focus || 0);
          const tPwr = (preCalc?.targetInfo.level || 1) * 30; // Estimativa simples do poder do alvo
          const ratio = pPwr / tPwr;
          const dominance = Math.min(99, Math.round(ratio * 100));
          
          const analysisPhrases = [
             `ANÁLISE DE PODER: ${dominance}% DOMINÂNCIA SOBRE ALVO...`,
             `VERIFICANDO SINCRONIA: PROTOCOLO ${dominance > 100 ? 'ALFA' : 'DELTA'} ATIVO...`,
             `POTENCIAL DE COMBATE: ${pPwr.toFixed(0)} CP vs ${tPwr.toFixed(0)} CP...`,
             `SCANNER DE ELITE: VULNERABILIDADE DETECTADA EM ${dominance}%...`
          ];
          msg = analysisPhrases[Math.floor(Math.random() * analysisPhrases.length)];
        } else if (i === 1) {
          // Verificação de Sistema (Turno 2)
          const verificationPhrases = [
             "VERIFICANDO INTEGRIDADE NURAL DO ALVO...",
             "ESTADO DE SISTEMA: DEGRADAÇÃO EM ANDAMENTO...",
             "FLUXO DE DADOS: ESTÁVEL EM 98.4%...",
             `MONITORANDO SPECTRO: ${userProfile?.username?.toUpperCase()} EM VANTAGEM...`
          ];
          msg = verificationPhrases[Math.floor(Math.random() * verificationPhrases.length)];
        } else {
          // Palpite do Spectro (Turno 3)
          const predictionPhrases = result.winner 
            ? [
                "PALPITE DO SPECTRO: VITÓRIA CONFIRMADA EM 99.9%...",
                "CONSULTA AO ORÁCULO: O ALVO ESTÁ DELETADO.",
                "VEREDITO: EXECUÇÃO TERMINADA COM SUCESSO."
              ]
            : [
                "PALPITE DO SPECTRO: CONEXÃO INSTÁVEL... POSSÍVEL FALHA.",
                "ALERTA: DADOS CORROMPIDOS NA FINALIZAÇÃO.",
                "AVISO: O ALVO RESISTIU AO PROTOCOLO FINAL."
              ];
          msg = predictionPhrases[Math.floor(Math.random() * predictionPhrases.length)];
        }
        
        setCountdownMessage(msg);

        // Countdown de 10 segundos
        for (let s = 10; s > 0; s--) {
          setTurnCountdown(s);
          await new Promise(r => setTimeout(r, 1000));
        }
        setTurnCountdown(null);
      }
      
      await new Promise(r => setTimeout(r, 500));
      setFinalResult(result);
      setCombatPhase("result");

      // Toast notification for result
      if (result.winner) {
        showToast(`VITÓRIA! Você neutralizou ${result.targetRealName} e coletou os dados.`, "success");
      } else if (result.outcome === "loss") {
        showToast(`ALERTA: Derrota crítica. Seus sistemas entraram em recondicionamento.`, "error");
      } else {
        showToast(`EMPATE: A conexão foi interrompida antes do desfecho.`, "warning");
      }
      
      // Update our player profile
      await refreshProfile();
      
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
      cancelCombat();
    }
  };



  if (userProfile?.status === "Recondicionamento" && combatPhase === "radar") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ExclamationTriangleIcon className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-orbitron font-black text-white uppercase tracking-widest mb-4">SISTEMA COMPROMETIDO</h1>
        <p className="text-slate-400 font-mono">Redirecionando para Base de Recuperação...</p>
      </div>
    );
  }

  if ((userProfile?.level || 1) < 10 && combatPhase === "radar") {
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
                    INICIAR ATAQUE (CUSTO: 100% EN)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* FASE: COMBATE_HUB (Fighting & Result) */}
          {(combatPhase === "fighting" || combatPhase === "result") && (
            <motion.div 
              key="combat_hub"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-black/80 border-2 border-red-500/50 backdrop-blur-2xl p-6 md:p-10 shadow-[0_0_100px_rgba(220,38,38,0.15)] relative overflow-hidden" style={MILITARY_CLIP}>
                {/* HUD Scanlines Deck */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
                
                {/* COMBAT HEADER */}
                <div className="flex justify-between items-center mb-10 border-b border-red-500/30 pb-6 relative z-10">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-red-500 tracking-[0.3em] uppercase mb-1">Iniciador</span>
                      <h4 className="font-orbitron font-black text-xl text-white uppercase">{userProfile?.username}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">LVL {userProfile?.level}</span>
                   </div>
                   
                   <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-red-500/20 border border-red-500 flex items-center justify-center animate-pulse mb-2">
                         <BoltIcon className="w-8 h-8 text-red-500" />
                      </div>
                      <span className="text-[10px] font-mono text-red-500 animate-pulse uppercase">VS</span>
                   </div>

                   <div className="flex flex-col text-right">
                      <span className="text-[10px] font-mono text-red-500 tracking-[0.3em] uppercase mb-1">Alvo_Interceptado</span>
                      <h4 className="font-orbitron font-black text-xl text-red-500 uppercase">{selectedTarget?.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono text-right">LVL {selectedTarget?.level}</span>
                   </div>
                </div>

                {/* LOGS / FIGHTING AREA */}
                <div className="min-h-[300px] flex flex-col justify-center gap-4 relative z-10">
                   {combatPhase === "fighting" && (
                     <div className="space-y-4">
                        {battleLog.length === 0 && (
                          <div className="text-center p-8 border border-white/5 bg-white/5 animate-pulse">
                             <p className="font-mono text-sm text-slate-400 uppercase tracking-widest">Estabelecendo Conexão Neural...</p>
                          </div>
                        )}
                        {turnCountdown !== null && (
                          <div className="flex flex-col items-center gap-2 py-6 border-y border-red-500/20 bg-red-500/5 mb-6">
                             <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-red-500 animate-ping rounded-full"></div>
                                <span className="text-xs font-mono text-red-500 uppercase tracking-[0.4em] font-black">
                                    {countdownMessage} {turnCountdown}s
                                </span>
                             </div>
                             <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div 
                                   initial={{ width: "100%" }}
                                   animate={{ width: "0%" }}
                                   transition={{ duration: 1, ease: "linear" }}
                                   key={turnCountdown}
                                   className="h-full bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                                />
                             </div>
                          </div>
                        )}
                        {battleLog.map((log, idx) => {
                          const pName = userProfile?.username || "";
                          const tName = selectedTarget?.name || "";
                          const realTName = finalResult?.targetRealName || "";
                          
                          // Procura nomes para destacar
                          // Ordem importa para não sobrepor substrings
                          const namesToHighlight = [
                            { text: pName, className: "text-emerald-400 font-bold drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" },
                            { text: tName, className: "text-red-500 font-bold drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]" },
                            { text: realTName, className: "text-red-500 font-bold drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]" }
                          ].filter(n => n.text.length > 0);

                          const processSegments = (txt: string) => {
                             if (!txt) return [];
                             let result = [{ text: txt, highlight: false, className: "" }];
                             
                             namesToHighlight.forEach(h => {
                                let newResult: any[] = [];
                                result.forEach(seg => {
                                   if (seg.highlight) {
                                      newResult.push(seg);
                                      return;
                                   }
                                   const parts = seg.text.split(h.text);
                                   parts.forEach((p, pIdx) => {
                                      if (p) newResult.push({ text: p, highlight: false, className: "" });
                                      if (pIdx < parts.length - 1) newResult.push({ text: h.text, highlight: true, className: h.className });
                                   });
                                });
                                result = newResult;
                             });
                             return result;
                          };

                          const segments = processSegments(log);
                          let globalCharIdx = 0;

                          return (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="bg-red-500/5 border-l-4 border-red-500 p-5 font-mono text-xs md:text-sm text-slate-200 leading-relaxed shadow-[0_0_20px_rgba(220,38,38,0.05)]"
                            >
                              <span className="text-red-500 mr-3">[{idx + 1}]</span>
                              {segments.map((seg, sIdx) => {
                                 const part = seg.text;
                                 return (
                                   <span key={sIdx} className={seg.className}>
                                      {part.split("").map((char: string) => {
                                         const currentIdx = globalCharIdx++;
                                         return (
                                           <motion.span
                                             key={currentIdx}
                                             initial={{ opacity: 0 }}
                                             animate={{ opacity: 1 }}
                                             transition={{ 
                                               duration: 0.06,
                                               delay: currentIdx * 0.06 
                                             }}
                                           >
                                             {char}
                                           </motion.span>
                                         );
                                      })}
                                   </span>
                                 );
                              })}
                            </motion.div>
                          );
                        })}
                        {battleLog.length > 0 && battleLog.length < 3 && (
                          <div className="flex justify-center p-2">
                             <div className="w-1 h-6 bg-red-500 animate-bounce"></div>
                          </div>
                        )}
                     </div>
                   )}

                   {/* RESULT AREA (Inside Hub) */}
                   {combatPhase === "result" && finalResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                      >
                         <div className="mb-6 p-4 border-y-2 border-slate-800 bg-black/60">
                            <h3 className="font-orbitron font-black text-xs md:text-sm tracking-[0.5em] text-slate-400 uppercase mb-2">
                               RESULTADO DO DUELO
                            </h3>
                            <div className="flex flex-col items-center gap-1">
                               <p className={`text-xl font-black font-orbitron ${finalResult.winner ? 'text-emerald-400' : 'text-red-500'}`}>
                                  {finalResult.winner ? 'PROTOCOLO_GANHO' : 'PROTOCOLO_PERDIDO'}
                               </p>
                               <p className="text-[10px] font-mono text-slate-500">
                                  {finalResult.winner 
                                    ? `+${finalResult.loot?.xp || 0} XP | +$${finalResult.loot?.money || 0} CASH`
                                    : `-${finalResult.loot?.xp || 0} XP | -$${finalResult.loot?.moneyLost || 0} CASH | -100% ENERGIA`}
                               </p>
                               {finalResult.outcome === "loss" && (
                                  <p className="text-[9px] text-red-600 font-black animate-pulse mt-2">
                                     AVISO: SISTEMA 100% DRENADO - ENERGIA ZERADA
                                  </p>
                               )}
                            </div>
                         </div>

                         {redirectCountdown !== null && (
                            <div className="flex flex-col items-center gap-2 mb-8 p-4 bg-black/40 border border-red-500/20 relative overflow-hidden">
                               <div className="flex items-center gap-2 text-red-500 font-mono text-sm font-black animate-pulse">
                                  <ClockIcon className="w-5 h-5" />
                                  <span className="tracking-widest uppercase">Protocolo de Extração: {redirectCountdown}s</span>
                               </div>
                               <div className="w-full h-1 bg-slate-800/50 absolute bottom-0 left-0">
                                  <motion.div 
                                     initial={{ width: "100%" }}
                                     animate={{ width: `${(redirectCountdown / 15) * 100}%` }}
                                     transition={{ duration: 0.5 }}
                                     className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]"
                                  />
                               </div>
                               <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1 opacity-60">
                                 {finalResult.winner ? 'RETORNANDO AO RADAR SPECTRO...' : 'REDIRECIONANDO PARA BASE DE RECUPERAÇÃO...'}
                               </p>
                            </div>
                         )}

                         <h2 className={`font-orbitron font-black text-5xl md:text-7xl uppercase mb-4 tracking-tighter
                           ${finalResult.winner ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]'}`}>
                            {finalResult.winner ? "VITÓRIA" : "DERROTA"}
                         </h2>

                         <div className="bg-slate-900/80 border border-white/10 p-6 text-left mb-8 space-y-6">
                            <div>
                               <span className="text-[10px] text-red-500 font-mono uppercase tracking-widest">Relatório do Spectro:</span>
                               <p className="mt-2 text-slate-300 italic text-sm">&ldquo;{finalResult.spectroComment}&rdquo;</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               {finalResult.loot?.xp !== undefined && (
                                 <div className="bg-black/40 p-3 border border-white/5">
                                   <span className="text-[8px] text-slate-500 block uppercase mb-1">XP_GAIN</span>
                                   <span className={`font-black font-orbitron text-xl ${finalResult.loot.xp >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                                     {finalResult.loot.xp >= 0 ? '+' : ''}{finalResult.loot.xp}
                                   </span>
                                 </div>
                               )}
                               
                               <div className="bg-black/40 p-3 border border-white/5">
                                 <span className="text-[8px] text-slate-500 block uppercase mb-1">CASH_VARIATION</span>
                                 <span className={`font-black font-orbitron text-xl ${finalResult.winner ? 'text-green-400' : 'text-red-500'}`}>
                                   {finalResult.winner ? `+$${finalResult.loot?.money || 0}` : `-$${finalResult.loot?.moneyLost || 0}`}
                                 </span>
                               </div>
                               
                               {finalResult.loot?.energyLost !== undefined && (
                                 <div className="bg-black/40 p-3 border border-white/5">
                                   <span className="text-[8px] text-slate-500 block uppercase mb-1">EN_LOSS</span>
                                   <span className="font-black font-orbitron text-xl text-yellow-500">
                                     -{finalResult.loot.energyLost}%
                                   </span>
                                 </div>
                               )}

                               {finalResult.winner && finalResult.loot?.stats && (
                                 <div className="bg-black/40 p-3 border border-white/5 col-span-2">
                                    <span className="text-[8px] text-slate-500 block uppercase mb-1">ATTRIBUTES_SAUSAGE</span>
                                    <div className="flex gap-4">
                                       <div className="flex flex-col">
                                          <span className="text-[8px] text-slate-600">ATK</span>
                                          <span className="text-cyan-400 font-bold ml-1 text-xs">+{finalResult.loot.stats.attack.toFixed(1)}</span>
                                       </div>
                                       <div className="flex flex-col">
                                          <span className="text-[8px] text-slate-600">DEF</span>
                                          <span className="text-cyan-400 font-bold ml-1 text-xs">+{finalResult.loot.stats.defense.toFixed(1)}</span>
                                       </div>
                                       <div className="flex flex-col">
                                          <span className="text-[8px] text-slate-600">FOC</span>
                                          <span className="text-cyan-400 font-bold ml-1 text-xs">+{finalResult.loot.stats.focus.toFixed(1)}</span>
                                       </div>
                                    </div>
                                 </div>
                               )}
                            </div>

                            <div className="border-t border-white/5 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                               <p className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                                  <FingerPrintIcon className="w-3 h-3" />
                                 <span className="text-white uppercase font-bold">{finalResult.targetRealName}</span>
                               </p>
                               <div className="flex gap-4">
                                 {finalResult.outcome === 'loss' && (
                                   <button 
                                     onClick={() => navigate("/recovery-base")}
                                     className="px-6 py-3 bg-slate-800 text-slate-400 font-orbitron font-bold text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
                                     style={MILITARY_CLIP}
                                   >
                                     Ir para Base
                                   </button>
                                 )}
                                 <button 
                                   onClick={closeResult}
                                   className="px-8 py-3 bg-red-500 text-white font-orbitron font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                                   style={MILITARY_CLIP}
                                 >
                                   Finalizar_Sessão
                                 </button>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                   )}
                </div>
                
                {/* HUD Footer Decor */}
                <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-end opacity-40">
                   <div className="text-[8px] font-mono text-slate-500">
                      SYS_LOG: DUEL_SOCKET_ENCRYPT_256BIT<br/>
                      EN_CONSUMPTION: 100%_DELTA
                   </div>
                   <div className="text-[8px] font-mono text-slate-500 text-right uppercase">
                      UrbanClash_Duel_Engine_v9.1<br/>
                      {new Date().toLocaleTimeString()}
                   </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}