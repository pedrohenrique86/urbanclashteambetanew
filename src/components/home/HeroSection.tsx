import React from 'react';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  openAuthModal: (mode: 'login' | 'register') => void;
}

export function HeroSection({ openAuthModal }: HeroSectionProps) {
  return (
    <motion.header
      id="hero"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-transparent to-transparent"></div>
      
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>



      {/* Hero Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <motion.h1
          className="relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-orbitron font-bold mb-8 leading-tight"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.span
            className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text drop-shadow-[0_2px_2px_rgba(249,115,22,0.3)]"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            whileHover={{
              scale: 1.05,
              textShadow: "0 0 8px rgba(249,115,22,0.8)",
            }}
          >
            URBAN
          </motion.span>{" "}
          <motion.span
            className="text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text drop-shadow-[0_2px_2px_rgba(59,130,246,0.3)]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            whileHover={{
              scale: 1.05,
              textShadow: "0 0 8px rgba(59,130,246,0.8)",
            }}
          >
            CLASH
          </motion.span>{" "}
          <motion.span
            className="text-transparent bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text drop-shadow-[0_2px_2px_rgba(168,85,247,0.3)]"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            whileHover={{
              scale: 1.05,
              textShadow: "0 0 8px rgba(168,85,247,0.8)",
            }}
          >
            TEAM
          </motion.span>
          {/* Decorative elements */}
          <motion.div
            className="absolute -z-10 inset-0 opacity-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <div className="absolute top-0 left-1/4 w-24 h-24 bg-orange-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-1/2 w-24 h-24 bg-blue-500 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-purple-500 rounded-full blur-3xl"></div>
          </motion.div>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-300 leading-relaxed"
        >
          Duas facções dominam as ruas. Escolha seu lado e lute pela
          supremacia!
        </motion.p>
      </div>
a
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
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center"
            >
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-3 bg-white/70 rounded-full mt-2"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.header>
  );
}