import React from "react";
import { motion } from "framer-motion";

export function PrizesSection() {
  const prizes = [
    {
      place: "1º",
      amount: "R$ 300,00",
      tier: "SUPREME",
      color: "from-yellow-400 to-amber-600",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      icon: "🥇",
    },
    {
      place: "2º",
      amount: "R$ 150,00",
      tier: "ELITE",
      color: "from-gray-300 to-slate-500",
      bg: "bg-gray-400/10",
      border: "border-gray-400/30",
      icon: "🥈",
    },
    {
      place: "3º",
      amount: "R$ 100,00",
      tier: "VETERAN",
      color: "from-orange-400 to-red-600",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      icon: "🥉",
    },
  ];

  return (
    <motion.section
      id="prizes"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1 }}
      viewport={{ once: true }}
      className="py-32 px-4 bg-black relative overflow-hidden"
    >
      {/* Cinematic background light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-yellow-500/5 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-orbitron font-black tracking-tighter mb-4 italic"
          >
            RECOMPENSAS EM <span className="text-yellow-500 uppercase">DINHEIRO</span>
          </motion.h2>
          <div className="h-1 w-24 bg-yellow-500 mx-auto" />
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-gray-400 font-exo text-lg max-w-2xl mx-auto"
          >
            Os melhores combatentes de cada facção e as divisões dominantes recebem prêmios reais mensalmente.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {prizes.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              className={`relative overflow-hidden rounded-3xl p-1 shadow-2xl transition-all duration-500`}
            >
              <div className={`absolute inset-0 bg-gradient-to-b ${p.color} opacity-20`} />
              
              <div className="relative bg-gray-950/80 backdrop-blur-xl rounded-[22px] p-8 h-full border border-white/5 flex flex-col items-center">
                <span className="text-[10px] font-orbitron font-bold text-gray-500 tracking-[0.4em] mb-4">
                  TIER_{p.tier}
                </span>
                
                <div className="text-6xl mb-6">{p.icon}</div>
                
                <div className="font-orbitron font-black text-2xl text-gray-300 mb-2">
                  {p.place} LUGAR
                </div>
                
                <div className={`text-4xl font-orbitron font-black bg-gradient-to-r ${p.color} bg-clip-text text-transparent mb-8`}>
                  {p.amount}
                </div>

                <div className="mt-auto w-full h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                <span className="mt-4 text-[8px] font-mono text-gray-600">DISTRIBUIDO_MENSALMENTE</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          viewport={{ once: true }}
          className="mt-20 flex flex-wrap justify-center gap-4 text-sm font-orbitron font-bold opacity-60"
        >
          <span className="px-4 py-2 rounded-full border border-orange-500/30 text-orange-400">RENEGADOS</span>
          <span className="px-4 py-2 rounded-full border border-blue-500/30 text-blue-400">GUARDIÕES</span>
          <span className="px-4 py-2 rounded-full border border-purple-500/30 text-purple-400">DIVISÕES</span>
        </motion.div>
      </div>
    </motion.section>
  );
}

