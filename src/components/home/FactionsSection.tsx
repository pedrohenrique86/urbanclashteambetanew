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
    },
    guardas: {
      shadow: "[--shadow-color:rgba(59,130,246,0.5)]",
      hoverShadow: "[--shadow-color:rgba(59,130,246,0.8)]",
    },
    clans: {
      shadow: "[--shadow-color:rgba(168,85,247,0.5)]",
      hoverShadow: "[--shadow-color:rgba(168,85,247,0.8)]",
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
              className="group"
            >
              <img
                src={faction.image}
                alt={faction.alt}
                className={`w-full h-full object-cover transition-all duration-300 ${faction.style.shadow} group-hover:${faction.style.hoverShadow}`}
                style={{
                  filter: `drop-shadow(0 0 8px var(--shadow-color))`,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
