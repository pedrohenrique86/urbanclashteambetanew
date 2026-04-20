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
      hover: "group-hover:text-orange-400",
    },
    {
      id: "002",
      name: "GUARDIÕES",
      tag: "ENFORCER_UNIT",
      desc: "Defensores da ordem corporativa. Equipados com tecnologia de ponta para manter a paz.",
      image: cardGuardiao,
      color: "text-blue-500",
      glow: "bg-blue-500",
      hover: "group-hover:text-blue-400",
    },
    {
      id: "003",
      name: "DIVISÕES",
      tag: "TECH_CORP",
      desc: "Divisões técnicas e estratégicas. Eles controlam os dados e a energia da cidade.",
      image: cardDivisoes,
      color: "text-purple-500",
      glow: "bg-purple-500",
      hover: "group-hover:text-purple-400",
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

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {factions.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="relative group cursor-pointer"
            >
              <div
                className="relative aspect-[3/4] overflow-hidden transition-all duration-500 
                border border-white/10 group-hover:border-white/30 rounded-lg"
              >
                {/* Image Treatment */}
                <div className="absolute inset-0 bg-gray-900 group-hover:bg-transparent transition-colors">
                  <img
                    src={f.image}
                    alt={f.name}
                    className="absolute inset-0 w-full h-full object-cover 
                    brightness-[0.4] group-hover:brightness-[0.7] saturate-0 group-hover:saturate-100 transition-all duration-700
                    group-hover:animate-flicker"
                  />
                </div>

                {/* Overlays */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent z-[6]" />
                
                {/* Technical HUD elements */}
                <div className="absolute top-4 left-4 flex flex-col font-orbitron z-[7]">
                  <span className={`text-[9px] font-bold tracking-[0.2em] ${f.color}`}>ID_{f.id}</span>
                </div>

                {/* Main Content */}
                <div className="absolute bottom-6 left-6 right-6 z-[10]">
                  <motion.div className="flex flex-col gap-2">
                    <span className={`text-[10px] font-bold tracking-[0.3em] uppercase ${f.color}`}>{f.tag}</span>
                    
                    <h3 className={`text-2xl font-black font-orbitron tracking-tighter text-white transition-colors duration-300 ${f.hover}`}>
                      {f.name}
                    </h3>
                    
                    <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-500 ease-out">
                      <p className="text-[10px] text-gray-400 leading-relaxed font-exo tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                        {f.desc}
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Vertical Scanner Line */}
                <div className="absolute inset-y-0 w-px bg-white/20 left-0 group-hover:animate-scanner-h pointer-events-none z-20" />
              </div>
              
              {/* Subtle outer glow dynamic */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 blur-[40px] pointer-events-none ${f.glow}`} />
            </motion.div>
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes scanner-h {
          0% { left: 0% }
          100% { left: 100% }
        }
        @keyframes flicker {
          0% { filter: brightness(0.7) contrast(1); }
          5% { filter: brightness(1.1) contrast(1.1) saturate(1.2); }
          10% { filter: brightness(0.7) contrast(1); }
          100% { filter: brightness(0.7) contrast(1); }
        }
        .animate-scanner-h {
          animation: scanner-h 3s linear infinite;
        }
        .animate-flicker {
          animation: flicker 5s steps(1) infinite;
        }
      `}</style>
    </section>
  );
}