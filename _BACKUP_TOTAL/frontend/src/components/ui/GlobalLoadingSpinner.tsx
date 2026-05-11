import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLoading } from "../../contexts/LoadingContext";
import { LoadingSpinner } from "./LoadingSpinner";

export const GlobalLoadingSpinner: React.FC = () => {
  const { loadingState } = useLoading();

  return (
    <AnimatePresence>
      {loadingState.isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ pointerEvents: "all" }} // Garante que a tela não seja clicável
        >
          <LoadingSpinner size="lg" />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mt-4 text-center font-orbitron text-lg text-white"
          >
            {loadingState.message}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};