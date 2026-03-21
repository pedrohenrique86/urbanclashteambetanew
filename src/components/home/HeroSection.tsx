import React from "react";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section id="hero" className="pt-16">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden"
      >
        {/* Background Effects */}
        {/* A imagem de fundo substitui os gradientes anteriores */}
        <div
          className="absolute inset-0 bg-no-repeat bg-cover bg-top"
          style={{ backgroundImage: "url('/home.png')" }}
        ></div>
        <div className="absolute inset-0 bg-black/30"></div>{" "}
        {/* Overlay escuro opcional para legibilidade */}
        {/* Hero Content - Vazio, pois o texto foi removido */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          {/* O conteúdo de texto foi removido conforme solicitado */}
        </div>
        {/* Scroll Indicator - Positioned at bottom of hero section */}
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
              <div className="text-white/70 text-sm font-orbitron tracking-wider">
                Arraste para baixo
              </div>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center"
              >
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-1 h-3 bg-white/70 rounded-full mt-2"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>
    </section>
  );
}
