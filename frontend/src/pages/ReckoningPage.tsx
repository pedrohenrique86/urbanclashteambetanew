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

const CountdownReset = ({ resetAt }: { resetAt: number }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const remaining = resetAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft("00:00:00");
        return;
      }
      const h = Math.floor(remaining / 3600000).toString().padStart(2, '0');
      const m = Math.floor((remaining % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [resetAt]);

  return <span className="tabular-nums font-mono inline-block min-w-[8ch] text-center">{timeLeft}</span>;
};

const BattleRulesInfo = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm cursor-pointer"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="bg-zinc-950/95 border-2 border-cyan-500/50 p-4 sm:p-8 max-w-4xl w-full relative shadow-[0_0_100px_rgba(6,182,212,0.3)] cursor-default overflow-y-auto max-h-[90vh] custom-scrollbar"
            style={{ ...MILITARY_CLIP }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-500 hover:text-cyan-400 transition-colors group"
            >
              <XMarkIcon className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            
            <div className="mb-10">
              <h3 className="text-3xl font-orbitron font-black text-white uppercase tracking-[0.4em] flex items-center gap-4">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30">
                  <ShieldCheckIcon className="w-8 h-8 text-cyan-400" />
                </div>
                GUIA DE OPERAÇÃO
              </h3>
              <div className="h-px w-full bg-gradient-to-r from-cyan-500/50 via-cyan-500/10 to-transparent mt-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <section>
                  <h4 className="text-cyan-400 font-orbitron font-black text-sm mb-6 tracking-widest uppercase italic flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-400" />
                    Protocolos de Engajamento
                  </h4>
                  <ul className="space-y-6 text-[12px] font-mono text-slate-400 uppercase leading-relaxed">
                    <li className="flex items-start gap-4 p-3 bg-white/5 border-l-2 border-cyan-500/30">
                      <span className="text-cyan-500 font-black">01</span>
                      <span>Custo de Operação: <strong className="text-white text-sm">250 PA</strong> e <strong className="text-white text-sm">10% de Energia</strong> por engajamento tático.</span>
                    </li>
                    <li className="flex items-start gap-4 p-3 bg-white/5 border-l-2 border-cyan-500/30">
                      <span className="text-cyan-500 font-black">02</span>
                      <span>Cargas de Combate: Você possui <strong className="text-white text-sm">10 ataques</strong> totais (5 para PvE e 5 para PvP/Elite).</span>
                    </li>
                    <li className="flex items-start gap-4 p-3 bg-white/5 border-l-2 border-cyan-500/30">
                      <span className="text-cyan-500 font-black">03</span>
                      <span>Recarga de Matriz: Ao esgotar as 10 cargas, o sistema entra em <strong className="text-red-500 text-sm">Lock de 24h</strong> para reidratação.</span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-fuchsia-400 font-orbitron font-black text-sm mb-6 tracking-widest uppercase italic flex items-center gap-2">
                    <span className="w-2 h-2 bg-fuchsia-400" />
                    Cálculo de Poder (Matrix)
                  </h4>
                  <div className="bg-black/60 p-6 border border-fuchsia-500/20 font-mono text-[11px] text-slate-400 leading-relaxed uppercase relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <CpuChipIcon className="w-20 h-20 text-fuchsia-500" />
                    </div>
                    <p className="text-white font-black mb-4 italic border-b border-white/10 pb-2">Fórmula de Base:</p>
                    <div className="space-y-2 text-fuchsia-300 text-sm mb-6 bg-fuchsia-500/5 p-4 border border-fuchsia-500/10">
                      <p>(ATK + ARMA + DEF + ESCUDO + FOCUS × 0.5)</p>
                      <p>+ (LVL × 2)</p>
                      <p>+ (CRIT% × 0.2 + CRIT_MULT)</p>
                    </div>
                    <ul className="space-y-2 text-[10px]">
                      <li className="flex justify-between border-b border-white/5 pb-1">
                        <span>Equipamentos</span>
                        <span className="text-white">ARMA / ESCUDO (Dâm/Prot)</span>
                      </li>
                      <li className="flex justify-between border-b border-white/5 pb-1">
                        <span>Status <span className="text-red-400">Ruptura</span></span>
                        <span className="text-white">-20% POWER</span>
                      </li>
                      <li className="flex justify-between border-b border-white/5 pb-1">
                        <span>Chips Ativos</span>
                        <span className="text-white">MULT. VARIÁVEL</span>
                      </li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h4 className="text-amber-500 font-orbitron font-black text-sm mb-6 tracking-widest uppercase italic flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500" />
                    Habilidades de Facção
                  </h4>
                  <div className="grid grid-cols-1 gap-3 font-mono text-[10px]">
                    <div className="p-3 border border-red-500/30 bg-red-950/10 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-1 opacity-20">
                        <span className="text-[8px] text-red-500 font-black">OFFENSE_MOD</span>
                      </div>
                      <p className="text-red-400 font-black mb-1 italic">GANGSTERS / RENEGADOS</p>
                      <p className="text-slate-400 uppercase italic leading-tight">
                        <span className="text-white font-bold">INTIMIDAÇÃO (35%):</span> Bônus fixo de dano em ataques <span className="text-white">BRUTAIS</span> aplicado à sua matriz de ataque.
                      </p>
                    </div>
                    <div className="p-3 border border-blue-500/30 bg-blue-950/10 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-1 opacity-20">
                        <span className="text-[8px] text-blue-500 font-black">DEFENSE_MOD</span>
                      </div>
                      <p className="text-blue-400 font-black mb-1 italic">GUARDAS / GUARDIÕES</p>
                      <p className="text-slate-400 uppercase italic leading-tight">
                        <span className="text-white font-bold">DISCIPLINA (40%):</span> Redução fixa de dano recebido durante <span className="text-white">BLOQUEIOS</span> bem-sucedidos.
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="text-yellow-500 font-orbitron font-black text-sm mb-6 tracking-widest uppercase italic flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500" />
                    Categorias de Alvos
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white/5 p-4 border border-yellow-500/20 group hover:border-yellow-500/40 transition-colors">
                      <div className="text-yellow-500 font-black mb-2 flex items-center gap-2">
                        <span className="text-xs">A/</span> PVE (SYNC BOT)
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
                        Alvos de treino e <strong className="text-red-400">Bosses Raros</strong>. Ideal para XP e recursos iniciais.
                      </p>
                    </div>
                    <div className="bg-white/5 p-4 border border-fuchsia-500/20 group hover:border-fuchsia-500/40 transition-colors">
                      <div className="text-fuchsia-400 font-black mb-2 flex items-center gap-2">
                        <span className="text-xs">B/</span> PVP (PLAYER)
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
                        Jogadores reais ou <strong className="text-fuchsia-400">Elites (Mercenários)</strong> que surgem para suprir a cota.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-emerald-500 font-orbitron font-black text-sm mb-6 tracking-widest uppercase italic flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500" />
                    Resolução de Combate
                  </h4>
                  <div className="bg-black/60 p-6 border border-emerald-500/20 font-mono text-[11px] text-slate-400 leading-relaxed uppercase mb-6">
                    <p className="text-white font-black mb-4 italic border-b border-white/10 pb-2">Lógica de Combate:</p>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center bg-emerald-500/5 p-2 border border-emerald-500/10">
                        <span className="text-[10px]">PODER_FINAL</span>
                        <span className="text-white text-[10px]">PWR × CRIT?</span>
                      </div>
                      <div className="flex justify-between items-center bg-emerald-500/5 p-2 border border-emerald-500/10">
                        <span className="text-[10px]">RATIO</span>
                        <span className="text-white text-[10px]">(MY_PWR / TGT_PWR) × RND</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-[10px]">
                      <div className="p-2 border border-emerald-500/30 flex justify-between items-center group hover:bg-emerald-500/10 transition-all">
                        <span className="text-emerald-400 font-bold">RATIO ≥ 2.0</span>
                        <div className="text-right">
                          <span className="text-white font-black block">VITÓRIA K.O (BÔNUS TOTAL)</span>
                          <span className="text-[8px] text-emerald-500/60 font-mono">RECOMPENSA MÁXIMA SEM PENALIDADE</span>
                        </div>
                      </div>
                      <div className="p-2 border border-emerald-500/10 flex justify-between items-center group hover:bg-emerald-500/10 transition-all">
                        <span className="text-emerald-400">RATIO &gt; 1.1</span>
                        <div className="text-right">
                          <span className="text-white block">VITÓRIA PADRÃO (BÔNUS MENOR)</span>
                          <span className="text-[8px] text-slate-500 font-mono">GANHOS BASE DE OPERAÇÃO</span>
                        </div>
                      </div>
                      <div className="p-2 border border-yellow-500/10 flex justify-between items-center group hover:bg-yellow-500/10 transition-all">
                        <span className="text-yellow-400">0.9 A 1.1</span>
                        <span className="text-white">EMPATE (RISCO DE RUPTURA)</span>
                      </div>
                      <div className="p-2 border border-red-500/20 flex justify-between items-center group hover:bg-red-500/10 transition-all">
                        <span className="text-red-400 font-bold">RATIO ≤ 0.5</span>
                        <span className="text-white font-black uppercase">DERROTA K.O - RECONDICIONAMENTO</span>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-blue-400 font-orbitron font-black text-xs mb-4 tracking-widest uppercase italic">Ganhos & Custos Operacionais</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-3">
                      <p className="text-[10px] text-emerald-400 font-black mb-2 tracking-widest">● POTENCIAL DE GANHO</p>
                      <ul className="text-[9px] font-mono text-slate-400 space-y-1 uppercase">
                        <li>• <span className="text-white font-bold">BÔNUS TOTAL (K.O):</span> XP Máximo e 12% CASH</li>
                        <li>• <span className="text-white font-bold">BÔNUS BASE (PADRÃO):</span> XP Reduzido e Loot Parcial</li>
                        <li>• <span className="text-white">ATRIBUTOS:</span> Melhoria contínua de ATK/DEF/FOC</li>
                      </ul>
                    </div>
                    <div className="bg-red-950/20 border border-red-500/20 p-3">
                      <p className="text-[10px] text-red-400 font-black mb-2 tracking-widest">● RISCOS & PENALIDADES</p>
                      <ul className="text-[9px] font-mono text-slate-400 space-y-1 uppercase">
                        <li>• <span className="text-white">Perda de CASH</span> (Em caso de derrota)</li>
                        <li>• <span className="text-white">Perda de XP</span> (-15 XP em falhas críticas)</li>
                        <li>• <span className="text-white">Recondicionamento</span> (20 min de bloqueio)</li>
                        <li>• <span className="text-white">Energia</span> (Até -20% em derrotas intensas)</li>
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="mt-12 p-6 bg-cyan-950/20 border border-cyan-500/30 relative overflow-hidden group">
               <div className="absolute inset-y-0 left-0 w-1 bg-cyan-500 group-hover:h-full transition-all duration-500 h-1/2 top-1/4" />
               <p className="text-xs font-mono text-cyan-400/80 leading-relaxed uppercase text-center italic tracking-widest">
                  &quot;A eficiência tática não reside na força bruta, mas na gestão otimizada dos seus recursos de PA.&quot;
               </p>
            </div>

            <button 
              onClick={onClose}
              className="mt-10 w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black font-orbitron uppercase tracking-[0.5em] transition-all text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
              style={MILITARY_CLIP}
            >
              FECHAR RELATÓRIO TÁTICO
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const RefreshTimer = ({ targets, isPaused }: { targets: any, isPaused: boolean }) => {
  const [seconds, setSeconds] = useState(20);
  
  useEffect(() => {
    if (isPaused) return;

    setSeconds(20);
    const interval = setInterval(() => {
      setSeconds(s => (s > 0 ? s - 1 : 20));
    }, 1000);
    return () => clearInterval(interval);
  }, [targets, isPaused]);

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
        Atualização: <span className="text-white tabular-nums inline-block min-w-[3ch] text-right">{seconds}s</span>
      </span>
    </div>
  );
};

