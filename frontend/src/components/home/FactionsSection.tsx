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
      desc: "Os donos da noite. Operando nas sombras com táticas de guerrilha urbana e liberdade absoluta.",
      image: cardRenegado,
      color: "text-orange-500",
      glow: "bg-orange-500",
      activeColor: "group-hover:text-orange-400",
    },
    {
      id: "002",
      name: "GUARDIÕES",
      tag: "ENFORCER_UNIT",
      desc: "A sentinela de ferro. Defendendo a ordem com tecnologia de ponta e protocolo rigoroso.",
      image: cardGuardiao,
      color: "text-blue-500",
      glow: "bg-blue-500",
      activeColor: "group-hover:text-blue-400",
    },
    {
      id: "003",
      name: "DIVISÕES",
      tag: "TECH_CORP",
      desc: "O cérebro da rede. Estrategistas que moldam o futuro através do domínio cibernético.",
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
      {/* Background Cinematic Atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />
      
      <div className="max-w-5xl w-full relative z-10">
        {/* ENFEITE APENAS NESTE TEXTO [ESCOLHA SEU LADO] */}
        <div className="flex flex-col items-center mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Decorações HUD em volta do texto */}
            <div className="absolute -top-4 -left-8 w-4 h-4 border-t-2 border-l-2 border-orange-500/50" />
            <div className="absolute -bottom-4 -right-8 w-4 h-4 border-b-2 border-r-2 border-blue-500/50" />
            
            <h2 className="text-lg md:text-2xl font-orbitron font-black tracking-[0.4em] uppercase italic flex flex-col items-center">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <span className="text-orange-500 mr-2">[</span>
                ESCOLHA SEU LADO
                <span className="text-blue-500 ml-2">]</span>
              </span>
              <div className="flex items-center gap-2 mt-1 w-full scale-x-110">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
                <div className="w-1.5 h-1.5 bg-white rotate-45 animate-pulse" />
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-blue-500 to-transparent" />
              </div>
            </h2>
          </motion.div>
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
                
                {/* ID - SIMPLES */}
                <div className="absolute top-4 left-4 flex flex-col font-orbitron z-[7]">
                  <span className={`text-[9px] font-bold tracking-[0.2em] ${f.color} opacity-70`}>ID_{f.id}</span>
                </div>

                {/* Main Content - SIMPLES */}
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