import React from "react";
import { motion } from "framer-motion";

export function AboutSection() {
  const features = [
    {
      icon: "⚔️",
      title: "COMBATE ESTRATÉGICO",
      desc: "Planeje suas batalhas, forme alianças e domine territórios em combates táticos intensos.",
      color: "border-orange-500/30",
      text: "text-orange-400",
    },
    {
      icon: "🏆",
      title: "RANKING COMPETITIVO",
      desc: "Suba no ranking, prove sua superioridade e ganhe prêmios em dinheiro real.",
      color: "border-blue-500/30",
      text: "text-blue-400",
    },
    {
      icon: "👥",
      title: "COMUNIDADE ATIVA",
      desc: "Junte-se a milhares de jogadores, forme uma divisão poderosa e participe de eventos exclusivos.",
      color: "border-purple-500/30",
      text: "text-purple-400",
    },
  ];

  return (
    <motion.section
      id="about"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1 }}
      viewport={{ once: true }}
      className="py-32 px-4 bg-black relative overflow-hidden"
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-orbitron font-black tracking-tighter mb-8"
          >
            A NOVA ERA DO <span className="text-orange-500">COMBATE URBANO</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
            className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto font-exo"
          >
            Urban Clash Team é um simulador de guerra urbana onde a estratégia e a 
            lealdade definem o sobrevivente. Escolha sua facção e domine a cidade.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className={`bg-gray-950/50 backdrop-blur-xl rounded-2xl p-8 border ${f.color} hover:bg-gray-900/50 transition-all duration-300 group shadow-2xl`}
            >
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300 inline-block">
                {f.icon}
              </div>
              <h3 className={`text-xl font-orbitron font-black mb-4 tracking-tight ${f.text}`}>
                {f.title}
              </h3>
              <p className="text-gray-400 leading-relaxed font-exo">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

