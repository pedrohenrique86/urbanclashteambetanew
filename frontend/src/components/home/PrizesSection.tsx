import React from "react";
import { motion } from "framer-motion";
import { FaTrophy, FaMedal, FaAward } from "react-icons/fa";

export function PrizesSection() {
  const prizes = [
    {
      place: "02",
      amount: "R$ 150",
      tier: "ELITE_CLASS",
      label: "VICE_CHAMPION",
      color: "from-gray-300 via-white to-gray-500",
      accent: "bg-gray-400",
      shadow: "shadow-white/5",
      Icon: FaMedal,
      delay: 0.2,
      order: "order-1",
    },
    {
      place: "01",
      amount: "R$ 300",
      tier: "SUPREME_ALPHA",
      label: "TOTAL_DOMINATION",
      color: "from-yellow-400 via-amber-200 to-amber-600",
      accent: "bg-yellow-500",
      shadow: "shadow-yellow-500/10",
      Icon: FaTrophy,
      delay: 0,
      order: "order-first md:order-2",
      featured: true,
    },
    {
      place: "03",
      amount: "R$ 100",
      tier: "VETERAN_CELL",
      label: "BATTLE_HARDENED",
      color: "from-orange-500 via-orange-300 to-red-700",
      accent: "bg-orange-600",
      shadow: "shadow-orange-600/5",
      Icon: FaAward,
      delay: 0.4,
      order: "order-3",
    },
  ];

  return (
    <section id="prizes" className="py-24 md:py-40 px-4 sm:px-6 bg-black relative overflow-hidden">
      {/* Background Cinematic Atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] aspect-[10/6] bg-yellow-500/10 blur-[80px] md:blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[length:40px_40px]" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)' }} />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 md:mb-32 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-3 sm:px-4 py-1 border border-yellow-500/20 bg-yellow-500/5 mb-4 sm:mb-6"
          >
            <span className="text-[8px] sm:text-[10px] font-orbitron font-black text-yellow-500 tracking-[0.3em] sm:tracking-[0.5em] uppercase">
              Financial_Disbursement_Protocol
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-6xl md:text-8xl font-orbitron font-black tracking-tighter mb-6 md:mb-8"
          >
            SISTEMA DE <span className="text-white">PRÊMIOS</span>
          </motion.h2>
          
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-[8px] sm:text-[10px] font-mono text-gray-700 tracking-[0.2em] sm:tracking-[0.3em]">
            <span className="h-px w-8 sm:w-12 bg-gray-800" />
            VIGÊNCIA MENSAL // SETOR 01
            <span className="h-px w-8 sm:w-12 bg-gray-800" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-end max-w-sm mx-auto md:max-w-none">
          {prizes.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: p.delay }}
              viewport={{ once: true }}
              className={`${p.order} relative group`}
            >
              <div className={`relative bg-zinc-950/60 backdrop-blur-2xl border border-white/5 p-6 sm:p-8 flex flex-col items-center transition-all duration-500 ${p.featured ? 'md:pb-16 md:pt-20 border-yellow-500/20 bg-zinc-900/40' : 'pb-10 md:pb-12'} ${p.shadow} rounded-sm`}>
                
                {/* Tech Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-white/10 group-hover:border-white/30 transition-colors" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-white/10 group-hover:border-white/30 transition-colors" />

                {/* Place Indicator */}
                <div className="absolute top-4 right-6 font-mono text-[10px] text-gray-800 group-hover:text-gray-500 transition-colors">
                  RANK_{p.place}
                </div>

                <div className={`text-4xl sm:text-5xl md:text-6xl mb-6 md:mb-8 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3 ${p.featured ? 'text-yellow-500' : 'text-gray-600'}`}>
                  <p.Icon />
                </div>

                <div className="text-center mb-6 md:mb-8">
                  <span className={`text-[9px] sm:text-[10px] font-orbitron font-bold tracking-[0.2em] sm:tracking-[0.3em] mb-2 block ${p.featured ? 'text-yellow-500/60' : 'text-gray-600'}`}>
                    {p.tier}
                  </span>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-orbitron font-black text-white uppercase tracking-tighter">
                    {p.label}
                  </h3>
                </div>

                <div className={`text-4xl sm:text-5xl md:text-6xl font-orbitron font-black bg-gradient-to-b ${p.color} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-500`}>
                  {p.amount}
                </div>

                <div className="mt-8 md:mt-10 flex flex-col items-center gap-4 w-full">
                  <div className="h-px w-full bg-white/5 relative">
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-full w-1/4 ${p.accent} group-hover:w-full transition-all duration-700`} />
                  </div>
                  <span className="text-[7px] sm:text-[8px] font-mono text-gray-700 uppercase tracking-widest">Auth_Token: REW_{p.place}_88.X</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Global Payout Footer */}
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           viewport={{ once: true }}
           className="mt-16 md:mt-24 pt-8 border-t border-white/5 flex flex-wrap justify-center gap-6 md:gap-16 px-4"
        >
          {['RENEGADOS', 'GUARDIÕES', 'DIVISÕES'].map((cat, i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-4 group">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-yellow-500 transition-colors" />
              <span className="text-[9px] sm:text-[10px] font-orbitron font-bold text-gray-600 tracking-[0.2em] sm:tracking-[0.4em] uppercase group-hover:text-white transition-colors">
                {cat}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

