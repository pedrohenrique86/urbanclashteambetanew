import React from "react";
import { motion } from "framer-motion";
import homePngUrl from "../../assets/home.png"; // Importa a URL do PNG

export function HeroSection() {
  return (
    <section id="hero" className="relative w-full h-screen overflow-hidden">
      {/* Imagem de fundo com a tag <img>, a abordagem mais robusta e à prova de falhas */}
      <img
        src={homePngUrl}
        alt="Urban Clash Team background"
        // object-cover preenche a tela mantendo a proporção, sem distorcer.
        // object-center garante que o centro da imagem seja priorizado.
        className="absolute top-0 left-0 w-full h-full object-cover object-center z-0"
      />

      {/* Conteúdo sobre a imagem (se houver) deve ter z-index > 0 */}
      <div className="relative z-10 h-full flex flex-col items-center justify-end pb-24">
        {/* Espaço para texto ou outros elementos sobre a imagem */}
      </div>

      {/* Indicador de Rolagem */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center space-y-2"
          >
            <div
              className="text-cyan-300 font-bold text-sm font-orbitron tracking-wider"
              style={{
                textShadow:
                  "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(34, 211, 238, 0.9)",
              }}
            >
              Role para baixo
            </div>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-6 h-10 border-2 border-cyan-300 rounded-full flex justify-center"
              style={{
                filter:
                  "drop-shadow(-1px -1px 0 #000) drop-shadow(1px -1px 0 #000) drop-shadow(-1px 1px 0 #000) drop-shadow(1px 1px 0 #000) drop-shadow(0 0 5px rgba(34, 211, 238, 0.7))",
              }}
            >
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-1 h-3 bg-white rounded-full mt-2"
                style={{ filter: "drop-shadow(0 0 4px white)" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
