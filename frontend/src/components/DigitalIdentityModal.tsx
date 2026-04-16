import React from "react";
import { motion } from "framer-motion";
import DigitalIdentityPage from "../pages/DigitalIdentityPage";

interface DigitalIdentityModalProps {
  userId: string;
  onClose: () => void;
}

/**
 * DigitalIdentityModal - Wrapper leve para exibir o perfil de um jogador em modal.
 * Mantém a arquitetura limpa separando responsabilidades de modal e página.
 */
export default function DigitalIdentityModal({ userId, onClose }: DigitalIdentityModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop com Blur suave */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
        onClick={onClose} 
      />

      {/* Container do Modal */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto custom-scrollbar bg-stone-950 border border-white/10 rounded-2xl shadow-3xl"
      >
        <DigitalIdentityPage 
          forcedId={userId} 
          onClose={onClose} 
        />
      </motion.div>
    </div>
  );
}
