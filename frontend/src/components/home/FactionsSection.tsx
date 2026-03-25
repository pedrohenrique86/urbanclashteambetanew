import React from "react";
import { motion } from "framer-motion";

// Importar as imagens dos cards
import cardGangsters from "../../assets/cardgangsters_home.png";
import cardGuardas from "../../assets/cardguardas_home.png";
import cardClans from "../../assets/cardclans_home.png";

export function FactionsSection() {
  // Definindo as cores e sombras para reutilização
  const factionStyles = {
    gangsters: {
      shadow: "[--shadow-color:rgba(249,115,22,0.5)]",
      hoverShadow: "[--shadow-color:rgba(249,115,22,0.8)]",
      beam: "from-transparent via-orange-500 to-transparent",
    },
    guardas: {
      shadow: "[--shadow-color:rgba(59,130,246,0.5)]",
      hoverShadow: "[--shadow-color:rgba(59,130,246,0.8)]",
      beam: "from-transparent via-blue-500 to-transparent",
    },
    clans: {
      shadow: "[--shadow-color:rgba(168,85,247,0.5)]",
      hoverShadow: "[--shadow-color:rgba(168,85,247,0.8)]",
      beam: "from-transparent via-purple-500 to-transparent",
    },
  };

  const factions = [
    {
      image: cardGangsters,
      alt: "Card da facção Gangsters",
      style: factionStyles.gangsters,
      delay: 0.3,
    },
    {
      image: cardGuardas,
      alt: "Card da facção Guardas",
      style: factionStyles.guardas,
      delay: 0.4,
    },
    {
      image: cardClans,
      alt: "Card sobre os Clãs",
      style: factionStyles.clans,
      delay: 0.5,
    },
  ];

  return (
    <motion.section
      id="factions"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="py-20 px-4 bg-gradient-to-b from-gray-900 to-gray-800 scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-orbitron text-center mb-16 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent"
        >
          ESCOLHA SEU DESTINO
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-10">
          {factions.map((faction, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: faction.delay, duration: 0.6 }}
              viewport={{ once: true }}
              // Adicionado 'group' para que o hover funcione nos spans
              // e 'relative' para posicionar os spans de animação
              className="group relative overflow-hidden rounded-lg"
            >
              <img
                src={faction.image}
                alt={faction.alt}
                // A sombra estática e a transição de intensidade no hover continuam aqui
                className={`w-full h-full object-cover transition-all duration-300 ${faction.style.shadow} group-hover:${faction.style.hoverShadow}`}
                style={{
                  filter: `drop-shadow(0 0 8px var(--shadow-color))`,
                }}
              />
              {/* Feixe de luz animado no hover */}
              <span
                className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${faction.style.beam} -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-in-out`}
              ></span>
              <span
                className={`absolute top-0 right-0 w-1 h-full bg-gradient-to-b ${faction.style.beam} -translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out delay-100`}
              ></span>
              <span
                className={`absolute bottom-0 right-0 w-full h-1 bg-gradient-to-l ${faction.style.beam} translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-in-out delay-200`}
              ></span>
              <span
                className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-t ${faction.style.beam} translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out delay-300`}
              ></span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
