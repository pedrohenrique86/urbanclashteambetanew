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
import { calculateCombatStats, calculateTotalPower } from "../utils/combat";
import { soundEngine } from "../utils/soundEngine";

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
                <p>O combate Spectro é <span className="text-yellow-500 font-black">ESTRATÉGICO</span> baseado em <span className="text-white">SEQUÊNCIAS TÁTICAS</span>:</p>
                <div className="bg-black/40 p-3 border border-cyan-500/20 rounded">
                  <p className="text-cyan-400 font-bold mb-1">Matriz de Vantagem:</p>
                  <p className="text-[8px] leading-relaxed">
                    BRUTAL &gt; FINTA/EVASÃO | DEFESA &gt; ATAQUE/CONTRA | FINTA &gt; DEFESA/CONTRA | CONTRA &gt; ATAQUE/EVASÃO | EVASÃO &gt; DEFESA/FINTA
                  </p>
                </div>
                <ul className="space-y-2 list-disc list-inside">
                  <li><span className="text-white uppercase">Sincronização:</span> Escolha 5 ações para os 5 rounds de combate.</li>
                  <li><span className="text-white uppercase">Rancor:</span> Acumule dano para liberar o <span className="text-yellow-500">GOLPE ESPECIAL</span> no 5º Round.</li>
                  <li><span className="text-white uppercase">Veredito:</span> A vitória depende da sua leitura dos movimentos do oponente.</li>
                </ul>
                <p className="border-t border-white/5 pt-2 italic text-slate-500 text-[8px]">Nota: Bônus de Chips Táticos e atributos de classe influenciam o dano final.</p>
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

  const [selectedActions, setSelectedActions] = useState<string[]>(Array(5).fill(''));
  const [currentRound, setCurrentRound] = useState(0);
  const [battleLogs, setBattleLogs] = useState<any[]>([]);
  const [rancor, setRancor] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(100);
  const [damagePopups, setDamagePopups] = useState<any[]>([]);

  const closeResult = useCallback(() => {
    setCombatPhase("radar");
    setSelectedTarget(null);
    setPreCalc(null);
    setSelectedActions(Array(5).fill(''));
    setBattleLogs([]);
    setRancor(0);
    setCurrentRound(0);
    setPlayerHP(100);
    setEnemyHP(100);
    setDamagePopups([]);
    mutate();
  }, [mutate]);

  const handleSelectTarget = async (target: RadarTarget) => {
    const currentPA = userProfile?.action_points || 0;
    const currentEN = userProfile?.energy || 0;

    if (currentPA < 300) {
      showToast("PONTOS DE AÇÃO INSUFICIENTES (REQUER 300 PA)", "warning");
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
      soundEngine.playClick();
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
    setSelectedActions(Array(5).fill(''));
  };

  const handleActionSelect = (roundIndex: number, action: string) => {
    const newActions = [...selectedActions];
    newActions[roundIndex] = action;
    setSelectedActions(newActions);
    soundEngine.playClick();
  };

  const handleAttack = async () => {
    if (!selectedTarget) return;
    if (selectedActions.some(a => a === '')) {
      showToast("SELECIONE TODAS AS 5 AÇÕES ANTES DE INICIAR", "warning");
      return;
    }
    
    setFinalResult(null); 
    try {
      setCombatPhase("fighting");
      setIsProcessing(true);
      
      // Inicializar HP com base no preCalc ou 100
      setPlayerHP(preCalc?.playerInfo.hp || 100);
      setEnemyHP(preCalc?.targetInfo.hp || 100);

      const result = await combatService.attack(selectedTarget.id, selectedActions as any);
      setFinalResult({ ...result, winner: result.outcome.startsWith("win"), timestamp: Date.now() });
      
      // Iniciar processamento dos rounds
      if (result.details?.turns) {
        await processRounds(result.details.turns);
      } else {
        throw new Error("Falha na sincronização dos dados de combate.");
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao iniciar combate", "error");
      cancelCombat();
    }
  };

  const processRounds = async (turns: any[]) => {
    for (let i = 0; i < turns.length; i++) {
      setCurrentRound(i + 1);
      const turn = turns[i];
      
      // Trigger damage indicators before updating logs
      if (turn.attacker.damage > 0) {
        setDamagePopups(prev => [...prev, { id: `enemy-${Date.now()}-${i}`, value: turn.attacker.damage, target: 'enemy' }]);
      }
      if (turn.defender.damage > 0) {
        setDamagePopups(prev => [...prev, { id: `player-${Date.now()}-${i}`, value: turn.defender.damage, target: 'player' }]);
      }

      setBattleLogs(prev => [...prev, turn]);
      setRancor(turn.playerRancor || 0);
      
      // Sincronizar HP das barras (Backend: attacker.hpAfter = enemyHP, defender.hpAfter = playerHP)
      setEnemyHP(turn.attacker.hpAfter);
      setPlayerHP(turn.defender.hpAfter);
      
      // Audio feedback based on impact
      if (turn.effect === 'heavy') soundEngine.playImpact();
      else if (turn.effect === 'tech') soundEngine.playTech();
      else if (turn.effect === 'special') soundEngine.playSpecial();
      else if (turn.effect === 'parry') soundEngine.playClick();
      else soundEngine.playClick();

      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    setIsProcessing(false);
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

  if (userProfile?.status === "Recondicionamento" && combatPhase !== "fighting") {
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
                    <span className="text-[9px] font-orbitron font-black text-emerald-400 italic">300 PA</span>
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
                            <span className="block text-[8px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">LVL_RANK</span>
                            <span className="text-xl font-black text-white font-orbitron italic">{tgt.level}</span>
                         </div>
                         <div className="bg-white/5 border border-white/5 p-2 text-center group-hover:bg-white/10 transition-colors">
                            <span className="block text-[8px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">EST_POWER</span>
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
            <motion.div key="precalc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
              <div className="bg-black/80 border border-slate-800 p-8" style={MILITARY_CLIP}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-orbitron font-black text-2xl text-white uppercase flex items-center gap-3">
                    <CpuChipIcon className="w-8 h-8 text-cyan-400" /> Matriz de Estratégia
                  </h2>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 font-black block uppercase tracking-[0.2em]">Alvo Selecionado</span>
                    <span className="text-lg font-black text-red-500 font-orbitron">{selectedTarget?.name}</span>
                  </div>
                </div>

                <p className="bg-slate-900/50 p-4 border-l-2 border-cyan-400 text-cyan-100/60 font-mono text-[10px] italic mb-8 uppercase tracking-widest">
                  &ldquo;Protocolo de 5 rounds ativado. O inimigo não poderá reagir à sua sequência pré-programada.&rdquo;
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="text-center mb-2">
                        <span className="text-[9px] font-black font-mono text-cyan-500/50 uppercase tracking-tighter">Round {idx + 1}</span>
                      </div>
                      
                      <button 
                        onClick={() => handleActionSelect(idx, 'brutal')}
                        className={`p-3 border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 ${selectedActions[idx] === 'brutal' ? 'bg-red-500/30 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-black/40 border-slate-800 text-slate-400 font-bold hover:border-red-500/50'}`}
                        style={MILITARY_CLIP}
                      >
                        <FireIcon className="w-4 h-4" />
                        <span>(ATAQUE) Brutal</span>
                      </button>

                      <button 
                        onClick={() => handleActionSelect(idx, 'block')}
                        className={`p-3 border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 ${selectedActions[idx] === 'block' ? 'bg-emerald-500/30 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-black/40 border-slate-800 text-slate-400 font-bold hover:border-emerald-500/50'}`}
                        style={MILITARY_CLIP}
                      >
                        <ShieldExclamationIcon className="w-4 h-4" />
                        <span>(DEFESA) Block</span>
                      </button>

                      <button 
                        onClick={() => handleActionSelect(idx, 'feint')}
                        className={`p-3 border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 ${selectedActions[idx] === 'feint' ? 'bg-cyan-500/30 border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-black/40 border-slate-800 text-slate-400 font-bold hover:border-cyan-500/50'}`}
                        style={MILITARY_CLIP}
                      >
                        <BoltIcon className="w-4 h-4" />
                        <span>(FINTA) Feint</span>
                      </button>

                      <button 
                        onClick={() => handleActionSelect(idx, 'counter')}
                        className={`p-3 border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 ${selectedActions[idx] === 'counter' ? 'bg-orange-500/30 border-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-black/40 border-slate-800 text-slate-400 font-bold hover:border-orange-500/50'}`}
                        style={MILITARY_CLIP}
                      >
                        <AdjustmentsHorizontalIcon className="w-4 h-4" />
                        <span>(CONTRA) Counter</span>
                      </button>

                      <button 
                        onClick={() => handleActionSelect(idx, 'stealth')}
                        className={`p-3 border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 ${selectedActions[idx] === 'stealth' ? 'bg-violet-500/30 border-violet-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]' : 'bg-black/40 border-slate-800 text-slate-400 font-bold hover:border-violet-500/50'}`}
                        style={MILITARY_CLIP}
                      >
                        <UserCircleIcon className="w-4 h-4" />
                        <span>(EVASÃO) Stealth</span>
                      </button>

                      {idx === 4 && (
                        <button 
                          onClick={() => handleActionSelect(idx, 'special')}
                          className={`p-3 border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 ${selectedActions[idx] === 'special' ? 'bg-yellow-500/30 border-yellow-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-black/20 border-yellow-500/30 text-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-500'}`}
                          style={MILITARY_CLIP}
                        >
                          <StarIcon className="w-4 h-4" />
                          <span>(ESPECIAL) Finish</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 border-t border-white/5 pt-8">
                  <div className="flex-1 w-full">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-black font-mono text-yellow-500 uppercase italic">Ameaça do Alvo</span>
                      <span className="text-[10px] font-black font-mono text-yellow-500">EST_POWER: { (selectedTarget?.level || 0) * 6 }</span>
                    </div>
                    <div className="h-1 w-full bg-slate-900 overflow-hidden">
                      <motion.div 
                        className="h-full bg-yellow-500/50"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, ((selectedTarget?.level || 0) * 6 / playerPower) * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button onClick={cancelCombat} className="px-6 py-3 border border-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all" style={MILITARY_CLIP}>Abortar</button>
                    <button 
                      onClick={handleAttack}
                      className="px-12 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]" 
                      style={MILITARY_CLIP}
                    >
                      Iniciar Execução
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {combatPhase === "fighting" && (
            <motion.div 
              key="fighting" 
              initial={{ opacity: 0 }} 
              animate={{ 
                opacity: 1,
                x: battleLogs.length > 0 && battleLogs[battleLogs.length-1].defender.damage > 0 ? [0, -4, 4, -4, 4, 0] : 0
              }} 
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-black/90 border border-red-500/30 p-6 md:p-10 relative overflow-hidden" style={MILITARY_CLIP}>
                {/* Rancor Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black font-orbitron text-red-500 uppercase tracking-[0.2em]">Sincronização de Rancor</span>
                    <span className="text-2xl font-black font-orbitron text-red-500">{rancor}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 border border-white/5 p-0.5">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-400 shadow-[0_0_15px_rgba(220,38,38,0.6)]"
                      animate={{ width: `${rancor}%` }}
                    />
                  </div>
                </div>

                {/* SISTEMA DE HP E INDICADORES DE DANO */}
                <div className="grid grid-cols-2 gap-4 md:gap-12 mb-10 relative">
                  {/* PLAYER HP */}
                  <div className="relative">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black font-mono text-cyan-500 uppercase tracking-widest">Integridade_Unidade</span>
                        <span className="text-xs font-mono text-slate-500 uppercase">Status: {playerHP > 20 ? 'NOMINAL' : 'CRÍTICO'}</span>
                      </div>
                      <span className="text-2xl font-black font-orbitron text-white">{playerHP}%</span>
                    </div>
                    <div className="h-4 bg-slate-900 border border-cyan-500/30 p-0.5 overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" style={MILITARY_CLIP}>
                      <motion.div 
                        className={`h-full ${playerHP > 20 ? 'bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-red-500 animate-pulse'}`}
                        animate={{ width: `${playerHP}%` }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      />
                    </div>
                    
                    {/* Floating Damage Numbers for Player */}
                    <AnimatePresence>
                      {damagePopups.filter(p => p.target === 'player').map(p => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 1, y: 0, scale: 0.5, x: 0 }}
                          animate={{ opacity: [1, 1, 0], y: -100, scale: [0.5, 1.5, 2], x: Math.random() * 40 - 20 }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          onAnimationComplete={() => setDamagePopups(prev => prev.filter(x => x.id !== p.id))}
                          className="absolute top-0 left-1/2 -translate-x-1/2 z-[100] font-orbitron font-black text-3xl text-red-500 pointer-events-none"
                          style={{ textShadow: "0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(239,68,68,0.4)" }}
                        >
                          -{p.value}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* ENEMY HP */}
                  <div className="relative">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-2xl font-black font-orbitron text-red-500">{enemyHP}%</span>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] font-black font-mono text-red-500 uppercase tracking-widest">Blindagem_Alvo</span>
                        <span className="text-xs font-mono text-slate-500 uppercase">Sinal: {selectedTarget?.is_npc ? 'SYNC_BOT' : 'USER_HOSTILE'}</span>
                      </div>
                    </div>
                    <div className="h-4 bg-slate-900 border border-red-500/30 p-0.5 overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" style={MILITARY_CLIP}>
                      <motion.div 
                        className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] ml-auto"
                        animate={{ width: `${enemyHP}%` }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      />
                    </div>

                    {/* Floating Damage Numbers for Enemy */}
                    <AnimatePresence>
                      {damagePopups.filter(p => p.target === 'enemy').map(p => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 1, y: 0, scale: 0.5, x: 0 }}
                          animate={{ opacity: [1, 1, 0], y: -100, scale: [0.5, 1.5, 2], x: Math.random() * 40 - 20 }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          onAnimationComplete={() => setDamagePopups(prev => prev.filter(x => x.id !== p.id))}
                          className="absolute top-0 left-1/2 -translate-x-1/2 z-[100] font-orbitron font-black text-3xl text-yellow-400 pointer-events-none"
                          style={{ textShadow: "0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(234,179,8,0.4)" }}
                        >
                          -{p.value}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black border border-cyan-500/50 flex items-center justify-center">
                      <UserCircleIcon className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-cyan-500 block uppercase tracking-tighter">Operador_Ativo</span>
                      <h4 className="text-xl font-black text-white uppercase font-orbitron">{userProfile?.username}</h4>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-[9px] font-black font-mono text-slate-500 uppercase mb-1">Round</div>
                    <div className="text-4xl font-black font-orbitron text-red-600 italic">0{currentRound}</div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[9px] font-mono text-red-500 block uppercase tracking-tighter">Alvo_Detectado</span>
                      <h4 className="text-xl font-black text-red-500 uppercase font-orbitron">{selectedTarget?.name}</h4>
                    </div>
                    <div className="w-12 h-12 bg-black border border-red-500/50 flex items-center justify-center">
                      <ShieldExclamationIcon className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                </div>

                {/* CLEAN & PREMIUM COMBAT LOGS */}
                <div className="space-y-3 min-h-[350px] flex flex-col justify-end bg-black/40 p-6 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/10 to-transparent" />
                  
                  <AnimatePresence mode="popLayout">
                    {battleLogs.map((log, i) => {
                      const isLast = i === battleLogs.length - 1;
                      const isCritical = log.effect === 'special' || log.effect === 'heavy';
                      const isNeutral = log.attacker.damage === 0 && log.defender.damage === 0;
                      
                      return (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ 
                            opacity: isLast ? 1 : 0.5, 
                            x: 0,
                            scale: isLast ? 1 : 0.98 
                          }}
                          className={`relative flex items-center gap-4 py-2 px-4 transition-all duration-500 border-l-[3px] ${
                            isLast 
                              ? (log.attacker.damage > log.defender.damage ? 'border-cyan-500 bg-cyan-500/5' : log.defender.damage > log.attacker.damage ? 'border-red-500 bg-red-500/5' : 'border-slate-500 bg-slate-500/5') 
                              : 'border-white/5'
                          }`}
                        >
                          {/* Round Marker */}
                          <div className={`font-orbitron font-black text-[9px] w-6 opacity-40 ${isLast ? 'text-white opacity-100' : 'text-slate-500'}`}>
                            R{i + 1}
                          </div>

                          {/* Action Label */}
                          <div className="flex-1">
                            <p className={`font-mono text-xs uppercase tracking-normal leading-relaxed ${
                              isLast ? 'text-white' : 'text-slate-400'
                            } ${isLast && isCritical ? 'font-bold' : ''}`}>
                              {log.label}
                            </p>
                          </div>
                          
                          {/* Damage Indicators - Clean Minimalist Pills */}
                          <div className="flex gap-2 items-center">
                            {log.attacker.damage > 0 && (
                              <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-sm">
                                <span className="text-[10px] font-orbitron font-black text-cyan-400">-{log.attacker.damage}</span>
                                <BoltIcon className="w-2.5 h-2.5 text-cyan-400/50" />
                              </div>
                            )}
                            {log.defender.damage > 0 && (
                              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-sm">
                                <span className="text-[10px] font-orbitron font-black text-red-400">-{log.defender.damage}</span>
                                <FireIcon className="w-2.5 h-2.5 text-red-400/50" />
                              </div>
                            )}
                            {isNeutral && (
                              <div className="bg-slate-800/50 border border-slate-700/50 px-2 py-0.5 rounded-sm">
                                <span className="text-[8px] font-black font-mono text-slate-500 uppercase tracking-widest italic">Anulado</span>
                              </div>
                            )}
                          </div>

                          {/* Subtle Bloom for critical hits */}
                          {isLast && isCritical && (
                            <div className="absolute inset-0 bg-red-500/5 pointer-events-none animate-pulse" />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  
                  {isProcessing && (
                    <div className="pt-4 flex items-center justify-center gap-4 border-t border-white/5 mt-2">
                       <div className="flex gap-1.5">
                         {[0, 1, 2, 3].map(d => (
                           <motion.div 
                             key={d}
                             animate={{ height: [4, 16, 4], backgroundColor: ["#334155", "#ef4444", "#334155"] }}
                             transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }}
                             className="w-[2px] rounded-full"
                           />
                         ))}
                       </div>
                       <span className="text-[9px] font-black font-mono text-slate-500 uppercase tracking-[0.4em]">
                         Sincronizando Matriz...
                       </span>
                    </div>
                  )}
                </div>

                {!isProcessing && finalResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-10 pt-8 border-t border-white/10 flex flex-col items-center"
                  >
                    <div className={`text-5xl font-black font-orbitron mb-6 uppercase tracking-[0.2em] ${finalResult.winner ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'text-red-500'}`}>
                      {finalResult.winner ? 'VITÓRIA' : 'DERROTA'}
                    </div>
                    
                    {finalResult.loot && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full max-w-4xl mb-8">
                        <div className="bg-white/5 p-3 text-center border border-white/10" style={MILITARY_CLIP}>
                          <span className="text-[8px] block text-slate-500 uppercase font-black mb-1">Experiência</span>
                          <span className="text-lg font-black font-orbitron text-white">+{finalResult.loot.xp} XP</span>
                        </div>
                        <div className="bg-white/5 p-3 text-center border border-white/10" style={MILITARY_CLIP}>
                          <span className="text-[8px] block text-slate-500 uppercase font-black mb-1">Créditos</span>
                          <span className={`text-lg font-black font-orbitron ${finalResult.loot.moneyLost ? 'text-red-500' : 'text-yellow-500'}`}>
                            {finalResult.loot.moneyLost ? `-$${finalResult.loot.moneyLost}` : `+$${finalResult.loot.money || 0}`}
                          </span>
                        </div>
                        <div className="bg-white/5 p-3 text-center border border-cyan-500/20" style={MILITARY_CLIP}>
                          <span className="text-[8px] block text-cyan-500/60 uppercase font-black mb-1">Ataque</span>
                          <span className="text-lg font-black font-orbitron text-cyan-400">+{finalResult.loot.stats?.attack || 0}</span>
                        </div>
                        <div className="bg-white/5 p-3 text-center border border-cyan-500/20" style={MILITARY_CLIP}>
                          <span className="text-[8px] block text-cyan-500/60 uppercase font-black mb-1">Defesa</span>
                          <span className="text-lg font-black font-orbitron text-cyan-400">+{finalResult.loot.stats?.defense || 0}</span>
                        </div>
                        <div className="bg-white/5 p-3 text-center border border-cyan-500/20" style={MILITARY_CLIP}>
                          <span className="text-[8px] block text-cyan-500/60 uppercase font-black mb-1">Foco</span>
                          <span className="text-lg font-black font-orbitron text-cyan-400">+{finalResult.loot.stats?.focus || 0}</span>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handleCombatComplete}
                      className="px-16 py-4 bg-white text-black font-black uppercase text-xs tracking-[0.3em] hover:bg-cyan-400 transition-all active:scale-95"
                      style={MILITARY_CLIP}
                    >
                      Finalizar Relatório
                    </button>
                  </motion.div>
                )}
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