import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  isEvaded: boolean;
  isBreach: boolean;
  isCounter: boolean;
  hpAfter: number;
  maxHP: number;
}

export interface CombatTurnData {
  attacker: DamageEvent; // Player hitting target
  defender: DamageEvent; // Target hitting player
}

interface VisualBattlerProps {
  player: BattlerEntity;
  target: BattlerEntity;
  turns: CombatTurnData[];
  onComplete: () => void;
  outcome: string;
}

const FloatingText = ({ text, type }: { text: string; type: string }) => {
  const isCrit = type === 'crit';
  const isMiss = type === 'miss';
  
  let colorClass = 'text-white';
  if (isCrit) colorClass = 'text-yellow-400 font-black text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,1)]';
  else if (isMiss) colorClass = 'text-slate-400 font-mono italic text-lg drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]';
  else if (type === 'dmg-player') colorClass = 'text-red-500 font-bold text-xl drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]';
  else colorClass = 'text-white font-bold text-xl drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.5 }}
      animate={{ opacity: 1, y: -40, scale: 1 }}
      exit={{ opacity: 0, y: -60 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`absolute z-50 pointer-events-none ${colorClass}`}
    >
      {text}
    </motion.div>
  );
};

export default function VisualBattler({ player, target, turns, onComplete, outcome }: VisualBattlerProps) {
  const [currentTurn, setCurrentTurn] = useState(-1); // -1 = Engage, 0+ = Returns
  const [subPhase, setSubPhase] = useState<'idle' | 'p-attack' | 'p-hit' | 't-attack' | 't-hit' | 'end'>('idle');
  
  const [pHP, setPHP] = useState(player.hp);
  const [tHP, setTHP] = useState(target.hp);
  const pMax = player.maxHP;
  const tMax = target.maxHP;

  const [shake, setShake] = useState(false);
  
  const [floatingTexts, setFloatingTexts] = useState<{id: number, text: string, type: string, side: 'p'|'t'}[]>([]);

  const addFloatingText = (text: string, type: string, side: 'p'|'t') => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, text, type, side }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 1000);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  useEffect(() => {
    let active = true;

    const runCombat = async () => {
      if (!active) return;
      
      // Delay initial start
      await new Promise(r => setTimeout(r, 1000));
      setCurrentTurn(0);

      for (let i = 0; i < turns.length; i++) {
        if (!active) break;
        const turn = turns[i];
        
        // --- PLAYER ATTACKS TARGET ---
        setSubPhase('p-attack');
        await new Promise(r => setTimeout(r, 300));
        
        setSubPhase('p-hit');
        // Apply target damage
        if (turn.attacker.isMiss) {
          addFloatingText("MISS!", "miss", "t");
        } else {
          const dmg = turn.attacker.damage;
          const isCrit = turn.attacker.isCrit;
          addFloatingText(`-${dmg}`, isCrit ? "crit" : "dmg-target", "t");
          if (isCrit) triggerShake();
          setTHP(turn.attacker.hpAfter);
        }
        await new Promise(r => setTimeout(r, 800)); // Linger hit
        
        setSubPhase('idle');
        await new Promise(r => setTimeout(r, 400));
        
        // --- TARGET ATTACKS PLAYER ---
        setSubPhase('t-attack');
        await new Promise(r => setTimeout(r, 300));

        setSubPhase('t-hit');
        // Apply player damage
        if (turn.defender.isMiss) {
          addFloatingText("MISS!", "miss", "p");
        } else {
          const dmg = turn.defender.damage;
          const isCrit = turn.defender.isCrit;
          addFloatingText(`-${dmg}`, isCrit ? "crit" : "dmg-player", "p");
          if (isCrit) triggerShake();
          setPHP(turn.defender.hpAfter);
        }
        await new Promise(r => setTimeout(r, 800)); // Linger hit
        
        setSubPhase('idle');
        await new Promise(r => setTimeout(r, 800)); // Pause before next round
        
        setCurrentTurn(i + 1);
      }
      
      setSubPhase('end');
      await new Promise(r => setTimeout(r, 1500));
      if (active) onComplete();
    };

    runCombat();

    return () => { active = false; };
  }, [turns]);

  const pAvatarAnim = {
    'idle': { x: 0, scale: 1 },
    'p-attack': { x: 50, scale: 1.1, filter: "brightness(1.5)" },
    'p-hit': { x: 0, scale: 1 },
    't-attack': { x: 0, scale: 1 },
    't-hit': { x: -10, filter: "brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(5)" }, // Red flash
    'end': { x: 0, scale: 1 }
  };

  const tAvatarAnim = {
    'idle': { x: 0, scale: 1 },
    'p-attack': { x: 0, scale: 1 },
    'p-hit': { x: 10, filter: "brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(5)" }, // Red flash
    't-attack': { x: -50, scale: 1.1, filter: "brightness(1.5)" },
    't-hit': { x: 0, scale: 1 },
    'end': { x: 0, scale: 1 }
  };

  return (
    <div className={`relative w-full h-80 flex flex-col justify-between items-center overflow-hidden rounded-xl border border-white/10 ${shake ? 'animate-pulse' : ''}`} style={{
      backgroundImage: "radial-gradient(circle at center, rgba(30,0,0,0.8) 0%, rgba(0,0,0,1) 100%)"
    }}>
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-30 pointer-events-none"></div>

      {subPhase === 'end' && (
        <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center">
          <motion.h2 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`font-orbitron font-black text-4xl uppercase tracking-[0.2em] ${outcome.startsWith('win') ? 'text-yellow-400' : 'text-red-500'}`}
          >
            {outcome.replace('_', ' ')}
          </motion.h2>
        </div>
      )}

      {/* Arena Stage */}
      <div className="flex w-full px-8 pt-8 justify-between relative z-10 mb-8 mt-12">
        {/* Left: Player */}
        <div className="flex flex-col items-center relative w-1/3">
          <div className="font-orbitron text-xs text-cyan-400 mb-2 uppercase">{player.name}</div>
          <div className="w-full bg-slate-900 h-4 rounded overflow-hidden border border-cyan-500/30 mb-4 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <motion.div 
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
              animate={{ width: `${Math.max(0, (pHP / pMax) * 100)}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <motion.div 
            animate={pAvatarAnim[subPhase]}
            transition={{ duration: 0.15 }}
            className="w-32 h-32 bg-slate-800 rounded-lg border-2 border-cyan-500/50 shadow-[inset_0_0_20px_rgba(6,182,212,0.5)] flex items-center justify-center relative"
          >
            {/* Silhouette */}
            <div className="w-20 h-24 bg-cyan-900/50 border border-cyan-500/20" style={{ clipPath: "polygon(20% 0%, 80% 0%, 100% 20%, 100% 100%, 0% 100%, 0% 20%)" }}></div>
            
            <AnimatePresence>
              {floatingTexts.filter(ft => ft.side === 'p').map(ft => (
                <FloatingText key={ft.id} text={ft.text} type={ft.type} />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Center: Match Info */}
        <div className="flex flex-col items-center justify-center relative w-1/3 mt-8">
           <div className="text-red-500 font-mono text-xl font-bold italic opacity-50 mb-2">VS</div>
           <div className="text-slate-500 font-mono text-[10px] uppercase tracking-widest text-center leading-relaxed">
             Turno
             <div className="text-white text-lg font-black">{currentTurn < 0 ? '---' : Math.min(turns.length, currentTurn + 1)}</div>
           </div>
        </div>

        {/* Right: Target */}
        <div className="flex flex-col items-center relative w-1/3">
          <div className="font-orbitron text-xs text-red-500 mb-2 uppercase">{target.name}</div>
          <div className="w-full bg-slate-900 h-4 rounded overflow-hidden border border-red-500/30 mb-4 shadow-[0_0_10px_rgba(220,38,38,0.3)]">
            <motion.div 
              className="h-full bg-gradient-to-r from-red-600 to-red-400"
              animate={{ width: `${Math.max(0, (tHP / tMax) * 100)}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <motion.div 
            animate={tAvatarAnim[subPhase]}
            transition={{ duration: 0.15 }}
            className="w-32 h-32 bg-slate-800 rounded-lg border-2 border-red-500/50 shadow-[inset_0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center relative"
          >
            {/* Silhouette */}
            <div className="w-20 h-24 bg-red-900/50 border border-red-500/20" style={{ clipPath: "polygon(20% 0%, 80% 0%, 100% 20%, 100% 100%, 0% 100%, 0% 20%)" }}></div>

            <AnimatePresence>
              {floatingTexts.filter(ft => ft.side === 't').map(ft => (
                <FloatingText key={ft.id} text={ft.text} type={ft.type} />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
