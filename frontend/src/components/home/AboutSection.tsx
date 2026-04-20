import React from "react";
import { motion } from "framer-motion";

export function AboutSection() {
  const intelData = [
    {
      code: "STR-CBT",
      id: "099",
      title: "COMBATE ESTRATÉGICO",
      desc: "Simulação de guerra urbana em tempo real. Planeje ofensivas, gerencie recursos e execute táticas de invasão em territórios controlados.",
      color: "from-orange-500/20 to-transparent",
      accent: "bg-orange-500",
      border: "border-orange-500/30",
    },
    {
      code: "RK-COMP",
      id: "105",
      title: "EXTRATAÇÃO COMPETITIVA",
      desc: "O sistema de recompensas é real. Suba na hierarquia do submundo e converta suas vitórias em prêmios e prestígio global.",
      color: "from-blue-500/20 to-transparent",
      accent: "bg-blue-500",
      border: "border-blue-500/30",
    },
    {
      code: "COM-INT",
      id: "212",
      title: "REDE DE INTELIGÊNCIA",
      desc: "Ninguém sobrevive sozinho. Conecte-se a divisões ativas, compartilhe intel e participe da maior rede de mercenários do setor.",
      color: "from-purple-500/20 to-transparent",
      accent: "bg-purple-500",
      border: "border-purple-500/30",
    },
  ];

  return (
    <section id="about" className="py-32 px-6 bg-black relative overflow-hidden">
      {/* Background HUD Elements */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-10 left-10 text-[8px] font-mono text-white/5 tracking-[0.4em] uppercase pointer-events-none origin-left rotate-90 hidden lg:block">
        GLOBAL_NETWORK_SCAN_ACTIVE_INIT_v2.4
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 lg:items-end mb-24">
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 mb-6"
            >
              <div className="h-4 w-1 bg-orange-500" />
              <span className="font-orbitron font-bold text-xs tracking-[0.3em] text-gray-500 uppercase">
                Briefing de Missão // Intel_Report
              </span>
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-7xl font-orbitron font-black tracking-tighter leading-none"
            >
              DOMINE O <span className="text-white">SETOR 01</span> DA <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-600">
                GUERRA URBANA
              </span>
            </motion.h2>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="lg:max-w-sm"
          >
            <p className="text-gray-400 font-exo text-lg leading-relaxed border-l border-white/10 pl-6">
              A simulação definitiva de lealdade e estratégia. No Urban Clash Team, cada movimento é monitorado e cada vitória redefine o mapa da cidade.
            </p>
          </motion.div>
        </div>

        {/* Technical Data Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {intelData.map((data, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1 }}
              whileHover={{ y: -10 }}
              className={`relative bg-zinc-950/40 p-8 pt-12 border ${data.border} group overflow-hidden`}
            >
              {/* Corner Accent */}
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" style={{ backgroundColor: data.accent.split('-')[1] }} />
              </div>
              
              {/* Tech Label */}
              <div className="absolute top-6 left-8 flex items-center gap-2">
                <div className={`h-[1px] w-4 ${data.accent}`} />
                <span className="text-[10px] font-mono text-gray-500 tracking-[0.2em]">{data.code}</span>
              </div>

              {/* Background Gradient Pulse */}
              <div className={`absolute inset-0 bg-gradient-to-br ${data.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

              <div className="relative z-10">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-xs font-orbitron text-gray-700">DATA_{data.id}</span>
                  <h3 className="text-xl font-orbitron font-black text-white group-hover:text-orange-500 transition-colors">
                    {data.title}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-500 leading-relaxed font-exo">
                  {data.desc}
                </p>
                
                <div className="mt-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0 text-[10px] font-bold font-orbitron text-white">
                  <span>ANALISAR DADOS</span>
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-orange-500">▶</span>
                </div>
              </div>

              {/* HUD Line Decoration */}
              <div className="absolute bottom-0 left-0 w-1/3 h-[2px] bg-white/5" />
            </motion.div>
          ))}
        </div>

        {/* Footer Technical Status */}
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "100%" }}
          viewport={{ once: true }}
          className="mt-20 h-px bg-white/5 relative"
        >
          <div className="absolute right-0 top-4 text-[10px] font-mono text-gray-800 tracking-[0.2em]">
            SIM_COORDS // LAT:-23.5505 LONG:-46.6333
          </div>
        </motion.div>
      </div>
    </section>
  );
}
