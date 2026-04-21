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
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="w-full max-w-4xl flex justify-center md:ml-48"
            onClick={(e) => e.stopPropagation()}
          >
            <DigitalIdentityPage forcedId={userId} onClose={onClose} isCompact={true} />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  },
);

DigitalIdentityModal.displayName = "DigitalIdentityModal";

export default DigitalIdentityModal;