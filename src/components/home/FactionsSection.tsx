import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom"; // Importar Link para navegação

// Importar as imagens dos cards
import cardGangsters from "../../assets/cardgangsters_home.png";
import cardGuardas from "../../assets/cardguardas_home.png";
import cardClans from "../../assets/cardclans_home.png";

export function FactionsSection() {
  const factions = [
    {
      image: cardGangsters,
      alt: "Card da facção Gangsters",
      link: "/login",
      neonColor: "hover:shadow-[0_0_15px_5px_rgba(249,115,22,0.7)]", // Laranja
      delay: 0.3,
    },
    {
      image: cardGuardas,
      alt: "Card da facção Guardas",
      link: "/login",
      neonColor: "hover:shadow-[0_0_15px_5px_rgba(59,130,246,0.7)]", // Azul
      delay: 0.4,
    },
    {
      image: cardClans,
      alt: "Card sobre os Clãs",
      link: "/clans", // Link para a página de clãs
      neonColor: "hover:shadow-[0_0_15px_5px_rgba(168,85,247,0.7)]", // Roxo para clãs
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
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: faction.delay, duration: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, y: -5 }}
              className={`relative rounded-2xl overflow-hidden transform transition-all duration-300 cursor-pointer group ${faction.neonColor} shadow-lg`}
            >
              <Link to={faction.link}>
                <img
                  src={faction.image}
                  alt={faction.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
