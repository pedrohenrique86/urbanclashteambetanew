import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheckIcon,
  CpuChipIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  LockOpenIcon
} from '@heroicons/react/24/solid';

export interface BattlerEntity {
  name: string;
  level: number;
  maxHP: number;
  hp: number;
}

export interface DamageEvent {
  damage: number;
  isCrit: boolean;
  isMiss: boolean;
  hpAfter: number;
}

export interface CombatTurnData {
  attacker: DamageEvent;
  defender: DamageEvent;
}

interface VisualBattlerProps {
  player: BattlerEntity;
  target: BattlerEntity;
  turns: CombatTurnData[];
  logs: any[];
  onComplete: () => void;
  outcome: string;
  loot?: any;
}

export default function VisualBattler({ player, target, turns, logs, onComplete, outcome, loot }: VisualBattlerProps) {
  const [currentTurn, setCurrentTurn] = useState(0);
  const [pressure, setPressure] = useState(50); 
  const [status, setStatus] = useState<'idle' | 'pulsing'>('idle');
  const [narrative, setNarrative] = useState("INICIALIZANDO SONAR NEURAL...");
  const [showResults, setShowResults] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [flash, setFlash] = useState<'none' | 'red' | 'cyan'>('none');

  useEffect(() => {
    let active = true;
    const runPulseCombat = async () => {
      await new Promise(r => setTimeout(r, 1000));
      
      for (let i = 0; i < 5; i++) {
        if (!active) break;
        setCurrentTurn(i);
        setStatus('pulsing');
        
        const logEntry = logs.find(l => l.segment && l.segment.includes(`FASE ${i+1}`));
        setNarrative(logEntry ? `${logEntry.label}: ${logEntry.effect}` : "EXECUTANDO COMANDO...");
        
        await new Promise(r => setTimeout(r, 1000));
        
        const phaseWon = logEntry?.winner === 'attacker';
        const isLastPhase = i === 4;

        setFlash(phaseWon ? 'cyan' : 'red');
        setTimeout(() => setFlash('none'), 300);
        
        setPressure(prev => {
          if (isLastPhase) {
             return outcome.startsWith('win') ? 98 : 2;
          }
          const shift = i === 2 ? 22 : 14; 
          return phaseWon ? Math.min(95, prev + shift) : Math.max(5, prev - shift);
        });

        await new Promise(r => setTimeout(r, 1000));
        setStatus('idle');
      }

      await new Promise(r => setTimeout(r, 500));
      if (active) setShowResults(true);
    };

    runPulseCombat();
    return () => { active = false; };
  }, [logs]);

  useEffect(() => {
    if (showResults && countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else if (showResults && countdown === 0) {
      onComplete();
    }
  }, [showResults, countdown, onComplete]);

  return (
    <div className={`relative w-full min-h-[550px] flex flex-col justify-between items-center transition-colors duration-300 ${flash === 'red' ? 'bg-red-950' : flash === 'cyan' ? 'bg-cyan-950' : 'bg-[#020202]'} border-2 border-slate-900 shadow-2xl overflow-hidden p-8 font-mono`}>
      {/* BACKGROUND: RADAR SONAR */}
      <div className={`absolute inset-0 ${flash === 'red' ? 'bg-red-600/10' : 'bg-transparent'} transition-colors duration-200`}></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#0a1a1a_0%,#000_100%)]"></div>
      <div className="absolute inset-0 opacity-10">
         {[1, 2, 3, 4].map(i => (
           <div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-cyan-500 rounded-full" 
                style={{ width: `${i * 25}%`, height: `${i * 25}%` }} />
         ))}
         <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
           className="absolute top-1/2 left-1/2 w-full h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent origin-left"
         />
      </div>

      {/* TOP: IDENTITY PANEL */}
      <div className="w-full flex justify-between relative z-10 border-b border-white/5 pb-4">
        <div className="flex flex-col">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-500 animate-pulse"></div>
              <span className="text-[10px] text-cyan-500 font-black tracking-widest uppercase">Operador</span>
           </div>
           <span className="text-xl text-white font-black">{player.name}</span>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-2">
              <span className="text-[10px] text-red-500 font-black tracking-widest uppercase">Target_Core</span>
              <div className="w-2 h-2 bg-red-600 animate-pulse"></div>
           </div>
           <span className="text-xl text-white font-black">{target.name}</span>
        </div>
      </div>

      {/* CENTER: NEURAL PULSE RINGS */}
      <div className="relative flex-1 w-full flex items-center justify-center">
         {/* PLAYER RING (CYAN) */}
         <motion.div 
           animate={{ 
             width: `${pressure * 4}px`, 
             height: `${pressure * 4}px`,
             boxShadow: status === 'pulsing' ? '0 0 50px rgba(6,182,212,0.4)' : '0 0 20px rgba(6,182,212,0.1)'
           }}
           className="absolute border-4 border-cyan-500 rounded-full z-20 flex items-center justify-center backdrop-blur-sm"
         >
            <div className="text-cyan-400 font-black text-[10px] opacity-40">SIGNAL</div>
            {/* INNER GLOW */}
            <div className="absolute inset-0 rounded-full bg-cyan-500/5"></div>
         </motion.div>

         {/* TARGET RING (RED) */}
         <motion.div 
           animate={{ 
             width: `${(100 - pressure) * 4}px`, 
             height: `${(100 - pressure) * 4}px`,
             boxShadow: status === 'pulsing' ? '0 0 50px rgba(239,68,68,0.4)' : '0 0 20px rgba(239,68,68,0.1)'
           }}
           className="absolute border-4 border-red-600 rounded-full z-10 flex items-center justify-center"
         >
            <div className="text-red-500 font-black text-[10px] opacity-40">CORE</div>
         </motion.div>

         {/* CORE CLASH IMPACT */}
         <AnimatePresence>
            {status === 'pulsing' && (
              <motion.div 
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 4, opacity: 0 }}
                exit={{ opacity: 0 }}
                className="absolute w-20 h-20 border-2 border-white rounded-full z-30"
              />
            )}
         </AnimatePresence>
      </div>

      {/* MID: PROGRESS INDICATOR */}
      <div className="w-full flex justify-center gap-3 relative z-10 mb-6">
         {[0, 1, 2, 3, 4].map(i => (
           <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-10 h-1.5 transition-all ${i < currentTurn ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : i === currentTurn ? 'bg-white animate-pulse' : 'bg-white/10'}`} />
              <span className={`text-[6px] font-black ${i === currentTurn ? 'text-white' : 'text-slate-600'}`}>LAYER_0{i+1}</span>
           </div>
         ))}
      </div>

      {/* BOTTOM: SYSTEM LOG TERMINAL */}
      <div className="w-full relative z-10">
         <div className="bg-black/60 border border-white/10 p-4 h-20 flex gap-4 items-center overflow-hidden">
            <div className="flex flex-col items-center border-r border-white/10 pr-4">
               <span className="text-[7px] text-slate-500 uppercase font-black mb-1 tracking-tighter">Bypass_Rate</span>
               <span className="text-lg font-black text-cyan-500">{pressure}%</span>
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-2 mb-1">
                  <SignalIcon className="w-3 h-3 text-cyan-500" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Neural_Stream_Live</span>
               </div>
               <motion.p 
                 key={narrative}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-[11px] text-white font-mono italic leading-none"
               >
                 <span className="text-cyan-500 mr-2 font-black tracking-widest uppercase text-[8px] not-italic">&gt;</span>
                 {narrative}
               </motion.p>
            </div>
         </div>
      </div>

      {/* FINAL RESULT OVERLAY */}
      <AnimatePresence>
        {showResults && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 border-4 border-slate-900"
          >
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
              <h2 className={`text-5xl font-black font-orbitron mb-2 tracking-tighter italic ${outcome.startsWith('win') ? 'text-cyan-400' : 'text-red-600'}`}>
                {outcome.startsWith('win') ? "INVASÃO COMPLETA" : "ACESSO NEGADO"}
              </h2>
              <div className="w-48 h-[1px] bg-white/10 mb-8"></div>
              
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-12">
                 <div className="bg-slate-900/50 p-4 border border-white/5 text-center">
                    <span className="block text-[8px] text-slate-500 uppercase mb-1 font-bold">XP_GAINED</span>
                    <span className="text-2xl font-black text-white">+{loot?.xp || 0}</span>
                 </div>
                 <div className="bg-slate-900/50 p-4 border border-white/5 text-center">
                    <span className="block text-[8px] text-slate-500 uppercase mb-1 font-bold">CASH_EXT</span>
                    <span className="text-2xl font-black text-emerald-500">${loot?.money || 0}</span>
                 </div>
                 <div className="col-span-2 bg-white/5 p-2 border border-white/5 text-center">
                    <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Atributos Sync: +{loot?.stats?.attack?.toFixed(2) || '0.01'} PTs</span>
                 </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                 <div className="text-4xl font-black text-white">{countdown}S</div>
                 <button 
                   onClick={() => onComplete()}
                   className="px-12 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                   style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}
                 >
                   Desconectar
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
