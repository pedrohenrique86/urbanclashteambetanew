import React from "react";
import { motion } from "framer-motion";

// Importar as imagens dos cards
import cardGangsters from "../../assets/cardgangsters_home.png";
import cardGuardas from "../../assets/cardguardas_home.png";
import cardClans from "../../assets/cardclans_home.png";

export function FactionsSection() {
  const factions = [
    {
      image: cardGangsters,
      alt: "Card da facção Gangsters",
      neonColor: "bg-orange-500",
      delay: 0.3,
    },
    {
      image: cardGuardas,
      alt: "Card da facção Guardas",
      neonColor: "bg-blue-500",
      delay: 0.4,
    },
    {
      image: cardClans,
      alt: "Card sobre os Clãs",
      neonColor: "bg-purple-500",
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
              className="relative group overflow-hidden rounded-2xl shadow-lg"
            >
              {/* Efeito de borda neon animada */}
              <span
                className={`absolute top-0 left-0 w-0 h-1 ${faction.neonColor} transition-all duration-200 ease-out group-hover:w-full`}
              ></span>
              <span
                className={`absolute top-0 right-0 w-1 h-0 ${faction.neonColor} transition-all duration-200 ease-out delay-200 group-hover:h-full`}
              ></span>
              <span
                className={`absolute bottom-0 right-0 w-0 h-1 ${faction.neonColor} transition-all duration-200 ease-out delay-[400ms] group-hover:w-full`}
              ></span>
              <span
                className={`absolute bottom-0 left-0 w-1 h-0 ${faction.neonColor} transition-all duration-200 ease-out delay-[600ms] group-hover:h-full`}
              ></span>

              <img
                src={faction.image}
                alt={faction.alt}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
