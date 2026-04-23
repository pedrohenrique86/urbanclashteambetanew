import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  CursorArrowRaysIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

/**
 * TRAINING PAGE - AAA Gaming Aesthetic
 * UrbanClash Team - Tactical HUD Style
 */

// Constantes de treinamento (espelhadas do backend para evitar delay de fetch)
const TRAINING_OPTIONS = [
  {
    id: "pequeno",
    name: "TREINO TÉCNICO",
    description: "Foco em precisão e disciplina. A melhor escolha para maximizar o FOCO (FOC).",
    duration: 20,
    costs: { ap: 400, cash: 100, energy: 15 },
    gains: { atk: 1, def: 1, foc: 3, xp: 40 },
    icon: <CursorArrowRaysIcon className="w-8 h-8 text-cyan-400" />,
    role: "ESPECIALISTA EM FOCO"
  },
  {
    id: "medio",
    name: "SIMULAÇÃO TÁTICA",
    description: "Desenvolvimento versátil. Equilíbrio perfeito entre ATAQUE (ATK) e DEFESA (DEF).",
    duration: 50,
    costs: { ap: 1000, cash: 300, energy: 35 },
    gains: { atk: 5, def: 5, foc: 2, xp: 110 },
    icon: <ShieldCheckIcon className="w-8 h-8 text-blue-400" />,
    role: "EQUILÍBRIO TÁTICO"
  },
  {
    id: "grande",
    name: "PROTOCOLO DE ASSALTO",
    description: "Intensidade máxima. Foco total em poder de ATAQUE (ATK) bruto e XP.",
    duration: 100,
    costs: { ap: 2400, cash: 800, energy: 70 },
    gains: { atk: 12, def: 4, foc: 2, xp: 280 },
    icon: <TrophyIcon className="w-8 h-8 text-orange-400" />,
    role: "FORÇA BRUTA"
  }
];

