import React from "react";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section id="hero" className="relative h-screen">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative h-full flex items-center justify-center overflow-hidden"
      >
        {/* Background Effects */}
        {/* 1. Fundo Desfocado (Efeito Reflexo/Ambient Light nas laterais) */}
        <div
          className="absolute inset-0 bg-no-repeat bg-cover bg-center blur-xl opacity-40 scale-110"
          style={{ backgroundImage: "url('/home.png')" }}
        ></div>

        {/* 2. Overlay escuro sutil para dar profundidade */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* 3. Imagem Principal (Ampliada e responsiva, ancorada no topo) */}
        <div
          className="absolute inset-0 top-16 bg-no-repeat bg-contain bg-top scale-110 md:scale-125 origin-top"
          style={{ backgroundImage: "url('/home.png')" }}
        ></div>
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
              <div className="text-white/80 font-medium text-sm font-orbitron tracking-wider drop-shadow-md">
                Arraste para baixo
              </div>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-6 h-10 border-2 border-white/60 rounded-full flex justify-center drop-shadow-md"
              >
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-1 h-3 bg-white/90 rounded-full mt-2"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>
    </section>
  );
}