export default function ReckoningPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isManualOpen, setIsManualOpen] = useState(false);
  
  const playerStats = calculateCombatStats(userProfile);
  const { powerSolo: playerPower } = calculateTotalPower(userProfile || {}, userProfile?.active_chips || []);

  const playerLevel = userProfile?.level || 1;
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [battleResults, setBattleResults] = useState<Record<string, any>>({});

  const isAnyResultShowing = Object.keys(battleResults).length > 0;
  const isCurrentlyProcessing = !!processingId;

  const { data: radarData, mutate } = useSWR(
    playerLevel >= 10 ? "/combat/radar" : null, 
    combatService.getRadarTokens,
    { 
      revalidateOnFocus: false, 
      refreshInterval: (isAnyResultShowing || isCurrentlyProcessing) ? 0 : 20000 
    }
  );

  const targets = radarData?.targets;
  const limits = radarData?.limits;

  const handleInstantAttack = async (targetId: string) => {
    const currentPA = userProfile?.action_points || 0;
    const currentEN = userProfile?.energy || 0;

    if (currentPA < 250) {
      showToast("PONTOS DE AÇÃO INSUFICIENTES (REQUER 250 PA)", "warning");
      return;
    }
    if (currentEN < 10) {
      showToast("ENERGIA INSUFICIENTE (REQUER 10%)", "warning");
      return;
    }
    
    setProcessingId(targetId);
    soundEngine.playClick();
    
    try {
      const result = await combatService.instantAttack(targetId);
      
      setBattleResults(prev => ({ ...prev, [targetId]: result }));
      
      // SÊNIOR: Delay de 8 segundos para o jogador ler o resultado no próprio card
      await new Promise(resolve => setTimeout(resolve, 8000));
      await refreshProfile();
      
      if (result.outcome.includes("LOSS")) {
        navigate("/recovery-base");
      } else {
        mutate();
        // Limpa o resultado após o refresh para não poluir novos alvos na mesma posição
        setBattleResults(prev => {
          const newState = { ...prev };
          delete newState[targetId];
          return newState;
        });
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro no combate", "error");
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    // SÊNIOR: Só redireciona automaticamente se o jogador já estiver em recondicionamento
    // ao entrar na página, ou se o status mudar e NÃO estivermos mostrando um resultado de luta.
    if (userProfile?.status === "Recondicionamento" && !isAnyResultShowing && !isCurrentlyProcessing) {
      navigate("/recovery-base");
    }
  }, [userProfile?.status, navigate, isAnyResultShowing, isCurrentlyProcessing]);

  if (userProfile?.status === "Recondicionamento" && !isAnyResultShowing && !isCurrentlyProcessing) return null;

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

              <div 
                onClick={() => setIsManualOpen(true)}
                className="bg-cyan-950/40 backdrop-blur-md border border-cyan-500/30 p-2 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all group cursor-pointer" 
                style={MILITARY_CLIP} 
                title="Como Funciona"
              >
                <QuestionMarkCircleIcon className="w-8 h-8 text-cyan-500 group-hover:scale-110 transition-transform" />
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 px-3 py-1.5 bg-black/60 border border-yellow-500/20 backdrop-blur-sm" style={MILITARY_CLIP}>
                   <ShieldExclamationIcon className="w-3.5 h-3.5 text-yellow-500" />
                   {limits?.reset_at ? (
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] font-mono text-red-500 animate-pulse uppercase tracking-widest font-black">RESET EM:</span>
                        <span className="text-xs font-orbitron font-black text-white">
                          <CountdownReset resetAt={limits.reset_at} />
                        </span>
                      </div>
                   ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter">PvP/Elite:</span>
                        <span className={`text-[10px] font-orbitron font-black ${(limits?.pvp ?? 0) >= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{limits?.pvp || 0}/5</span>
                      </div>
                      <div className="w-[1px] h-3 bg-yellow-500/20 mx-1" />
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter">PvE/Sync:</span>
                        <span className={`text-[10px] font-orbitron font-black ${(limits?.pve ?? 0) >= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{limits?.pve || 0}/5</span>
                      </div>
                    </>
                   )}
                </div>
                 {!limits?.reset_at && (
                   <RefreshTimer targets={targets} isPaused={isAnyResultShowing || isCurrentlyProcessing} />
                 )}
              </div>
          </div>
        </div>

        {!limits?.reset_at && (
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
                      <span className="text-[9px] font-orbitron font-black text-emerald-400 italic">250 PA</span>
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
        )}
      </header>

      <div className="max-w-6xl mx-auto">
        {userProfile?.status === "Ruptura" && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-950/80 border-l-2 border-r-2 border-red-500 p-3 md:p-4 flex items-center shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
            style={MILITARY_CLIP}
          >
             <div className="flex items-center gap-3 md:gap-4">
               <div className="w-8 h-8 md:w-10 md:h-10 bg-red-600/20 border border-red-500/50 flex items-center justify-center animate-pulse flex-shrink-0">
                 <ExclamationTriangleIcon className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
               </div>
               <div>
                 <h3 className="font-orbitron font-black text-white uppercase tracking-tighter text-[11px] md:text-sm">SISTEMA EM RUPTURA</h3>
                 <p className="text-[9px] md:text-[10px] font-mono text-slate-400 uppercase leading-tight max-w-2xl">
                   Integridade comprometida (-20% Power). Aguarde estabilização ou utilize a <span className="text-red-400 font-black">Base de Recuperação</span> para reparos imediatos.
                 </p>
               </div>
             </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {limits?.reset_at ? (
            <motion.div 
              key="cooldown"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="pt-2 pb-20 flex flex-col items-center justify-start text-center relative overflow-hidden"
            >
               <div className="absolute inset-0 bg-red-500/5 radial-gradient pointer-events-none" />
               <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 animate-pulse relative z-10" style={MILITARY_CLIP}>
                  <ClockIcon className="w-10 h-10 text-red-500" />
               </div>
               <h2 className="text-2xl md:text-4xl font-orbitron font-black text-white uppercase tracking-[0.2em] mb-6 relative z-10">Matriz em Recarga</h2>
               
               <div className="bg-red-950/40 border-y border-red-500/30 py-6 mb-10 relative z-10 w-full backdrop-blur-sm">
                 <p className="text-xs md:text-sm font-mono text-red-400 uppercase max-w-2xl mx-auto leading-relaxed tracking-[0.12em] px-8 font-black">
                    <span className="text-red-500 animate-pulse mr-2">⚠️ [AVISO CRÍTICO]</span> 
                    Protocolo de segurança ativado. Os sistemas de sincronização tática requerem 24h para reidratação energética completa após exaustão total de carga. Aguarde a estabilização da rede.
                 </p>
               </div>

               <div className="px-12 py-5 bg-red-600/20 border border-red-500/60 text-3xl md:text-5xl font-orbitron font-black text-white shadow-[0_0_50px_rgba(239,68,68,0.3)] relative z-10" style={MILITARY_CLIP}>
                  <CountdownReset resetAt={limits.reset_at} />
               </div>
            </motion.div>
          ) : (
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
                            <p className="text-[9px] uppercase font-mono text-yellow-500/60 font-black tracking-[0.2em]">{tgt.is_npc ? (tgt.is_elite ? 'ELITE_SIGNAL' : 'SYNC_BOT') : 'PLAYER_SIGNAL'}</p>
                            <h3 className={`font-orbitron font-black text-sm truncate tracking-wider transition-colors ${tgt.is_rare ? 'text-red-500 group-hover:text-red-400' : 'text-white group-hover:text-yellow-400'}`}>
                              {tgt.name}
                            </h3>
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
                          disabled={!!processingId || !!battleResults[tgt.id]}
                          className="px-6 py-2 bg-red-600/90 hover:bg-red-500 text-white font-orbitron font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50 transition-all relative overflow-hidden"
                          style={MILITARY_CLIP}
                        >
                          {processingId === tgt.id ? (
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                              Sync...
                            </span>
                          ) : "Atacar"}
                        </button>
                      </div>

                      {/* Decorative side bar for the card */}
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-yellow-500/20 group-hover:bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0)] group-hover:shadow-[0_0_15px_rgba(234,179,8,0.6)] transition-all duration-300"></div>

                      {isRisky && !tgt.is_elite && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-500/20 px-2 py-0.5 border border-red-500/30">
                          <ExclamationTriangleIcon className="w-3 h-3 text-red-500 animate-pulse" />
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">ALTO RISCO</span>
                        </div>
                      )}

                      {tgt.is_elite && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-fuchsia-600 px-3 py-0.5 border border-fuchsia-400 shadow-[0_0_15px_rgba(192,38,211,0.4)] rotate-3 z-10">
                           <ShieldCheckIcon className="w-3 h-3 text-white" />
                           <span className="text-[8px] font-black text-white uppercase tracking-widest font-orbitron">ELITE</span>
                        </div>
                      )}
                      
                      {!isRisky && !tgt.is_elite && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <BoltIcon className="w-3 h-3 text-emerald-500" />
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">ALVO ÓTIMO</span>
                        </div>
                      )}

                      {/* COMBAT RESULT OVERLAY */}
                      <AnimatePresence>
                        {battleResults[tgt.id] && (
                          <motion.div 
                            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                            className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center ${
                              battleResults[tgt.id].outcome.includes("WIN") ? 'bg-emerald-950/90' : 
                              battleResults[tgt.id].outcome === "DRAW" ? 'bg-amber-950/90' : 'bg-red-950/90'
                            }`}
                          >
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/20">
                              <motion.div 
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 8, ease: "linear" }}
                                className={`h-full ${
                                  battleResults[tgt.id].outcome.includes("WIN") ? 'bg-emerald-400' : 
                                  battleResults[tgt.id].outcome === "DRAW" ? 'bg-amber-400' : 'bg-red-400'
                                }`}
                              />
                            </div>

                            <motion.div
                              initial={{ scale: 0.8, y: 10 }}
                              animate={{ scale: 1, y: 0 }}
                              className="relative"
                            >
                              <div className={`text-[9px] font-black font-orbitron uppercase tracking-[0.3em] mb-1 ${
                                battleResults[tgt.id].outcome.includes("WIN") ? 'text-emerald-400' : 
                                battleResults[tgt.id].outcome === "DRAW" ? 'text-amber-400' : 'text-red-400'
                              }`}>
                                {battleResults[tgt.id].outcome.replace('_', ' ')}
                              </div>
                              <h4 className="text-white/70 font-bold uppercase text-[9px] md:text-[10px] mb-3 md:mb-4 tracking-widest leading-tight px-2 max-w-[200px] mx-auto">{battleResults[tgt.id].message}</h4>
                              
                              <div className="grid grid-cols-2 gap-2 mb-3 md:mb-4">
                                <div className="bg-black/40 p-2.5 border border-white/5">
                                  <span className="block text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Créditos</span>
                                  <span className={`text-sm font-black font-orbitron ${battleResults[tgt.id].loot?.moneyLost ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {battleResults[tgt.id].loot?.money ? `+${battleResults[tgt.id].loot.money.toLocaleString()}` : 
                                     battleResults[tgt.id].loot?.moneyLost ? `-${battleResults[tgt.id].loot.moneyLost.toLocaleString()}` : '0'}
                                  </span>
                                </div>
                                <div className="bg-black/40 p-2.5 border border-white/5">
                                  <span className="block text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Experiência</span>
                                  <span className={`text-sm font-black font-orbitron ${battleResults[tgt.id].loot?.xp > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {battleResults[tgt.id].loot?.xp > 0 ? '+' : ''}{battleResults[tgt.id].loot?.xp} XP
                                  </span>
                                </div>
                              </div>

                              {battleResults[tgt.id].loot?.stats && Object.keys(battleResults[tgt.id].loot.stats).length > 0 && (
                                <div className="flex flex-wrap justify-center gap-2 mb-4">
                                  {Object.entries(battleResults[tgt.id].loot.stats).map(([stat, val]: [string, any]) => (
                                    <div key={stat} className="bg-emerald-500 border border-emerald-400 px-3 py-1 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                      <span className="text-[10px] font-black text-black uppercase tracking-widest font-orbitron">
                                        {stat.substring(0,3)} {Number(val) > 0 ? '+' : ''}{val}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {(battleResults[tgt.id].battleReport) && (
                                <div className="bg-black/60 p-2.5 border border-white/10 mb-2">
                                  <div className="flex justify-between items-center text-[9px] font-mono mb-1">
                                    <span className="text-slate-400 uppercase">Sua Força:</span>
                                    <span className="text-white font-black text-xs">{battleResults[tgt.id].battleReport.pPower.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[9px] font-mono">
                                    <span className="text-slate-400 uppercase">Alvo Força:</span>
                                    <span className="text-white font-black text-xs">{battleResults[tgt.id].battleReport.oPower.toLocaleString()}</span>
                                  </div>
                                </div>
                              )}

                              {battleResults[tgt.id].battleReport?.pIsCrit && (
                                <div className="text-[8px] font-black text-yellow-400 uppercase animate-pulse mb-1">🔥 IMPACTO CRÍTICO DETECTADO</div>
                              )}
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                   );
                 })}
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
      <BattleRulesInfo isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
    </div>
  );
}