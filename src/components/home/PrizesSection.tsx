import React from 'react';
import { motion } from 'framer-motion';

export function PrizesSection() {
  return (
    <motion.section
      id="prizes"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="py-20 px-4 bg-gradient-to-b from-gray-800 to-gray-900"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-orbitron text-center mb-16 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"
        >
          PRÊMIOS EM DINHEIRO
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
            Compete pelos primeiros lugares e ganhe prêmios em dinheiro real!
            Os melhores jogadores de cada facção e os clãs mais poderosos
            receberão recompensas incríveis.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-700/50 shadow-2xl"
        >
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-yellow-500/20 p-6 rounded-lg border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300"
            >
              <div className="text-6xl mb-4">🥇</div>
              <div className="font-bold text-2xl text-white mb-2">
                1º Lugar
              </div>
              <div className="text-4xl font-orbitron text-yellow-400 font-bold">
                R$ 300,00
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gray-400/20 p-6 rounded-lg border border-gray-400/30 hover:border-gray-300/50 transition-all duration-300"
            >
              <div className="text-5xl mb-4">🥈</div>
              <div className="font-bold text-2xl text-white mb-2">
                2º Lugar
              </div>
              <div className="text-3xl font-orbitron text-gray-300 font-bold">
                R$ 150,00
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-orange-500/20 p-6 rounded-lg border border-orange-500/30 hover:border-orange-400/50 transition-all duration-300"
            >
              <div className="text-5xl mb-4">🥉</div>
              <div className="font-bold text-2xl text-white mb-2">
                3º Lugar
              </div>
              <div className="text-3xl font-orbitron text-orange-400 font-bold">
                R$ 100,00
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <p className="text-xl font-orbitron text-gray-300">
              Top 3{" "}
              <span className="text-orange-500 font-bold">Gangsters</span>,{" "}
              <span className="text-blue-500 font-bold">Guardas</span> e{" "}
              <span className="text-purple-500 font-bold">Clãs</span>{" "}
              ganham!
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}