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
  hpBefore: number;
  hpAfter: number;
  maxHP: number;
  incident?: {
    type: string;
    label: string;
    color?: string;
  };
}

export interface CombatTurnData {
  attacker: DamageEvent; // Player hitting target
  defender: DamageEvent; // Target hitting player
}

interface VisualBattlerProps {
  player: BattlerEntity;
  target: BattlerEntity;
  turns: CombatTurnData[];
  logs: string[];
  onComplete: () => void;
  outcome: string;
  loot?: any;
}

const FloatingText = ({ text, type, direction = 'up' }: { text: string; type: string; direction?: 'up' | 'down' }) => {
  const isCrit = type === 'crit';
  const isMiss = type === 'miss';
  const isSpecial = type === 'special';
  const isSegment = type === 'segment';
  
  let colorClass = 'text-white';
  if (isSegment) colorClass = 'text-cyan-400 font-mono tracking-widest text-xs font-black uppercase opacity-90 drop-shadow-[0_0_5px_#06b6d4]';
  else if (isSpecial) colorClass = 'text-fuchsia-400 font-black text-3xl drop-shadow-[0_0_15px_#d946ef]';
  else if (isCrit) colorClass = 'text-yellow-400 font-black text-3xl drop-shadow-[0_0_10px_#eab308]';
  else if (isMiss) colorClass = 'text-slate-400 font-mono italic text-lg opacity-60';
  else if (type === 'dmg-player') colorClass = 'text-red-500 font-black text-2xl drop-shadow-[0_0_8px_#ef4444]';
  else colorClass = 'text-white font-black text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]';

  const targetY = direction === 'up' ? -60 : 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: targetY, scale: [0.8, 1.2, 1, 1] }}
      transition={{ duration: 2.2, times: [0, 0.1, 0.8, 1], ease: "easeOut" }}
      className={`absolute z-50 pointer-events-none font-orbitron whitespace-nowrap ${colorClass}`}
    >
      {text}
    </motion.div>
  );
};

