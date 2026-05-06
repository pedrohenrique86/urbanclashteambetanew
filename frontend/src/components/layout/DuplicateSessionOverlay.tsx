import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiExclamationTriangle, HiArrowPath } from "react-icons/hi2";

interface DuplicateSessionOverlayProps {
  isVisible: boolean;
  onReconnect: () => void;
}

const DuplicateSessionOverlay: React.FC<DuplicateSessionOverlayProps> = ({ isVisible, onReconnect }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden"
          >
            {/* Background Cyberpunk Deco */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/5 blur-3xl -ml-16 -mb-16 rounded-full" />
            
            <div className="relative flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <HiExclamationTriangle className="w-8 h-8 text-red-500 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black font-orbitron text-white tracking-tighter uppercase italic">
                  Sessão Duplicada
                </h2>
                <div className="h-0.5 w-16 bg-red-500 mx-auto rounded-full" />
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                Detectamos que o <span className="text-red-400 font-bold">Urban Clash</span> foi aberto em outra aba ou dispositivo. Por segurança e integridade dos dados, esta conexão foi encerrada.
              </p>

              <div className="w-full pt-4">
                <button
                  onClick={onReconnect}
                  className="w-full group relative flex items-center justify-center gap-2 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                  <HiArrowPath className="w-5 h-5 text-red-500 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="text-red-500 font-black font-orbitron text-sm tracking-widest uppercase">
                    Assumir Controle
                  </span>
                </button>
              </div>

              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
                Protocolo Single-Session Ativado
              </p>
            </div>

            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-500/30" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-500/30" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-500/30" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-500/30" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DuplicateSessionOverlay;
