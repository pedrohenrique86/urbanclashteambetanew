import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import { supplyService } from "../services/supplyService";
import { useToast } from "../contexts/ToastContext";
import { 
  BanknotesIcon, 
  BoltIcon,
  ClockIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { Coffee, Sandwich, UtensilsCrossed, Sparkles, Syringe, BatteryCharging, HeartPulse, Skull, FlaskConical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SUPPLY STATION PAGE - AAA Military Cyberpunk Aesthetic
 * UrbanClash Team - Tactical Elite HUD
 */

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

const SUPPLY_OPTIONS = [
  {
    id: "cafe",
    name: "VOLT-C",
    description: "Para não dormir na vigia.",
    energy: 15,
    costs: { ap: 150, cash: 40 },
    toxicityChance: 20,
    toxicityGain: 2,
    icon: <Coffee className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />,
    color: "cyan",
    cooldownMs: 10000, // 10s
    flavorTexts: [
      "BARISTA DESENHANDO CAVEIRA...",
      "TENTANDO PARAR DE TREMER..."
    ]
  },
  {
    id: "sanduiche",
    name: "RAÇÃO SINTÉTICA",
    description: "Origem duvidosa, calorias garantidas.",
    energy: 40,
    costs: { ap: 350, cash: 120 },
    toxicityChance: 70,
    toxicityGain: 5,
    icon: <Sandwich className="w-8 h-8 text-violet-400 group-hover:text-violet-300 transition-colors" />,
    color: "violet",
    cooldownMs: 20000,
    flavorTexts: [
      "TIRANDO MILHO DA CAMISA...",
      "DE QUE BICHO É ESSA CARNE?"
    ]
  },
  {
    id: "marmita",
    name: "PACK DE BIO-MASSA",
    description: "Sustância de respeito. Cuidado com o sono.",
    energy: 65,
    costs: { ap: 600, cash: 280 },
    toxicityChance: 50,
    toxicityGain: 8,
    icon: <UtensilsCrossed className="w-8 h-8 text-emerald-400 group-hover:text-emerald-300 transition-colors" />,
    color: "emerald",
    cooldownMs: 45000,
    flavorTexts: [
      "MORTE LENTA PÓS-ALMOÇO...",
      "FEIJÃO PRESO NO DENTE..."
    ]
  },
  {
    id: "banquete",
    name: "BANQUETE TÁTICO",
    description: "Refeição de alto padrão. Para verdadeiros chefes.",
    energy: 90,
    costs: { ap: 1000, cash: 500 },
    toxicityChance: 10,
    toxicityGain: 10,
    icon: <Sparkles className="w-8 h-8 text-amber-400 group-hover:text-amber-300 transition-colors" />,
    color: "amber",
    cooldownMs: 60000,
    flavorTexts: [
      "CONTA MAIS CARA QUE TIRO...",
      "DIGESTÃO GOURMET EM CURSO..."
    ]
  },
  {
    id: "adrenalina",
    name: "ADRENALINA PURA",
    description: "Injeção instantânea. Recarrega 100%.",
    energy: 100,
    costs: { ap: 1500, cash: 850 },
    toxicityChance: 90,
    toxicityGain: 12,
    icon: <Syringe className="w-8 h-8 text-rose-400 group-hover:text-rose-300 transition-colors" />,
    color: "rose",
    cooldownMs: 30000,
    flavorTexts: [
      "CORAÇÃO A 200 BPM!!!",
      "ESTOU ENXERGANDO SONS..."
    ]
  }
];

export default function SupplyStationPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Cooldown states with LocalStorage persistence to survive remounts/refreshes
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(() => {
    const saved = localStorage.getItem('supply_cooldown_end');
    return saved ? parseInt(saved, 10) : null;
  });
  const [activeFlavor, setActiveFlavor] = useState<string>(() => {
    return localStorage.getItem('supply_cooldown_flavor') || "";
  });
  const [activeItemId, setActiveItemId] = useState<string | null>(() => {
    return localStorage.getItem('supply_cooldown_item') || null;
  });
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const subtitle = "MERCADO DE SUPRIMENTOS. A ENERGIA NÃO VEM DE GRAÇA.";

  // Update cooldown timer every second
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldownEnd && cooldownEnd > Date.now()) {
      const tick = () => {
        const remaining = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setCooldownEnd(null);
          setActiveFlavor("");
          setActiveItemId(null);
          localStorage.removeItem('supply_cooldown_end');
          localStorage.removeItem('supply_cooldown_flavor');
          localStorage.removeItem('supply_cooldown_item');
        }
      };
      tick();
      timer = setInterval(tick, 1000);
    } else if (cooldownEnd !== null) {
      setCooldownEnd(null);
      setTimeLeft(0);
      setActiveFlavor("");
      setActiveItemId(null);
      localStorage.removeItem('supply_cooldown_end');
      localStorage.removeItem('supply_cooldown_flavor');
      localStorage.removeItem('supply_cooldown_item');
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldownEnd]);

  const handlePurchase = useCallback(async (optionItem: typeof SUPPLY_OPTIONS[0]) => {
    if (cooldownEnd && cooldownEnd > Date.now()) {
      showToast("Você ainda está se recuperando da última refeição!", "error");
      return;
    }

    setLoading(optionItem.id);
    try {
      const res = await supplyService.buySupply(optionItem.id);
      showToast(
        `${res.message} [ +${res.gainedEnergy}% EN ]`,
        "success",
        5000
      );
      
      // Set local cooldown with a random flavor text
      const flavor = optionItem.flavorTexts[Math.floor(Math.random() * optionItem.flavorTexts.length)] || "Aguardando digestão...";
      const endTime = Date.now() + optionItem.cooldownMs;
      
      setActiveFlavor(flavor);
      setActiveItemId(optionItem.id);
      setCooldownEnd(endTime);
      
      localStorage.setItem('supply_cooldown_flavor', flavor);
      localStorage.setItem('supply_cooldown_item', optionItem.id);
      localStorage.setItem('supply_cooldown_end', endTime.toString());
      
      await refreshProfile();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setLoading(null);
    }
  }, [cooldownEnd, refreshProfile, showToast]);

  const handleAntidotePurchase = useCallback(async () => {
    setLoading("antidote");
    try {
      const res = await supplyService.buyAntidote();
      showToast(res.message, "success", 5000);
      await refreshProfile();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setLoading(null);
    }
  }, [refreshProfile, showToast]);

  const currentEnergy = Math.floor(userProfile?.energy || 0);
  const maxEnergy = Math.floor(userProfile?.max_energy || 100);
  const currentCash = Number(userProfile?.money || 0);
  const currentAP = Number(userProfile?.action_points || 0);

  const getBorderColor = (color: string, isHover = false) => {
    switch(color) {
      case 'cyan': return isHover ? 'hover:border-cyan-400/60' : 'border-cyan-500/40';
      case 'violet': return isHover ? 'hover:border-violet-400/60' : 'border-violet-500/40';
      case 'emerald': return isHover ? 'hover:border-emerald-400/60' : 'border-emerald-500/40';
      case 'amber': return isHover ? 'hover:border-amber-400/60' : 'border-amber-500/40';
      case 'rose': return isHover ? 'hover:border-rose-400/60' : 'border-rose-500/40';
      default: return isHover ? 'hover:border-cyan-400/60' : 'border-cyan-500/40';
    }
  };

  const getSideBarColor = (color: string) => {
    switch(color) {
      case 'cyan': return 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]';
      case 'violet': return 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]';
      case 'emerald': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]';
      case 'amber': return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]';
      case 'rose': return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]';
      default: return 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]';
    }
  };

  const getTextColor = (color: string) => {
    switch(color) {
      case 'cyan': return 'text-cyan-400';
      case 'violet': return 'text-violet-400';
      case 'emerald': return 'text-emerald-400';
      case 'amber': return 'text-amber-400';
      case 'rose': return 'text-rose-400';
      default: return 'text-cyan-400';
    }
  };

  const isCoolingDown = timeLeft > 0;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-transparent relative text-slate-300 font-sans selection:bg-rose-500/30">

      {/* HUD DECORATION - CORNERS */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-rose-500/10 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-rose-500/50"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-rose-500/50"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-rose-500/50"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-rose-500/50"></div>
      </div>

      {/* HEADER */}
      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(244,63,94,0.7), -2px 0px 0px rgba(34,211,238,0.7)" }}>
            Supply <span className="text-rose-500">Station</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 text-slate-300">SEC_LEVEL: 1</span>
            <span className="text-[10px] font-mono text-rose-500 animate-pulse tracking-widest">● MARKET_OPEN</span>
            <p className="text-slate-400 text-xs font-mono hidden md:block uppercase tracking-tighter">
              {subtitle}
            </p>
          </div>
        </motion.div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP STATUS BAR */}
        <div className="flex justify-center relative z-10 mb-8">
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* ENERGY STATUS */}
            <div 
              className="bg-black/40 backdrop-blur-md border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.1),inset_0_1px_rgba(255,255,255,0.1)] p-6 relative group overflow-hidden"
              style={MILITARY_CLIP}
            >
              <div className="absolute top-0 right-0 p-2 opacity-30 group-hover:opacity-50 transition-opacity">
                <HeartPulse className="w-12 h-12 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </div>
              <h3 className="text-[10px] font-orbitron text-rose-500 mb-6 flex flex-col gap-1 tracking-[0.3em]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]"></div> ENERGY_LEVEL
                </div>
                <span className="text-[9px] text-white/40 font-black font-orbitron tracking-[0.2em] leading-none mt-1 uppercase">ESTADO DE VIGOR</span>
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-6xl font-black text-white font-orbitron leading-none">{currentEnergy}</span>
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">/ {maxEnergy} EN</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentEnergy / maxEnergy) * 100}%` }}
                      className="h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] relative"
                    >
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(0,0,0,0.2)_5px,rgba(0,0,0,0.2)_10px)]"></div>
                    </motion.div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter">UNIDADE_STATUS:</span>
                    <span className={`font-mono text-[8px] ${currentEnergy < 20 ? 'text-red-500 animate-pulse' : 'text-rose-500/60'}`}>{currentEnergy < 20 ? 'CRÍTICO' : 'NOMINAL'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ANTIDOTE STATUS CARD */}
            {(() => {
               const currentTox = Math.floor(userProfile?.toxicity || 0);
               const level = Number(userProfile?.level || 1);
               const antidoteCost = Math.floor(100 + (level * 10) + (currentTox * 5 * (1 + level / 10)));
               const canAffordAntidote = currentCash >= antidoteCost;
               const needsAntidote = currentTox > 0;

               return (
                 <div 
                   className={`bg-black/40 backdrop-blur-md border ${needsAntidote ? 'border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.1)]' : 'border-slate-500/20 shadow-none grayscale'} p-6 relative group overflow-hidden transition-all duration-300`}
                   style={MILITARY_CLIP}
                 >
                   <div className="absolute top-0 right-0 p-2 opacity-30 group-hover:opacity-50 transition-opacity">
                     <FlaskConical className={`w-12 h-12 ${needsAntidote ? 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-slate-500 Mateo'}`} />
                   </div>
                   <h3 className={`text-[10px] font-orbitron ${needsAntidote ? 'text-cyan-400' : 'text-slate-500'} mb-6 flex flex-col gap-1 tracking-[0.3em]`}>
                     <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 ${needsAntidote ? 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,1)]' : 'bg-slate-600'}`}></div> ANTIDOTE_SYSTEM
                     </div>
                     <span className={`text-[9px] font-black font-orbitron tracking-[0.2em] leading-none mt-1 uppercase ${needsAntidote ? 'text-cyan-300/40' : 'text-slate-600'}`}>PURGAÇÃO QUÍMICA</span>
                   </h3>
                   <div className="flex flex-col flex-1">
                     <div className="flex items-end gap-2 mb-8">
                       <span className={`text-2xl md:text-3xl font-black font-orbitron leading-none ${needsAntidote && canAffordAntidote ? 'text-white' : 'text-slate-500 Mateo'}`}>
                         {needsAntidote ? `$${antidoteCost.toLocaleString("pt-BR")}` : "---"}
                       </span>
                       <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-0.5">CUSTO</span>
                     </div>
                     
                     <button
                       onClick={handleAntidotePurchase}
                       disabled={loading !== null || !needsAntidote || !canAffordAntidote}
                       className={`w-full py-2 px-4 mt-auto font-orbitron font-black text-[10px] tracking-widest transition-all duration-150 relative overflow-hidden
                         ${!needsAntidote 
                           ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-700/30' 
                           : !canAffordAntidote
                           ? 'bg-red-500/10 text-red-500/60 border border-red-500/20 cursor-not-allowed'
                           : 'bg-cyan-500/10 border border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] active:scale-[0.98]'
                         }`}
                       style={{ clipPath: "polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px)" }}
                     >
                       {loading === "antidote" ? (
                         <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                       ) : (
                         needsAntidote ? (canAffordAntidote ? "PURGAR SISTEMA" : "SALDO INSUFICIENTE") : "SISTEMA LIMPO"
                       )}
                     </button>
                   </div>
                 </div>
               );
            })()}

            {/* OVERLOAD STATUS (TOXICITY) */}
            {(() => {
              const currentTox = Math.floor(userProfile?.toxicity || 0);
              let toxColorClass = "text-green-400";
              let barColorClass = "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]";
              let borderColorClass = "border-green-500/30";
              let shadowClass = "shadow-[0_0_40px_rgba(34,197,94,0.1)]";
              let dotColorClass = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]";
              let statusText = "SEGURO";

              if (currentTox >= 85 && currentTox <= 90) {
                toxColorClass = "text-yellow-400";
                barColorClass = "bg-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.6)]";
                borderColorClass = "border-yellow-500/30";
                shadowClass = "shadow-[0_0_40px_rgba(250,204,21,0.1)]";
                dotColorClass = "bg-yellow-500 shadow-[0_0_8px_rgba(250,204,21,1)]";
                statusText = "CUIDADO";
              } else if (currentTox >= 91) {
                toxColorClass = "text-red-500 animate-pulse";
                barColorClass = "bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-pulse";
                borderColorClass = "border-red-500/50";
                shadowClass = "shadow-[0_0_60px_rgba(220,38,38,0.2)]";
                dotColorClass = "bg-red-500 shadow-[0_0_10px_rgba(220,38,38,1)]";
                statusText = "RISCO DE COLAPSO";
              }

              return (
                <div 
                  className={`bg-black/40 backdrop-blur-md border ${borderColorClass} ${shadowClass} p-6 relative group overflow-hidden transition-colors duration-500`}
                  style={MILITARY_CLIP}
                >
                  <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
                    <svg className={`w-12 h-12 ${toxColorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                         {/* COFFIN SHAPE */}
                         <path d="M9.5 2h5L19 7l-2 15h-10L5 7l4.5-5z" />
                         {/* CROSS ON COFFIN */}
                         <path d="M12 7v10M9 10h6" opacity="0.5" />
                    </svg>
                  </div>
                  <h3 className={`text-[10px] font-orbitron ${toxColorClass} mb-6 flex flex-col gap-1 tracking-[0.3em]`}>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 ${dotColorClass}`}></div> SOUTHRUN_OVERLOAD
                    </div>
                    <span className="text-[9px] text-white/90 font-black font-orbitron tracking-[0.2em] leading-none mt-1 uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">INTOXICAÇÃO ALIMENTAR</span>
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-end gap-2 mb-2">
                        <span className={`text-6xl font-black font-orbitron leading-none ${toxColorClass}`}>{currentTox}</span>
                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">/ 100 TX</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${currentTox}%` }}
                          className={`h-full relative ${barColorClass}`}
                        >
                          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(0,0,0,0.2)_5px,rgba(0,0,0,0.2)_10px)]"></div>
                        </motion.div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter">UNIDADE_STATUS:</span>
                        <span className={`font-mono text-[8px] animate-pulse ${toxColorClass}`}>{statusText}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* MAIN: SUPPLY OPTIONS */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {SUPPLY_OPTIONS.map((opt, idx) => {
            const hasEnoughCash = currentCash >= opt.costs.cash;
            const hasEnoughAP = currentAP >= opt.costs.ap;
            const isFullEnergy = currentEnergy >= maxEnergy;
            const canAfford = hasEnoughCash && hasEnoughAP && !isFullEnergy;
            
            return (
              <motion.div
                key={opt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                className={`group relative bg-black/40 backdrop-blur-md border transition-all duration-300 hover:bg-white/5 hover:-translate-y-1 shadow-[0_0_40px_rgba(244,63,94,0.05),inset_0_1px_rgba(255,255,255,0.1)]
                  ${getBorderColor(opt.color, false)} ${getBorderColor(opt.color, true)}`}
                style={MILITARY_CLIP}
              >
                <div className="p-6 flex flex-col gap-6 text-center h-full">
                  {/* ICON & ROLE */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-white/5 group-hover:scale-110 transition-transform shadow-inner border border-white/5 relative">
                      {opt.icon}
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 flex flex-col">
                    <div>
                      <h3 className="text-lg font-orbitron font-black text-white tracking-wider uppercase mb-1">{opt.name}</h3>
                      <p className="text-[11px] text-rose-500 font-mono tracking-wider uppercase leading-none mb-1 font-bold">Risco: {opt.toxicityChance}% (+{opt.toxicityGain} TX)</p>
                      <p className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase leading-none italic font-medium">Chance de Sobrecarga Torácica</p>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-white/5 mt-auto">
                      {/* COSTS AND GAINS */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`bg-red-500/10 border ${hasEnoughAP ? 'border-red-500/20' : 'border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]'} p-2 flex flex-col items-center group-hover:bg-red-500/20 transition-colors`}>
                          <BoltIcon className={`w-3 h-3 ${hasEnoughAP ? 'text-red-500' : 'text-red-400'} mb-1`} />
                          <span className={`text-[10px] font-bold ${hasEnoughAP ? 'text-red-200' : 'text-red-400'}`}>-{opt.costs.ap} PA</span>
                        </div>
                        <div className={`bg-green-500/10 border ${hasEnoughCash ? 'border-green-500/20' : 'border-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.5)]'} p-2 flex flex-col items-center group-hover:bg-green-500/20 transition-colors`}>
                          <BanknotesIcon className={`w-3 h-3 ${hasEnoughCash ? 'text-green-500' : 'text-green-400'} mb-1`} />
                          <span className={`text-[10px] font-bold ${hasEnoughCash ? 'text-green-200' : 'text-green-400'}`}>-${opt.costs.cash.toLocaleString("pt-BR")}</span>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/40 p-2 flex flex-col items-center group-hover:bg-rose-500/30 transition-colors shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                          <HeartPulse className="w-3 h-3 text-rose-400 mb-1" />
                          <span className="text-[10px] font-bold text-rose-200">+{opt.energy}% EN</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePurchase(opt)}
                      disabled={isCoolingDown || loading !== null || !canAfford}
                      className={`w-full py-4 px-2 font-orbitron font-black text-sm tracking-wider transition-all duration-150 relative overflow-hidden group
                        ${isCoolingDown || !canAfford || isFullEnergy
                          ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50 backdrop-blur-md' 
                          : 'bg-rose-500/10 border border-rose-400/50 text-rose-300 hover:bg-rose-500/20 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] active:translate-y-px active:shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                        }`}
                      style={MILITARY_CLIP}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading === opt.id ? (
                           <>
                             <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                             INITIALIZING...
                           </>
                         ) : 
                         isCoolingDown ? (
                           activeItemId === opt.id ? (
                             <span className="min-h-[1.5rem] leading-tight tracking-wider uppercase font-mono flex items-center justify-center text-center gap-2">
                               <span className="text-[9px] text-amber-500/90">{activeFlavor}</span>
                               <span className="text-xl font-black text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">{timeLeft}S</span>
                             </span>
                           ) : 'LOCKED'
                         ) : 
                         isFullEnergy ? 'FULL' :
                         !hasEnoughAP ? 'INSUFFICIENT_AP' :
                         !hasEnoughCash ? 'INSUFFICIENT_FUNDS' : 'CONSUME'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Decorative side bar for the card */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getSideBarColor(opt.color)}`}>
                </div>
              </motion.div>
            );
          })}
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
