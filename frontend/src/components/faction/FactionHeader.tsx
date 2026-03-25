import { motion } from "framer-motion";

export default function FactionHeader() {
  return (
    <div className="text-center mb-12">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-3xl sm:text-4xl md:text-5xl font-orbitron mb-3 sm:mb-4 text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text"
      >
        ESCOLHA SUA FACÇÃO
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-gray-300 max-w-2xl mx-auto"
      >
        Sua escolha definirá seu papel na cidade. Escolha com sabedoria,
        pois esta decisão moldará sua jornada.
      </motion.p>
    </div>
  );
}