import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import DigitalIdentityPage from "../pages/DigitalIdentityPage";

interface DigitalIdentityModalProps {
  userId: string;
  onClose: () => void;
}

/**
 * DigitalIdentityModal
 * Wrapper leve para exibir o perfil de um jogador em HUD Panel flutuante.
 * Mantém separação limpa entre camada visual do HUD e conteúdo do perfil.
 */
const DigitalIdentityModal = React.memo(
  ({ userId, onClose }: DigitalIdentityModalProps) => {
    if (!userId) return null;

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 md:left-48">
          {/* Overlay HUD - Backdrop equilibrado */}
          <motion.button
            type="button"
            aria-label="Fechar perfil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Floating HUD Panel - Sólido e Moderno */}
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative z-10 w-full max-w-4xl max-h-[95vh] custom-scrollbar"
          >
            <DigitalIdentityPage forcedId={userId} onClose={onClose} />
          </motion.div>
        </div>
      </AnimatePresence>
    );
  },
);

DigitalIdentityModal.displayName = "DigitalIdentityModal";

export default DigitalIdentityModal;