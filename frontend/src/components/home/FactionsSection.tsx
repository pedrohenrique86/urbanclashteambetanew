import React from "react";
import { motion } from "framer-motion";

// Importar as imagens dos cards
import cardRenegado from "../../assets/card-renegado.webp";
import cardGuardiao from "../../assets/card-guardiao.webp";
import cardDivisoes from "../../assets/card-divisoes.webp";

export function FactionsSection() {
  const factions = [
    {
      id: "001",
      name: "RENEGADOS",
      tag: "OUTLAW_CELL",
      desc: "Os donos da noite. Movidos pelo caos e pela liberdade das ruas cercadas por neon.",
      image: cardRenegado,
      color: "text-orange-500",
      glow: "bg-orange-500",
      activeColor: "group-hover:text-orange-400",
    },
    {
      id: "002",
      name: "GUARDIÕES",
      tag: "ENFORCER_UNIT",
      desc: "Defensores da ordem corporativa. Equipados com tecnologia de ponta para manter a paz.",
      image: cardGuardiao,
      color: "text-blue-500",
      glow: "bg-blue-500",
      activeColor: "group-hover:text-blue-400",
    },
    {
      id: "003",
      name: "DIVISÕES",
      tag: "TECH_CORP",
      desc: "Divisões técnicas e estratégicas. Eles controlam os dados e a energia da cidade.",
      image: cardDivisoes,
      color: "text-purple-500",
      glow: "bg-purple-500",
      activeColor: "group-hover:text-purple-400",
    },
  ];

  return (
    <section
      id="factions"
      className="py-24 px-4 bg-black relative overflow-hidden flex flex-col items-center"
    >
      {/* Scanline Effect Global */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      <div className="max-w-5xl w-full relative z-10">
        <div className="flex flex-col items-center mb-16 overflow-hidden text-center">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs md:text-sm font-orbitron font-bold tracking-[0.5em] text-white flex items-center justify-center gap-4"
          >
            <span className="text-gray-500">[</span> ESCOLHA SEU LADO <span className="text-gray-500">]</span>
          </motion.h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "100px" }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="h-[1px] bg-gray-800 mt-4"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-10 md:gap-6 lg:gap-8">
          {factions.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group cursor-pointer"
            >
              <div
                className="relative aspect-[3/4] overflow-hidden rounded-lg border border-white/10 
                md:group-hover:border-white/30 transition-all duration-500 shadow-2xl"
              >
                {/* Image Treatment */}
                <div className="absolute inset-0 bg-gray-950">
                  <img
                    src={f.image}
                    alt={f.name}
                    className="absolute inset-0 w-full h-full object-cover 
                    brightness-[0.8] saturate-100
                    md:brightness-[0.4] md:saturate-0
                    md:group-hover:brightness-[0.8] md:group-hover:saturate-100 
                    transition-all duration-700"
                  />
                </div>

                {/* Overlays */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent z-[6]" />
                
                {/* Technical HUD elements */}
                <div className="absolute top-4 left-4 flex flex-col font-orbitron z-[7]">
                  <span className={`text-[9px] font-bold tracking-[0.2em] ${f.color}`}>ID_{f.id}</span>
                </div>

                {/* Main Content */}
                <div className="absolute bottom-6 left-6 right-6 z-[10]">
                  <div className="flex flex-col gap-2">
                    <span className={`text-[10px] font-bold tracking-[0.3em] uppercase ${f.color}`}>
                      {f.tag}
                    </span>
                    
                    <h3 className={`text-2xl font-black font-orbitron tracking-tighter text-white transition-colors duration-300 ${f.activeColor}`}>
                      {f.name}
                    </h3>
                    
                    <div className="md:h-0 md:group-hover:h-auto overflow-hidden transition-all duration-500 ease-out">
                      <p className="text-[10px] text-gray-400 leading-relaxed font-exo tracking-wide md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}