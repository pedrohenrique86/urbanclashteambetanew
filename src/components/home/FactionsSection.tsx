import React from "react";
import { motion } from "framer-motion";

export function FactionsSection() {
  const factions = [
    {
      icon: "🔫",
      title: "GANGSTERS",
      description: "Controle o submundo do crime organizado",
      bg: "from-orange-600 to-orange-500",
      delay: 0.3,
    },
    {
      icon: "🛡️",
      title: "GUARDAS",
      description: "Mantenha a ordem e a justiça nas ruas",
      bg: "from-blue-600 to-blue-400",
      delay: 0.4,
    },
    {
      icon: "👥",
      title: "CLÃS",
      description: "Una-se aos melhores e domine o servidor",
      bg: "from-purple-600 to-purple-500",
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
        <div className="grid md:grid-cols-3 gap-8">
          {factions.map((faction, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: faction.delay, duration: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, y: -10 }}
              className={`p-8 rounded-2xl bg-gradient-to-br ${faction.bg} transform transition-all duration-300 shadow-2xl hover:shadow-3xl cursor-pointer group`}
            >
              <div className="text-center space-y-6">
                <div className="text-7xl group-hover:scale-110 transition-transform duration-300">
                  {faction.icon}
                </div>
                <h3 className="text-3xl font-orbitron font-bold">
                  {faction.title}
                </h3>
                <p className="text-lg opacity-90">{faction.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
