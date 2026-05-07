import React, { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import api from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../contexts/ToastContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { 
  RectangleStackIcon, 
  SparklesIcon, 
  ClockIcon,
  CurrencyDollarIcon,
  BoltIcon,
  StarIcon,
  GiftIcon,
  LockClosedIcon
} from "@heroicons/react/24/outline";

interface CardOption {
  reward_type: "item" | "money" | "premium_coins" | "xp" | "action_points";
  reward_value: number;
  rarity: "common" | "rare" | "legendary";
  item_id?: string;
  name?: string;
}

interface DailyCardsData {
  id: string;
  card_option_1: CardOption;
  card_option_2: CardOption;
  card_option_3: CardOption;
  chosen_option: number | null;
  expires_at: string;
}

// HUD Corners e utilitários já estão no index.css via classes .military-clip, etc.
const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

export default function ParallelDeckPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  const [isChoosing, setIsChoosing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`;
  };
  
  const { data: dailyCards, error, isLoading } = useSWR<DailyCardsData>(
    "/daily-cards",
    (url: string) => api.get(url).then((res: any) => res.data),
    { 
      revalidateOnFocus: false, 
      revalidateIfStale: false,
      dedupingInterval: 60000 
    }
  );

  useEffect(() => {
    if (!dailyCards?.expires_at) {
      setTimeLeft(null);
      return;
    }

    const expiresAtMs = new Date(dailyCards.expires_at).getTime();
    if (isNaN(expiresAtMs)) {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [dailyCards?.expires_at]);

  const [isResetting, setIsResetting] = useState(false);

  const handleAutoReset = React.useCallback(async () => {
    setIsResetting(true);
    try {
      // Pequeno delay para o backend processar a expiração e o banco virar a data
      await new Promise(resolve => setTimeout(resolve, 2000));
      await mutate("/daily-cards");
      await refreshProfile();
    } finally {
      // Mantém o overlay por mais um pouco para o usuário perceber a mudança
      setTimeout(() => setIsResetting(false), 1500);
    }
  }, [refreshProfile]);

  // Efeito para resetar a página automaticamente quando o tempo acaba
  useEffect(() => {
    if (timeLeft === 0 && !isResetting) {
      handleAutoReset();
    }
  }, [timeLeft, isResetting, handleAutoReset]);

  const handleChoose = async (optionIndex: number) => {
    if (dailyCards?.chosen_option || isChoosing) return;
    
    setIsChoosing(true);
    try {
      const response = await api.post("/daily-cards/choose", { optionIndex });
      showToast(`RECOMPENSA RESGATADA: ${response.data.card.reward_type === 'money' ? 'CASH' : response.data.card.reward_type.toUpperCase()}`, "success");
      await mutate("/daily-cards");
      await refreshProfile();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao escolher carta", "error");
    } finally {
      setIsChoosing(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary": return "text-fuchsia-500 border-fuchsia-500/50 shadow-fuchsia-500/20";
      case "rare": return "text-violet-500 border-violet-500/50 shadow-violet-500/20";
      default: return "text-emerald-400 border-emerald-500/30 shadow-emerald-500/10";
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "money": return <CurrencyDollarIcon className="w-8 h-8" />;
      case "action_points": return <BoltIcon className="w-8 h-8 text-emerald-400" />;
      case "xp": return <StarIcon className="w-8 h-8 text-yellow-400" />;
      case "item": return <GiftIcon className="w-8 h-8 text-purple-400" />;
      default: return <SparklesIcon className="w-8 h-8" />;
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div></div>;

  const options = [
    dailyCards?.card_option_1,
    dailyCards?.card_option_2,
    dailyCards?.card_option_3
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-transparent relative text-slate-300 font-sans selection:bg-emerald-500/30">
      
      {/* HUD DECORATION - CORNERS */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-emerald-500/10 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-emerald-500/50"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-emerald-500/50"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-emerald-500/50"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-emerald-500/50"></div>
      </div>

      {/* RESETTING OVERLAY */}
      <AnimatePresence>
        {isResetting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-grid-white/[0.03] pointer-events-none"></div>
            <motion.div
              animate={{ 
                opacity: [1, 0.5, 1, 0.8, 1],
                scale: [1, 1.02, 1, 0.98, 1],
                x: [0, -2, 2, -1, 0]
              }}
              transition={{ repeat: Infinity, duration: 0.2 }}
              className="relative"
            >
              <h2 className="text-4xl md:text-6xl font-orbitron font-black text-white tracking-[0.2em] mb-4 text-center">
                RECALIBRANDO <span className="text-emerald-500">SISTEMA</span>
              </h2>
              <div className="h-1 bg-emerald-500/20 w-full relative">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-emerald-500 shadow-[0_0_15px_#10b981]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                />
              </div>
              <p className="mt-6 text-emerald-400 font-mono text-sm tracking-[0.5em] text-center uppercase animate-pulse">
                Sincronizando Rede Paralela...
              </p>
            </motion.div>
            
            {/* Scanline effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(16,185,129,0.7), -2px 0px 0px rgba(139,92,246,0.7)" }}>
            Parallel <span className="text-emerald-400">Deck</span>
          </h1>
          
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center overflow-hidden border border-emerald-500/40 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-emerald-500 px-2 py-0.5">
                   <span className="text-[9px] font-black text-black uppercase">NET_LEVEL</span>
                </div>
                <div className="px-3 py-0.5">
                   <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-widest">DEEP_REWARD_PROTOCOL</span>
                </div>
              </div>

              <div className="h-4 w-px bg-slate-800"></div>

              <span className="text-[10px] font-mono text-emerald-400/80 animate-pulse tracking-widest font-bold uppercase">● Uplink_Established</span>
            </div>
            
            <p className="text-slate-300 text-[10px] font-mono tracking-[0.2em] uppercase bg-white/5 py-1 px-3 border-l-2 border-emerald-500/50 w-fit backdrop-blur-sm">
              Protocolo Diário de Injeção de Sorte // Verificado AES-256
            </p>
          </div>
        </motion.div>
      </header>

      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {!dailyCards?.chosen_option ? (
          <div className="text-center mb-10 relative -mt-4">
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <h2 className="text-2xl md:text-4xl font-orbitron font-black text-white uppercase mb-3 tracking-[0.1em]" style={{ textShadow: "0 0 15px rgba(16,185,129,0.3)" }}>
                Escolha seu <span className="text-emerald-400">Destino</span>
              </h2>
              <div className="bg-black/40 border-y border-emerald-500/20 px-6 py-2 backdrop-blur-md">
                <p className="text-emerald-400/80 font-mono text-[10px] md:text-xs uppercase tracking-[0.15em] font-black flex items-center gap-3">
                  <span className="w-1 h-1 bg-emerald-500 animate-pulse" />
                  Uma conexão neural disponível. Selecione uma carta para sincronizar bônus.
                  <span className="w-1 h-1 bg-emerald-500 animate-pulse" />
                </p>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="mb-10 bg-emerald-500/5 border border-emerald-500/20 p-4 backdrop-blur-md flex flex-col md:flex-row items-center gap-6" style={MILITARY_CLIP}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center" style={MILITARY_CLIP}>
                <SparklesIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-orbitron font-black text-emerald-400 uppercase leading-none">Sincronização Concluída</h2>
                <p className="text-emerald-400/80 font-mono text-[10px] uppercase mt-1">Protocolo processado com sucesso</p>
              </div>
            </div>

            <div className="hidden md:block h-10 w-px bg-white/10" />

            <div className="flex items-center gap-4 flex-1 justify-center md:justify-start">
              <span className="text-[10px] font-mono text-white/70 uppercase">Novo protocolo em:</span>
              <div className="bg-black/60 px-4 py-1.5 border border-emerald-500/30 min-w-[140px] text-center" style={MILITARY_CLIP}>
                <span className="text-xl font-mono font-black text-white tracking-widest" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {timeLeft !== null ? formatTime(timeLeft) : '00H 00M 00S'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {options.map((option, idx) => {
            const index = idx + 1;
            const isChosen = dailyCards?.chosen_option === index;
            const isDisabled = !!dailyCards?.chosen_option;
            
            return (
              <motion.div
                key={index}
                whileHover={!isDisabled ? { scale: 1.05, y: -10 } : {}}
                whileTap={!isDisabled ? { scale: 0.95 } : {}}
                onClick={() => handleChoose(index)}
                className={`relative h-[400px] cursor-pointer group perspective-1000`}
              >
                <div className={`relative w-full h-full transition-all duration-500 preserve-3d ${isChosen ? 'rotate-y-180' : ''}`}>
                  
                  {/* Front Side (Card Back) */}
                  <div className={`absolute inset-0 backface-hidden bg-black/60 backdrop-blur-md border-2 border-slate-800 flex flex-col items-center justify-center p-6 shadow-2xl overflow-hidden ${isDisabled && !isChosen ? 'opacity-[0.85] saturate-[0.5]' : ''}`} style={MILITARY_CLIP}>
                    <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
                    <div className="w-24 h-24 bg-emerald-500/5 rounded-full flex items-center justify-center border border-emerald-500/20 mb-6 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all relative">
                      {isDisabled && !isChosen ? (
                        <LockClosedIcon className="w-12 h-12 text-red-500/50" />
                      ) : (
                        <RectangleStackIcon className="w-12 h-12 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
                      )}
                    </div>
                    <span className={`font-orbitron font-black tracking-[0.3em] uppercase transition-colors ${isDisabled && !isChosen ? 'text-red-500/40' : 'text-slate-700 group-hover:text-emerald-400/50'}`}>
                      ENCRIPTADO
                    </span>
                    
                    {/* Corner accents */}
                    <div className={`absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 transition-colors ${isDisabled && !isChosen ? 'border-red-500/20' : 'border-slate-700 group-hover:border-emerald-500/50'}`} />
                    <div className={`absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 transition-colors ${isDisabled && !isChosen ? 'border-red-500/20' : 'border-slate-700 group-hover:border-emerald-500/50'}`} />
                    <div className={`absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 transition-colors ${isDisabled && !isChosen ? 'border-red-500/20' : 'border-slate-700 group-hover:border-emerald-500/50'}`} />
                    <div className={`absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 transition-colors ${isDisabled && !isChosen ? 'border-red-500/20' : 'border-slate-700 group-hover:border-emerald-500/50'}`} />

                    {/* Side bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-opacity ${isDisabled && !isChosen ? 'bg-red-500/30 opacity-100' : 'bg-emerald-500 opacity-30 group-hover:opacity-100'}`}></div>
                  </div>

                  {/* Back Side (Card Content) */}
                  {option && (
                    <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-black/80 backdrop-blur-xl border-2 ${getRarityColor(option.rarity)} flex flex-col items-center justify-center p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]`} style={MILITARY_CLIP}>
                      <div className="absolute top-4 right-4 px-2 py-1 bg-white/5 text-[8px] font-black font-mono uppercase tracking-widest">{option.rarity}</div>
                      
                      <div className="mb-6 filter drop-shadow-[0_0_10px_currentColor]">
                        {getRewardIcon(option.reward_type)}
                      </div>
                      
                      <h3 className="font-orbitron font-black text-2xl text-white mb-2 uppercase text-center tracking-tighter">
                        {option.name || (option.reward_type === 'item' ? 'ITEM RARO' : `+${option.reward_value.toLocaleString()}`)}
                      </h3>
                      <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest font-bold">
                        {option.reward_type === 'money' ? 'CASH' : option.reward_type.replace('_', ' ')}
                      </p>

                      <div className="mt-8 pt-6 border-t border-white/5 w-full text-center">
                        <span className="text-[10px] font-orbitron font-black text-emerald-400 animate-pulse tracking-widest">SINCRONIZADO</span>
                      </div>

                      {/* Card side glow based on rarity */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 shadow-[0_0_15px_currentColor]
                        ${option.rarity === 'legendary' ? 'bg-fuchsia-500' : option.rarity === 'rare' ? 'bg-violet-500' : 'bg-emerald-500'}`}>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all relative z-10">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
             <span className="text-[8px] font-black tracking-widest uppercase">Encryption</span>
             <span className="text-[10px] font-mono">AES-256_ACTIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ fontVariantNumeric: 'tabular-nums' }}>
              PRÓXIMO RESET EM: {timeLeft !== null ? formatTime(timeLeft) : '00H 00M 00S'}
            </span>
          </div>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.5em]">
          Parallel Network Matrix v1.0.4
        </div>
      </footer>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
