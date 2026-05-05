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

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

export default function ParallelDeckPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  const [isChoosing, setIsChoosing] = useState(false);
  
  const { data: dailyCards, error, isLoading } = useSWR<DailyCardsData>(
    "/daily-cards",
    (url: string) => api.get(url).then((res: any) => res.data)
  );

  const handleChoose = async (optionIndex: number) => {
    if (dailyCards?.chosen_option || isChoosing) return;
    
    setIsChoosing(true);
    try {
      const response = await api.post("/daily-cards/choose", { optionIndex });
      showToast(`RECOMPENSA RESGATADA: ${response.data.card.reward_type.toUpperCase()}`, "success");
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
      default: return "text-cyan-400 border-cyan-500/30 shadow-cyan-500/10";
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
    <div className="min-h-[80vh] p-4 md:p-8 font-sans text-slate-300">
      <header className="max-w-6xl mx-auto mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "0 0 20px rgba(34,211,238,0.3)" }}>
            Deck <span className="text-cyan-400">Paralelo</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-mono tracking-[0.2em] uppercase mt-2">Daily Luck Injection Protocol // AES-256 Verified</p>
        </motion.div>
      </header>

      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {!dailyCards?.chosen_option ? (
          <div className="text-center mb-12">
            <h2 className="text-xl font-orbitron font-black text-white uppercase mb-2">Escolha seu Destino</h2>
            <p className="text-slate-500 font-mono text-xs">Uma conexão neural disponível. Selecione uma carta para sincronizar bônus.</p>
          </div>
        ) : (
          <div className="text-center mb-12 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
            <h2 className="text-xl font-orbitron font-black text-emerald-400 uppercase mb-2">Sincronização Concluída</h2>
            <p className="text-slate-400 font-mono text-xs">Acesse novamente em 24h para novo protocolo.</p>
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
                  <div className={`absolute inset-0 backface-hidden bg-slate-900 border-2 border-slate-800 flex flex-col items-center justify-center p-6 shadow-2xl overflow-hidden ${isDisabled && !isChosen ? 'opacity-40 grayscale' : ''}`} style={MILITARY_CLIP}>
                    <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
                    <div className="w-24 h-24 bg-cyan-500/5 rounded-full flex items-center justify-center border border-cyan-500/20 mb-6 group-hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] transition-all">
                      <RectangleStackIcon className="w-12 h-12 text-cyan-400/50 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <span className="font-orbitron font-black text-slate-700 tracking-[0.3em] uppercase group-hover:text-cyan-400/50 transition-colors">Encriptado</span>
                    
                    {/* Corner accents */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-slate-700 group-hover:border-cyan-500/50 transition-colors" />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-slate-700 group-hover:border-cyan-500/50 transition-colors" />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-slate-700 group-hover:border-cyan-500/50 transition-colors" />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-slate-700 group-hover:border-cyan-500/50 transition-colors" />
                  </div>

                  {/* Back Side (Card Content) */}
                  {option && (
                    <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 border-2 ${getRarityColor(option.rarity)} flex flex-col items-center justify-center p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]`} style={MILITARY_CLIP}>
                      <div className="absolute top-4 right-4 px-2 py-1 bg-white/5 text-[8px] font-black font-mono uppercase tracking-widest">{option.rarity}</div>
                      
                      <div className="mb-6">
                        {getRewardIcon(option.reward_type)}
                      </div>
                      
                      <h3 className="font-orbitron font-black text-2xl text-white mb-2 uppercase text-center">
                        {option.name || (option.reward_type === 'item' ? 'ITEM RARO' : `+${option.reward_value.toLocaleString()}`)}
                      </h3>
                      <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">
                        {option.reward_type.replace('_', ' ')}
                      </p>

                      <div className="mt-8 pt-6 border-t border-white/5 w-full text-center">
                        <span className="text-[10px] font-mono text-emerald-400 animate-pulse">SINCRONIZADO</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex justify-between items-center opacity-30 text-[10px] font-mono uppercase tracking-[0.2em]">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4" />
          <span>EXPIRA EM: {dailyCards?.expires_at ? new Date(dailyCards.expires_at).toLocaleTimeString() : '--:--:--'}</span>
        </div>
        <span>Parallel Network Matrix v1.0</span>
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
