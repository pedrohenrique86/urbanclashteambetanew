import React, { useState, useEffect, useCallback } from "react";
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

/**
 * TRAINING PAGE - AAA Military Cyberpunk Aesthetic
 * UrbanClash Team - Tactical Elite HUD
 */

// Estilo de chanfro militar
const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

const TRAINING_OPTIONS = [
  {
    id: "pequeno",
    name: "TREINO TÉCNICO",
    description: "Foco em precisão e disciplina. A melhor escolha para maximizar o FOCO (FOC).",
    duration: 20,
    costs: { ap: 100, cash: 100, energy: 15 },
    gains: { atk: 1, def: 1, foc: 3, xp: 120 },
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
    gains: { atk: 5, def: 5, foc: 2, xp: 350 },
    icon: <ShieldCheckIcon className="w-8 h-8 text-violet-400 group-hover:text-violet-300 transition-colors" />,
    role: "EQUILÍBRIO TÁTICO",
    color: "violet"
  },
  {
    id: "grande",
    name: "PROTOCOLO DE ASSALTO",
    description: "Intensidade máxima. Foco total em poder de ATAQUE (ATK) bruto e XP.",
    duration: 100,
    costs: { ap: 500, cash: 800, energy: 70 },
    gains: { atk: 12, def: 4, foc: 2, xp: 800 },
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

  const subtitle = "UNIDADE EM PRONTIDÃO. EFICIÊNCIA É A ÚNICA MÉTRICA QUE IMPORTA.";

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'H ' : ''}${m > 0 ? m + 'M ' : ''}${s}S`;
  };

  const handleStart = useCallback(async (type: string) => {
    setLoading(type);
    try {
      const res = await trainingService.startTraining(type);
      showToast("TREINAMENTO INICIADO COM SUCESSO!", "success");
      await refreshProfile();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setLoading(null);
    }
  }, [showToast, refreshProfile]);

  const handleComplete = useCallback(async () => {
    if (loading === "completing") return;
    setLoading("completing");
    try {
      const res = await trainingService.completeTraining();
      showToast(
        `${res.message} [ +${res.gains.attack} ATK, +${res.gains.defense} DEF, +${res.gains.focus} FOC, +${res.gains.xp} XP ]`, 
        "success", 
        7000
      );
      await refreshProfile();
    } catch (err: any) {
      await refreshProfile();
    } finally {
      setLoading(null);
    }
  }, [loading, showToast, refreshProfile]);

  const updateCountdown = useCallback(() => {
    if (!userProfile?.training_ends_at) {
      setTimeLeft(null);
      return;
    }
    const endsAt = new Date(userProfile.training_ends_at).getTime();
    const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
    setTimeLeft(remaining);
    if (remaining === 0 && userProfile.active_training_type) {
      handleComplete();
    }
  }, [userProfile?.training_ends_at, userProfile?.active_training_type, handleComplete]);

  useEffect(() => {
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [updateCountdown]);

  const isTraining = !!(userProfile?.training_ends_at && timeLeft && timeLeft > 0);
  const trainingsLeft = 8 - (userProfile?.daily_training_count || 0);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-950 bg-[radial-gradient(circle_at_50%_-20%,rgba(14,165,233,0.15),transparent_80%)] relative text-slate-300 font-sans selection:bg-cyan-500/30">
      {/* GRID BACKGROUND */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

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
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 text-slate-400">SEC_LEVEL: 4</span>
            <span className="text-[10px] font-mono text-cyan-500/70 animate-pulse tracking-widest">● SYSTEM_ONLINE</span>
            <p className="text-slate-500 text-xs font-mono hidden md:block uppercase tracking-tighter">
              {subtitle}
            </p>
          </div>
        </motion.div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SIDEBAR: STATUS */}
        <div className="lg:col-span-4 space-y-6 relative z-10">
          
          {/* DAILY LIMIT CARD */}
          <div 
            className="bg-white/5 backdrop-blur-3xl border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.1),inset_0_1px_rgba(255,255,255,0.1)] p-6 relative group overflow-hidden"
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
                  <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">UNITS_AVAIL</span>
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
                className="bg-white/5 backdrop-blur-3xl border border-violet-500/40 shadow-[0_0_50px_rgba(139,92,246,0.15),inset_0_1px_rgba(255,255,255,0.1)] p-6 relative"
                style={MILITARY_CLIP}
              >
                {/* Corner Markers */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-violet-500/50"></div>
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-violet-500/50"></div>
                
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="font-orbitron text-white text-xl font-black uppercase tracking-widest">Engaged</h3>
                    <p className="text-cyan-400 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">
                      {TRAINING_OPTIONS.find(o => o.id === userProfile?.active_training_type)?.role}
                    </p>
                  </div>
                  <div className="bg-violet-500/20 p-2 border border-violet-500/30 animate-pulse">
                    <ClockIcon className="w-6 h-6 text-violet-400" />
                  </div>
                </div>

                <div className="bg-black/60 p-6 border border-white/5 mb-6 text-center">
                  <span className="text-[10px] text-slate-500 font-mono block mb-2 uppercase">Time_to_Completion</span>
                  <p className="text-5xl font-orbitron font-black text-white tracking-tighter">
                    {formatTime(timeLeft || 0)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-2 border border-white/5">
                    <span className="text-[8px] text-slate-500 block uppercase">Start_Log</span>
                    <span className="text-[10px] text-slate-300 font-mono">
                      {new Date(new Date(userProfile?.training_ends_at || 0).getTime() - (TRAINING_OPTIONS.find(o => o.id === userProfile?.active_training_type)?.duration || 0) * 60000).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 border border-white/5">
                    <span className="text-[8px] text-slate-500 block uppercase">ETA_Log</span>
                    <span className="text-[10px] text-slate-300 font-mono">
                      {new Date(userProfile?.training_ends_at || 0).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/5 backdrop-blur-3xl border-2 border-white/10 border-dashed p-10 flex flex-col items-center justify-center text-center opacity-60"
                style={MILITARY_CLIP}
              >
                <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-4">
                   <AcademicCapIcon className="w-8 h-8 text-slate-700" />
                </div>
                <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                  Status: Inativo<br/>Aguardando Instruções
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* MAIN: TRAINING OPTIONS */}
        <div className="lg:col-span-8 space-y-4 relative z-10">
          {TRAINING_OPTIONS.map((opt, idx) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className={`group relative bg-white/5 backdrop-blur-3xl border transition-all duration-300 hover:bg-white/10 hover:-translate-y-1 shadow-[0_0_40px_rgba(34,211,238,0.1),inset_0_1px_rgba(255,255,255,0.1)]
                ${opt.id === 'grande' ? 'border-fuchsia-500/40 hover:border-fuchsia-400/60' : 
                  opt.id === 'medio' ? 'border-violet-500/40 hover:border-violet-400/60' : 
                  'border-cyan-500/40 hover:border-cyan-400/60'}`}
              style={MILITARY_CLIP}
            >
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-stretch">
                {/* ICON & ROLE */}
                <div className="flex flex-col items-center justify-center gap-4 bg-black/40 p-6 border border-white/5 w-full md:w-40">
                  <div className="p-4 bg-white/5 group-hover:scale-110 transition-transform shadow-inner border border-white/5">
                    {opt.icon}
                  </div>
                  <span className={`text-[10px] font-black text-center uppercase tracking-tighter
                    ${opt.id === 'grande' ? 'text-fuchsia-400' : opt.id === 'medio' ? 'text-violet-400' : 'text-cyan-400'}`}>
                    {opt.role}
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-2xl font-orbitron font-black text-white tracking-widest uppercase">{opt.name}</h3>
                      <div className="flex items-center gap-2 bg-white/5 px-3 py-1 border border-white/10 font-mono text-xs">
                        <ClockIcon className="w-4 h-4 text-slate-500" />
                        <span className="text-white">{opt.duration}M</span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed italic border-l-2 border-white/10 pl-4">
                      {opt.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    {/* COSTS */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest w-full mb-1">Resource_Cost:</span>
                      <div className="bg-red-500/10 border border-red-500/30 px-2 py-1 flex items-center gap-2">
                        <BoltIcon className="w-3 h-3 text-red-500" />
                        <span className="text-xs font-bold text-red-200">-{opt.costs.ap} AP</span>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/30 px-2 py-1 flex items-center gap-2">
                        <BanknotesIcon className="w-3 h-3 text-green-500" />
                        <span className="text-xs font-bold text-green-200">${opt.costs.cash}</span>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 flex items-center gap-2">
                        <FireIcon className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs font-bold text-yellow-200">-{opt.costs.energy}%</span>
                      </div>
                    </div>

                    {/* GAINS */}
                    <div className="flex flex-wrap gap-2 items-center md:justify-end">
                       <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest w-full mb-1 md:text-right">Projected_Yield:</span>
                       <div className="bg-white/5 border border-white/10 px-2 py-1 text-[11px] font-bold">
                         <span className="text-cyan-400">+{opt.gains.atk}</span> ATK
                       </div>
                       <div className="bg-white/5 border border-white/10 px-2 py-1 text-[11px] font-bold">
                         <span className="text-cyan-400">+{opt.gains.def}</span> DEF
                       </div>
                       <div className="bg-white/5 border border-white/10 px-2 py-1 text-[11px] font-bold">
                         <span className="text-cyan-400">+{opt.gains.foc}</span> FOC
                       </div>
                       <div className="bg-white/5 border border-white/10 px-2 py-1 text-[11px] font-bold">
                         <span className="text-cyan-400">+{opt.gains.xp}</span> XP
                       </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStart(opt.id)}
                    disabled={isTraining || loading !== null || trainingsLeft <= 0}
                    className={`w-full py-4 font-orbitron font-black text-sm tracking-[0.3em] transition-all duration-150 relative overflow-hidden group
                      ${isTraining || trainingsLeft <= 0 
                        ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50 backdrop-blur-md' 
                        : 'bg-cyan-500/10 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] active:translate-y-px active:shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                      }`}
                    style={MILITARY_CLIP}
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
      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40 grayscale hover:grayscale-0 transition-all relative z-10">
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