export default function VisualBattler({ player, target, turns, logs, onComplete, outcome, loot }: VisualBattlerProps) {
  const [currentTurn, setCurrentTurn] = useState(-1);
  const [subPhase, setSubPhase] = useState<'idle' | 'p-attack' | 'p-hit' | 't-attack' | 't-hit' | 'end'>('idle');
  const [narrative, setNarrative] = useState("SINAL ESTABILIZADO. INICIANDO INTERCEPTAÇÃO...");
  
  const [pHP, setPHP] = useState(player.hp);
  const [tHP, setTHP] = useState(target.hp);
  const pMax = player.maxHP;
  const tMax = target.maxHP;

  const [shake, setShake] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<{id: number, text: string, type: string, side: 'p'|'t', direction: 'up'|'down'}[]>([]);

  const addFloatingText = (text: string, type: string, side: 'p'|'t', direction: 'up'|'down' = 'up') => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, text, type, side, direction }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 2000);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  const [showResults, setShowResults] = useState(false);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    let active = true;

    const runCombat = async () => {
      if (!active || !turns || turns.length === 0) return;
      await new Promise(r => setTimeout(r, 1000));

      for (let i = 0; i < turns.length; i++) {
        if (!active) break;
        setCurrentTurn(i);
        setNarrative(logs[i] || "SINCRONIZANDO DADOS...");
        
        const turn = (turns as any)[i];
        
        setSubPhase('p-attack');
        if (turn.segment) {
          const isWin = turn.attacker.damage >= 25; // No Tri-Clash, dano alto = vitória do segmento
          addFloatingText(`${isWin ? 'VENCEU' : 'FALHA'}: ${turn.segment}`, "segment", "t", "down");
        }
        await new Promise(r => setTimeout(r, 400));
        
        setSubPhase('p-hit');
        if (turn.attacker.isMiss) {
          addFloatingText("MISS!", "miss", "t", "up");
        } else {
          const dmg = turn.attacker.damage;
          const isCrit = turn.attacker.isCrit;
          const isSpecial = turn.attacker.incident?.type === "SPECIAL";
          
          setTimeout(() => {
            addFloatingText(`-${dmg}`, isSpecial ? "special" : (isCrit ? "crit" : "dmg-target"), "t", "up");
            if (isCrit || isSpecial) triggerShake();
            setTHP(turn.attacker.hpAfter);
          }, 300);
        }
        await new Promise(r => setTimeout(r, 2200)); 
        
        setSubPhase('idle');
        await new Promise(r => setTimeout(r, 600));
        
        if (turn.attacker.hpAfter <= 0 || turn.defender.hpAfter <= 0) break;

        setSubPhase('t-attack');
        if (turn.segment) {
          addFloatingText(turn.segment, "segment", "p", "down");
        }
        await new Promise(r => setTimeout(r, 500));

        setSubPhase('t-hit');
        // NO_GHOST_ATTACK: Garante que o bot só executa a animação se realmente atacou e se o jogador tem HP
        if (turn.defender.damage > 0 || turn.defender.isMiss) {
          const dmg = turn.defender.damage;
          const isCrit = turn.defender.isCrit;
          const isSpecial = turn.defender.incident?.type === "SPECIAL";
          
          setTimeout(() => {
            if (dmg > 0) {
              addFloatingText(`-${dmg}`, isSpecial ? "special" : (isCrit ? "crit" : "dmg-player"), "p", "up");
              if (isCrit || isSpecial) triggerShake();
              setPHP(turn.defender.hpAfter);
            } else if (turn.defender.isMiss) {
              addFloatingText("MISS!", "miss", "p", "up");
            }
          }, 300);
        }
        await new Promise(r => setTimeout(r, 2200));
        
        setSubPhase('idle');
        if (turn.defender.hpAfter <= 0) break;
        await new Promise(r => setTimeout(r, 600)); 
        
        setCurrentTurn(i + 1);
      }
      
      setSubPhase('end');
      // Pequeno delay após o último golpe para permitir a visualização final do HP
      await new Promise(r => setTimeout(r, 1000));
      if (active) setShowResults(true);
    };

    // Reset total antes de iniciar nova simulação
    setShowResults(false);
    setCountdown(10);
    setPHP(player.hp);
    setTHP(target.hp);
    
    runCombat();
    return () => { active = false; };
  }, [turns, logs, player.hp, target.hp]);

  // Cronômetro Interno do Modal
  useEffect(() => {
    let timer: any;
    if (showResults && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (showResults && countdown === 0) {
      onComplete();
    }
    return () => clearTimeout(timer);
  }, [showResults, countdown, onComplete]);

  const pAvatarAnim = {
    'idle': { x: 0, scale: 1, rotateY: 0 },
    'p-attack': { x: 60, scale: 1.15, filter: "brightness(1.8) drop-shadow(0 0 10px #06b6d4)", rotateY: 0 },
    'p-hit': { x: 0, scale: 1, rotateY: 0 },
    't-attack': { x: 0, scale: 1, rotateY: 0 },
    't-hit': { x: -20, filter: "brightness(0.4) sepia(1) hue-rotate(-50deg) saturate(10)", scale: 0.95 },
    'end': { x: 0, scale: 1, rotateY: 0, rotate: pHP <= 0 ? 90 : 0, y: pHP <= 0 ? 40 : 0 }
  };

  const tAvatarAnim = {
    'idle': { x: 0, scale: 1, rotateY: 0 },
    'p-attack': { x: 0, scale: 1, rotateY: 0 },
    'p-hit': { x: 20, filter: "brightness(0.4) sepia(1) hue-rotate(-50deg) saturate(10)", scale: 0.95 },
    't-attack': { x: -60, scale: 1.15, filter: "brightness(1.8) drop-shadow(0 0 10px #ef4444)", rotateY: 0 },
    't-hit': { x: 0, scale: 1, rotateY: 0 },
    'end': { x: 0, scale: 1, rotateY: 0, rotate: tHP <= 0 ? -90 : 0, y: tHP <= 0 ? 40 : 0 }
  };

  return (
    <div className={`relative w-full min-h-[500px] flex flex-col justify-between items-center rounded-sm border-2 border-slate-800 bg-black shadow-2xl ${shake ? 'animate-pulse' : ''}`}>
      {/* Background FX */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#111_0%,#000_100%)]"></div>
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      <div className="absolute inset-0 bg-grid-slate-900/[0.15] bg-[size:20px_20px]"></div>
      
      {/* Animated Scanlines */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden opacity-10">
        <motion.div 
          animate={{ y: ["0%", "100%"] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-full h-20 bg-gradient-to-b from-transparent via-cyan-500 to-transparent"
        />
      </div>


      {/* Top HUD: HP Bars */}
      <div className="w-full grid grid-cols-2 gap-4 px-6 pt-6 relative z-10">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-end">
             <span className="text-[10px] font-orbitron font-black text-cyan-500 tracking-widest">{player.name}</span>
             <span className="text-[9px] font-mono text-slate-500">HP: {pHP.toFixed(0)}</span>
          </div>
          <div className="h-2 bg-slate-900 border border-cyan-500/30 overflow-hidden">
            <motion.div 
              className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"
              animate={{ width: `${(pHP/pMax)*100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-end flex-row-reverse">
             <span className="text-[10px] font-orbitron font-black text-red-500 tracking-widest">{target.name}</span>
             <span className="text-[9px] font-mono text-slate-500 text-right">HP: {tHP.toFixed(0)}</span>
          </div>
          <div className="h-2 bg-slate-900 border border-red-500/30 overflow-hidden">
            <motion.div 
              className="h-full bg-red-600 shadow-[0_0_10px_#dc2626]"
              animate={{ width: `${(tHP/tMax)*100}%` }}
              transition={{ duration: 0.3 }}
              style={{ float: 'right' }}
            />
          </div>
        </div>
      </div>

      {/* Arena: Battlers */}
      <div className="flex-1 w-full flex items-center justify-between px-10 relative">
        {/* Floating Status Layer (Global) */}
        <div className="absolute inset-0 pointer-events-none z-[60]">
           <AnimatePresence>
            {floatingTexts.filter(ft => ft.side === 'p').map(ft => (
              <div key={ft.id} className="absolute top-1/3 left-[20%] -translate-x-1/2">
                <FloatingText text={ft.text} type={ft.type} direction={ft.direction} />
              </div>
            ))}
            {floatingTexts.filter(ft => ft.side === 't').map(ft => (
              <div key={ft.id} className="absolute top-1/3 right-[20%] translate-x-1/2">
                <FloatingText text={ft.text} type={ft.type} direction={ft.direction} />
              </div>
            ))}
          </AnimatePresence>
        </div>
        {/* Decorative HUD Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-white/5 rounded-full rotate-45 opacity-20"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 border border-white/5 rounded-full -rotate-12 opacity-10"></div>
        
        {/* ROUND COUNTER CENTRAL */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[30] flex flex-col items-center pointer-events-none">
           <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 opacity-50">Matrix Sequence</div>
           <div className="text-4xl font-black font-orbitron text-white leading-none border-x-4 border-red-500/50 px-6 py-2 bg-black/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              ROUND <span className="text-red-500">0{Math.min(6, currentTurn + 1)}</span>
           </div>
        </div>
        
        {/* Left: Player */}
        <div className="relative">
          <motion.div 
            animate={pAvatarAnim[subPhase]}
            transition={{ duration: 0.2 }}
            className="w-36 h-48 bg-slate-900/40 backdrop-blur-md border border-cyan-500/30 relative overflow-hidden"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 90%, 90% 100%, 0 100%)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-500/50"></div>
            {/* Silhouette */}
            <div className="absolute inset-0 flex items-center justify-center opacity-40">
              <div className="w-16 h-24 bg-cyan-400" style={{ clipPath: "polygon(20% 0%, 80% 0%, 100% 20%, 100% 100%, 0% 100%, 0% 20%)" }}></div>
            </div>
          </motion.div>
        </div>

        {/* VS Indicator */}
        <div className="flex flex-col items-center gap-1 opacity-40">
          <div className="h-20 w-[1px] bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>
          <span className="font-orbitron font-black text-2xl text-slate-700 italic">VS</span>
          <div className="h-20 w-[1px] bg-gradient-to-t from-transparent via-slate-700 to-transparent"></div>
        </div>

        {/* Right: Target */}
        <div className="relative">
          <motion.div 
            animate={tAvatarAnim[subPhase]}
            transition={{ duration: 0.2 }}
            className="w-36 h-48 bg-slate-900/40 backdrop-blur-md border border-red-500/30 relative overflow-hidden"
            style={{ clipPath: "polygon(10% 0, 100% 0, 100% 100%, 0 100%, 0 10%)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-red-900/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600/50"></div>
            {/* Silhouette */}
            <div className="absolute inset-0 flex items-center justify-center opacity-40">
              <div className="w-16 h-24 bg-red-500" style={{ clipPath: "polygon(20% 0%, 80% 0%, 100% 20%, 100% 100%, 0% 100%, 0% 20%)" }}></div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Terminal Removido para Melhor Visualização */}
      <div className="h-8"></div> 

      {/* OVERLAY DE RESULTADOS INTEGRADO NO MODAL DE LUTA */}
      <AnimatePresence>
        {showResults && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 border border-slate-700 m-1"
           >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
              
              <motion.h2 
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`font-orbitron font-black text-3xl md:text-4xl mb-1 tracking-tighter italic ${outcome.startsWith('win') ? 'text-cyan-400' : 'text-red-600'}`}
              >
                {outcome.startsWith('win') ? "SESSÃO ÊXITO" : "KERNEL FALHOU"}
              </motion.h2>
              <p className="font-mono text-[8px] text-slate-500 uppercase tracking-[0.3em] mb-4 border-b border-white/5 pb-1">PROTOCOL_TERMINATED</p>
              
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm mb-6">
                 <div className="bg-slate-900/50 border border-slate-800 p-2 text-center">
                    <span className="block text-[7px] text-slate-500 uppercase font-bold mb-1">XP_DELTA</span>
                    <span className={`text-lg font-black font-orbitron ${loot?.xp >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      {loot?.xp >= 0 ? '+' : ''}{loot?.xp || 0}
                    </span>
                 </div>
                 <div className="bg-slate-900/50 border border-slate-800 p-2 text-center">
                    <span className="block text-[7px] text-slate-500 uppercase font-bold mb-1">CASH_LIQUID</span>
                    <span className={`text-lg font-black font-orbitron ${outcome.startsWith('win') ? 'text-emerald-400' : 'text-red-500'}`}>
                      {outcome.startsWith('win') ? `+$${loot?.money || 0}` : `-$${loot?.moneyLost || 0}`}
                    </span>
                 </div>
                 <div className="bg-slate-900/50 border border-slate-800 p-2 text-center col-span-2">
                    <span className="block text-[7px] text-slate-500 uppercase font-bold mb-1">ATRIBUTOS_SINC</span>
                    <div className="flex justify-center gap-4">
                       <span className="text-violet-400 font-bold text-[8px]">+{loot?.stats?.attack?.toFixed(2) || '0.00'} ATK</span>
                       <span className="text-violet-400 font-bold text-[8px]">+{loot?.stats?.defense?.toFixed(2) || '0.00'} DEF</span>
                       <span className="text-violet-400 font-bold text-[8px]">+{loot?.stats?.focus?.toFixed(2) || '0.00'} FOC</span>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                 <span className="text-[9px] font-mono text-slate-500 uppercase">Extração em</span>
                 <div className="text-3xl font-black font-orbitron text-white leading-none">
                    {countdown}S
                 </div>
                 <div className="w-32 h-1 bg-slate-900 border border-white/5 mt-2">
                    <motion.div 
                      className={`h-full ${outcome.startsWith('win') ? 'bg-cyan-500' : 'bg-red-600'}`}
                      animate={{ width: `${(countdown / 10) * 100}%` }}
                    />
                 </div>
              </div>

              <button 
                onClick={() => onComplete()}
                className="mt-6 px-5 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-[8px] font-black uppercase hover:text-white transition-colors"
                style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
              >
                Confirmar Extração
              </button>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
