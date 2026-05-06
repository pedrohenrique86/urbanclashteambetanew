import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import { trainingService } from "../services/trainingService";
import { useToast } from "../contexts/ToastContext";
import { 
  BoltIcon, 
  BanknotesIcon, 
  FireIcon, 
  ClockIcon, 
  AcademicCapIcon,
  ShieldCheckIcon,
  TrophyIcon,
  CursorArrowRaysIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { calculateTrainingCost } from "../utils/leveling";


/**
 * TRAINING PAGE - AAA Military Cyberpunk Aesthetic
 * UrbanClash Team - Tactical Elite HUD
 */

// HUD Corners e utilitários já estão no index.css via classes .military-clip, etc.
const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

const TRAINING_OPTIONS = [
  {
    id: "pequeno",
    name: "TREINO TÉCNICO",
    description: "Foco em precisão e disciplina. A melhor escolha para maximizar o FOCO (FOC).",
    duration: 20,
    costs: { ap: 100, cash: 100, energy: 15 },
    gains: { atk: 1, def: 1, foc: 3, xp: 30 },
    icon: <CursorArrowRaysIcon className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />,
    role: "ESPECIALISTA EM FOCO",
    color: "cyan"
  },
  {
    id: "medio",
    name: "SIMULAÇÃO TÁTICA",
    description: "Desenvolvimento versátil. Equilíbrio perfeito entre ATAQUE (ATK) e DEFESA (DEF).",
    duration: 50,
    costs: { ap: 250, cash: 300, energy: 35 },
    gains: { atk: 5, def: 5, foc: 2, xp: 90 },
    icon: <ShieldCheckIcon className="w-8 h-8 text-violet-400 group-hover:text-violet-300 transition-colors" />,
    role: "EQUILÍBRIO TÁTICO",
    color: "violet"
  },
  {
    id: "grande",
    name: "PROTOCOLO ASSALTO",
    description: "Intensidade máxima. Foco total em poder de ATAQUE (ATK) bruto e XP.",
    duration: 100,
    costs: { ap: 500, cash: 800, energy: 70 },
    gains: { atk: 12, def: 4, foc: 2, xp: 200 },
    icon: <TrophyIcon className="w-8 h-8 text-fuchsia-400 group-hover:text-fuchsia-300 transition-colors" />,
    role: "FORÇA BRUTA",
    color: "fuchsia"
  }
];

export default function TrainingPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // Ref para garantir que auto-complete só dispara UMA vez por sessão de treino
  const completingRef = useRef(false);

  const subtitle = "UNIDADE EM PRONTIDÃO. EFICIÊNCIA É A ÚNICA MÉTRICA QUE IMPORTA.";

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'H ' : ''}${m > 0 ? m + 'M ' : ''}${s}S`;
  };

  const handleStart = useCallback(async (type: string) => {
    // Reset da proteção ao iniciar novo treino
    completingRef.current = false;
    setLoading(type);
    try {
      await trainingService.startTraining(type);
      showToast("Treinamento iniciado!", "success");
      await refreshProfile();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setLoading(null);
    }
  }, [showToast, refreshProfile]);

  const handleComplete = useCallback(async () => {
    // Proteção dupla: ref (estável entre re-renders) + state
    if (completingRef.current) return;
    completingRef.current = true;
    setLoading("completing");
    try {
      const res = await trainingService.completeTraining();
      showToast(
        `${res.message} [ +${res.gains.attack} ATK, +${res.gains.defense} DEF, +${res.gains.focus} FOC, +${res.gains.xp} XP ]`,
        "success",
        7000
      );
      if (res.unlock_acerto_de_contas) {
        setTimeout(() => {
          showToast("Spectro: Radar ativo. O Acerto de Contas foi liberado!", "success", 5000);
        }, 1000);
      }
      await refreshProfile();
    } catch (err: any) {
      // Em caso de erro, allow retry
      completingRef.current = false;
      const msg = err.response?.data?.error || err.message || "Erro ao completar treino";
      showToast(msg, "error");
      await refreshProfile();
    } finally {
      setLoading(null);
    }
  }, [showToast, refreshProfile]);

  // Ref estável que aponta para a versão mais recente de handleComplete
  // Evita que o countdown recriar o interval ao mudar o loading state
  const handleCompleteRef = useRef(handleComplete);
  useEffect(() => {
    handleCompleteRef.current = handleComplete;
  }, [handleComplete]);

  useEffect(() => {
    // Se não há treino ativo nem data de término, não há nada a fazer
    if (!userProfile?.training_ends_at || !userProfile?.active_training_type) {
      setTimeLeft(null);
      // NÃO resetamos completingRef aqui — o SSE pode chegar enquanto handleComplete
      // ainda está rodando, causando reset prematuro. Só resetamos em handleStart.
      return;
    }

    const endsAtMs = new Date(userProfile.training_ends_at).getTime();

    // Valida se a data é válida (defende contra strings inválidas do Redis)
    if (isNaN(endsAtMs)) {
      setTimeLeft(null);
      return;
    }

    // Captura o tipo de treino no momento que o effect roda — estável por closure
    const trainingTypeAtMount = userProfile.active_training_type;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick(); // executa imediatamente ao montar
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  // Dependência apenas nos dados concretos do treino, NÃO no handleComplete
  }, [userProfile?.training_ends_at, userProfile?.active_training_type]);


  const isTraining = !!(userProfile?.training_ends_at && timeLeft && timeLeft > 0);
  const trainingsLeft = Math.max(0, 8 - (userProfile?.daily_training_count || 0));

  return (
    <div className="min-h-screen p-4 md:p-8 bg-transparent relative text-slate-300 font-sans selection:bg-cyan-500/30">

      {/* HUD DECORATION - CORNERS */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-cyan-500/10 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-500/50"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-cyan-500/50"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-cyan-500/50"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-500/50"></div>
      </div>

      {/* HEADER */}
      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(34,211,238,0.7), -2px 0px 0px rgba(139,92,246,0.7)" }}>
            Military <span className="text-cyan-400">Training</span> HUB
          </h1>
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              {/* Badge SEC LEVEL Estilizado */}
              <div className="flex items-center overflow-hidden border border-cyan-500/40 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-cyan-500 px-2 py-0.5">
                   <span className="text-[9px] font-black text-black uppercase">SEC_LEVEL</span>
                </div>
                <div className="px-3 py-0.5">
                   <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest">04_TACTICAL_AUTH</span>
                </div>
              </div>

              <div className="h-4 w-px bg-slate-800"></div>

              <span className="text-[10px] font-mono text-cyan-400/80 animate-pulse tracking-widest font-bold uppercase">● System_Online_V4</span>
            </div>
            
            <p className="text-slate-300 text-[10px] font-mono tracking-[0.2em] uppercase bg-white/5 py-1 px-3 border-l-2 border-cyan-500/50 w-fit backdrop-blur-sm">
              {subtitle}
            </p>
          </div>
        </motion.div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* SIDEBAR: STATUS - Agora como uma linha horizontal no topo ou integrada */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* DAILY LIMIT CARD */}
            <div 
              className="cyber-card p-6 relative group"
              style={MILITARY_CLIP}
            >
              <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
                <ExclamationTriangleIcon className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-[10px] font-orbitron text-cyan-500 mb-6 flex items-center gap-2 tracking-[0.3em]">
                <div className="w-2 h-2 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,1)]"></div> LIMIT_CAPACITY
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-6xl font-black text-white font-orbitron leading-none">{trainingsLeft}</span>
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">UNITS_AVAIL</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(trainingsLeft / 8) * 100}%` }}
                      className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)] relative"
                    >
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(0,0,0,0.2)_5px,rgba(0,0,0,0.2)_10px)]"></div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTIVE STATUS */}
            <AnimatePresence mode="wait">
              {isTraining ? (
                <motion.div 
                  key="active"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="cyber-card cyber-card-violet p-6 relative"
                  style={MILITARY_CLIP}
                >
                  {/* Corner Markers */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-violet-500/50"></div>
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-violet-500/50"></div>
                  
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-orbitron text-white text-xl font-black uppercase tracking-widest leading-none">Engaged</h3>
                      <p className="text-cyan-400 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">
                        {TRAINING_OPTIONS.find(o => o.id === userProfile?.active_training_type)?.role}
                      </p>
                    </div>
                    <div className="bg-violet-500/20 p-2 border border-violet-500/30 animate-pulse">
                      <ClockIcon className="w-5 h-5 text-violet-400" />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex-1 bg-black/60 p-4 border border-white/5 text-center">
                      <span className="text-[10px] text-slate-400 font-mono block mb-1 uppercase">Time_Left</span>
                      <p className="text-3xl font-orbitron font-black text-white tracking-tighter">
                        {formatTime(timeLeft || 0)}
                      </p>
                    </div>

                    <div className="space-y-2">
                        <div className="bg-white/5 p-2 border border-white/5 min-w-[100px]">
                          <span className="text-[8px] text-slate-400 block uppercase">Start</span>
                          <span className="text-[10px] text-slate-300 font-mono">
                            {new Date(new Date(userProfile?.training_ends_at || 0).getTime() - (TRAINING_OPTIONS.find(o => o.id === userProfile?.active_training_type)?.duration || 0) * 60000).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="bg-white/5 p-2 border border-white/5 min-w-[100px]">
                          <span className="text-[8px] text-slate-400 block uppercase">ETA</span>
                          <span className="text-[10px] text-slate-300 font-mono">
                            {new Date(userProfile?.training_ends_at || 0).toLocaleTimeString()}
                          </span>
                        </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-black/40 backdrop-blur-md border-2 border-white/10 border-dashed p-6 flex items-center justify-center gap-6 text-center opacity-60 military-clip"
                >
                  <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
                     <AcademicCapIcon className="w-6 h-6 text-slate-700" />
                  </div>
                  <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest leading-relaxed text-left">
                    Status: Inativo<br/>Aguardando Instruções
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* MAIN: TRAINING OPTIONS */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {TRAINING_OPTIONS.map((opt, idx) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className={`group relative cyber-card transition-all duration-300 hover:bg-white/5 hover:-translate-y-1
                ${opt.id === 'grande' ? 'cyber-card-fuchsia' : 
                  opt.id === 'medio' ? 'cyber-card-violet' : 
                  ''}`}
              style={MILITARY_CLIP}
            >
              <div className="p-6 flex flex-col gap-6 text-center">
                {/* ICON & ROLE */}
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-white/5 group-hover:scale-110 transition-transform shadow-inner border border-white/5 relative">
                    {opt.icon}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-tighter
                    ${opt.id === 'grande' ? 'text-fuchsia-400' : opt.id === 'medio' ? 'text-violet-400' : 'text-cyan-400'}`}>
                    {opt.role}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-orbitron font-black text-white tracking-wider uppercase mb-1">{opt.name}</h3>
                    <div className="flex items-center justify-center gap-2 font-mono text-[10px]">
                      <ClockIcon className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-300">{opt.duration} MINUTOS</span>
                    </div>
                  </div>
                  
                  <p className="text-slate-400 text-xs font-medium leading-relaxed italic h-12 flex items-center justify-center">
                    {opt.description}
                  </p>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    {/* COSTS */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-red-500/10 border border-red-500/20 p-2 flex flex-col items-center">
                        <BoltIcon className="w-3 h-3 text-red-500 mb-1" />
                        <span className="text-[10px] font-bold text-red-200">{opt.costs.ap} PA</span>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 p-2 flex flex-col items-center">
                        <BanknotesIcon className="w-3 h-3 text-green-500 mb-1" />
                        <span className="text-[10px] font-bold text-green-200">
                          ${calculateTrainingCost(opt.costs.cash, userProfile?.level || 1).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 flex flex-col items-center">
                        <FireIcon className="w-3 h-3 text-yellow-500 mb-1" />
                        <span className="text-[10px] font-bold text-yellow-200">{opt.costs.energy}% EN</span>
                      </div>
                    </div>

                    {/* GAINS */}
                    <div className="flex flex-wrap gap-1 justify-center">
                       <div className="bg-white/1 border border-white/10 px-2 py-0.5 text-[9px] font-bold">
                         <span className="text-cyan-400">+{opt.gains.atk}</span> ATK
                       </div>
                       <div className="bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-bold">
                         <span className="text-cyan-400">+{opt.gains.def}</span> DEF
                       </div>
                       <div className="bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-bold">
                         <span className="text-cyan-400">+{opt.gains.xp}</span> XP
                       </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStart(opt.id)}
                    disabled={isTraining || loading !== null || trainingsLeft <= 0}
                    className={`w-full py-4 cyber-button military-clip
                      ${isTraining || trainingsLeft <= 0 ? 'opacity-50 grayscale' : ''}`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading === opt.id ? (
                         <>
                           <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                           INITIALIZING...
                         </>
                       ) : 
                       isTraining ? 'LOCKDOWN: ACTIVE_SESSION' : 
                       trainingsLeft <= 0 ? 'LIMIT_REACHED' : 'ENGAGE_TRAINING'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Decorative side bar for the card */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 
                ${opt.id === 'grande' ? 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.8)]' : opt.id === 'medio' ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]'}`}>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FOOTER - TECHNICAL INFO */}
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