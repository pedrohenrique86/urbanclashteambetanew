import React, { Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DigitalIdentityPage = lazy(() => import("../pages/DigitalIdentityPage"));

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
          className="fixed inset-0 z-[9000] flex justify-center items-start overflow-y-auto p-4 py-12 bg-transparent pointer-events-auto custom-scrollbar"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.3, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="pointer-events-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense fallback={<div className="w-full h-96 animate-pulse bg-white/5 rounded-2xl" />}>
              <DigitalIdentityPage forcedId={userId} onClose={onClose} isCompact={true} />
            </Suspense>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  },
);

DigitalIdentityModal.displayName = "DigitalIdentityModal";

export default DigitalIdentityModal;