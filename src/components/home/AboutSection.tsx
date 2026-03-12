import React from "react";
import { motion } from "framer-motion";

export function AboutSection() {
  return (
    <motion.section
      id="about"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="py-20 px-4 bg-gradient-to-b from-gray-900 to-gray-800"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-orbitron text-center mb-16 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
        >
          SOBRE O JOGO
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-xl text-gray-300 leading-relaxed max-w-4xl mx-auto">
            Urban Clash Team é um jogo de estratégia e ação onde você escolhe
            seu lado na guerra urbana. Seja um gangster implacável, um guarda
            corajoso e forme o clã mais poderoso da cidade. Cada escolha
            determina seu destino neste mundo de conflitos e alianças.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-orange-500/50 transition-all duration-300"
          >
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-xl font-orbitron font-bold mb-3 text-orange-400">
              COMBATE ESTRATÉGICO
            </h3>
            <p className="text-gray-300">
              Planeje suas batalhas, forme alianças e domine territórios em
              combates táticos intensos.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300"
          >
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-orbitron font-bold mb-3 text-blue-400">
              RANKING COMPETITIVO
            </h3>
            <p className="text-gray-300">
              Suba no ranking, prove sua superioridade e ganhe prêmios em
              dinheiro real.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 md:col-span-2 lg:col-span-1"
          >
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-orbitron font-bold mb-3 text-purple-400">
              COMUNIDADE ATIVA
            </h3>
            <p className="text-gray-300">
              Junte-se a milhares de jogadores, forme clãs poderosos e participe
              de eventos exclusivos.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