export default function TrainingPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Humor seco cyberpunk
  const subtitle = "Treine duro, sobreviva mais um dia e finja que isso tudo foi escolha sua.";

  // Formatação de tempo (countdown)
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleStart = useCallback(async (type: string) => {
    setLoading(type);
    try {
      const res = await trainingService.startTraining(type);
      showToast(res.message, "success");
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
      // Se der erro de "nenhum treino", apenas dá refresh pra sincronizar
      await refreshProfile();
    } finally {
      setLoading(null);
    }
  }, [loading, showToast, refreshProfile]);

  // Cálculo de tempo restante
  const updateCountdown = useCallback(() => {
    if (!userProfile?.training_ends_at) {
      setTimeLeft(null);
      return;
    }

    const endsAt = new Date(userProfile.training_ends_at).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));

    setTimeLeft(remaining);

    // Se acabou o tempo e ainda consta como ativo, tenta completar
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
    <div className="min-h-screen p-4 md:p-8 text-slate-200">
      {/* HEADER */}
      <header className="max-w-6xl mx-auto mb-10 text-center md:text-left">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-orbitron font-black tracking-tighter text-white mb-2"
          style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}
        >
          CENTRO DE <span className="text-cyan-500">TREINAMENTO</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 italic font-medium"
        >
          &quot;{subtitle}&quot;
        </motion.p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LADO ESQUERDO: STATUS & ACTIVE */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* DAILY LIMIT CARD */}
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
            <h3 className="text-sm font-orbitron text-slate-400 mb-4 flex items-center gap-2">
              <BoltIcon className="w-4 h-4" /> LIMITE DIÁRIO
            </h3>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-white">{trainingsLeft}</span>
              <span className="text-slate-500 mb-2 font-bold uppercase text-xs tracking-widest">Sessões restantes hoje</span>
            </div>
            <div className="mt-4 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(trainingsLeft / 8) * 100}%` }}
                className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              ></motion.div>
            </div>
          </div>

          {/* ACTIVE TRAINING CARD */}
          <AnimatePresence mode="wait">
            {isTraining ? (
              <motion.div 
                key="active"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-cyan-500/10 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)]"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center animate-pulse">
                    <ClockIcon className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-orbitron text-white text-lg leading-tight uppercase">Treino em Curso</h3>
                    <p className="text-cyan-400/70 text-xs font-bold tracking-widest uppercase">
                      {userProfile?.active_training_type === 'pequeno' ? 'Pequeno' : 
                       userProfile?.active_training_type === 'medio' ? 'Médio' : 'Grande'}
                    </p>
                  </div>
                </div>

                <div className="text-center py-4 bg-black/40 rounded-xl border border-white/5 mb-4">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.3em] mb-1">Tempo Restante</p>
                  <p className="text-4xl font-mono font-black text-cyan-400 tracking-tighter">
                    {formatTime(timeLeft || 0)}
                  </p>
                </div>

                <div className="text-xs text-slate-400 flex justify-between px-1 italic">
                  <span>Iniciado: {new Date(new Date(userProfile?.training_ends_at || 0).getTime() - (userProfile?.active_training_type === 'pequeno' ? 30 : userProfile?.active_training_type === 'medio' ? 60 : 120) * 60000).toLocaleTimeString()}</span>
                  <span>Término: {new Date(userProfile?.training_ends_at || 0).toLocaleTimeString()}</span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-black/20 border border-white/5 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center"
              >
                <AcademicCapIcon className="w-12 h-12 text-slate-700 mb-4" />
                <p className="text-slate-500 font-medium text-sm">Nenhum treino ativo.<br/>Selecione um programa ao lado.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LADO DIREITO: OPÇÕES DE TREINO */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-1 gap-4">
          {TRAINING_OPTIONS.map((opt, idx) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              className={`group relative bg-black/40 backdrop-blur-md border ${opt.id === 'grande' ? 'border-orange-500/20' : 'border-white/10'} rounded-2xl p-6 transition-all hover:bg-white/5 hover:border-white/20`}
            >
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                  {opt.icon}
                </div>
                
                <div className="flex-1 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-orbitron font-bold text-white tracking-wide">{opt.name}</h3>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                            opt.id === 'pequeno' ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/5' : 
                            opt.id === 'medio' ? 'border-blue-500/50 text-blue-400 bg-blue-500/5' : 
                            'border-orange-500/50 text-orange-400 bg-orange-500/5'
                          }`}>
                            {opt.role}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">{opt.description}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 h-fit">
                        <ClockIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-white font-bold">{opt.duration}m</span>
                      </div>
                    </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* COSTS */}
                    <div className="col-span-2 md:col-span-2 flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-md">
                        <BoltIcon className="w-3 h-3 text-red-400" />
                        <span className="text-xs font-bold text-red-200">-{opt.costs.ap} AP</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-md">
                        <BanknotesIcon className="w-3 h-3 text-green-400" />
                        <span className="text-xs font-bold text-green-200">-${opt.costs.cash}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-md">
                        <FireIcon className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-200">-{opt.costs.energy}%</span>
                      </div>
                    </div>
                    {/* GAINS */}
                    <div className="col-span-2 md:col-span-2 flex flex-wrap gap-2 justify-end">
                      <span className="text-[10px] text-slate-500 uppercase font-black self-center mr-1">Ganhos:</span>
                      <div className={`border px-2 py-1 rounded-md text-[11px] font-bold ${opt.id === 'grande' ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10 bg-white/5'}`}>
                        <span className="text-cyan-400">+{opt.gains.atk}</span> ATK
                      </div>
                      <div className={`border px-2 py-1 rounded-md text-[11px] font-bold ${opt.id === 'medio' ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-white/5'}`}>
                        <span className="text-cyan-400">+{opt.gains.def}</span> DEF
                      </div>
                      <div className={`border px-2 py-1 rounded-md text-[11px] font-bold ${opt.id === 'pequeno' ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}>
                        <span className="text-cyan-400">+{opt.gains.foc}</span> FOC
                      </div>
                      <div className="bg-white/5 border border-white/10 px-2 py-1 rounded-md text-[11px] font-bold">
                        <span className="text-cyan-400">+{opt.gains.xp}</span> XP
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStart(opt.id)}
                    disabled={isTraining || loading !== null || trainingsLeft <= 0}
                    className={`w-full py-3 rounded-xl font-orbitron font-bold text-sm tracking-widest transition-all
                      ${isTraining || trainingsLeft <= 0 
                        ? 'bg-white/5 text-slate-600 cursor-not-allowed' 
                        : 'bg-white text-black hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-[0.98]'
                      }`}
                  >
                    {loading === opt.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        INICIANDO...
                      </div>
                    ) : isTraining ? (
                      'BLOQUEADO: TREINO EM CURSO'
                    ) : trainingsLeft <= 0 ? (
                      'LIMITE DIÁRIO ATINGIDO'
                    ) : (
                      'INICIAR TREINAMENTO'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FOOTER DECORATION */}
      <div className="mt-20 flex justify-center opacity-20 pointer-events-none">
        <div className="w-px h-20 bg-gradient-to-b from-transparent via-white to-transparent"></div>
      </div>
    </div>
  );
}