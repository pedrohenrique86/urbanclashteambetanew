import { motion, AnimatePresence } from "framer-motion";

interface ConfirmButtonProps {
  selectedFaction: "gangsters" | "guardas" | null;
  onConfirm: () => void;
}

export default function ConfirmButton({
  selectedFaction,
  onConfirm,
}: ConfirmButtonProps) {
  const getTheme = () => {
    if (!selectedFaction) return {
      bg: "bg-white/5",
      text: "text-white/20",
      border: "border-white/10",
      glow: "shadow-none",
      accent: "bg-white/10"
    };
    
    return selectedFaction === "gangsters" 
      ? {
          bg: "bg-orange-600 hover:bg-orange-500",
          text: "text-white",
          border: "border-orange-400/50",
          glow: "shadow-[0_0_40px_rgba(249,115,22,0.6)]",
          accent: "bg-orange-400"
        }
      : {
          bg: "bg-blue-600 hover:bg-blue-500",
          text: "text-white",
          border: "border-blue-400/50",
          glow: "shadow-[0_0_40px_rgba(37,99,235,0.6)]",
          accent: "bg-blue-400"
        };
  };

  const theme = getTheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1 }}
      className="flex items-center justify-center h-full"
    >
      <div className="relative group flex flex-col items-center">
        {/* Decorative Vertical Lines (Desktop only) */}
        <div className="hidden md:block absolute -top-16 bottom-auto w-[2px] h-12 bg-gradient-to-t from-white/20 to-transparent" />
        <div className="hidden md:block absolute -bottom-16 top-auto w-[2px] h-12 bg-gradient-to-b from-white/20 to-transparent" />

        <div className="relative">
          {/* External Cinematic Glow */}
          <AnimatePresence>
            {selectedFaction && (
              <motion.div
                layoutId="btnGlow"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute -inset-4 rounded-full blur-2xl opacity-40 ${theme.bg}`}
              />
            )}
          </AnimatePresence>
          
          <button
            onClick={onConfirm}
            disabled={!selectedFaction}
            className={`
              relative z-10
              w-24 h-24 md:w-32 md:h-32
              rounded-full
              flex flex-col items-center justify-center
              border-[3px] 
              transition-all duration-700 ease-out
              uppercase font-orbitron font-black
              ${theme.bg} ${theme.text} ${theme.border} ${theme.glow}
              ${!selectedFaction ? "cursor-not-allowed grayscale" : "hover:scale-110 active:scale-90"}
            `}
          >
            {/* Action Text */}
            <span className="text-[10px] md:text-[12px] tracking-[0.2em] mb-1">
              {selectedFaction ? "Confirmar" : "Escolha"}
            </span>
            <span className="text-[12px] md:text-[14px] leading-tight">
              Alistamento
            </span>

            {/* Selection Pulse Ring */}
            {selectedFaction && (
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`absolute inset-0 rounded-full border-2 ${theme.border}`}
              />
            )}
            
            {/* Internal Shine */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
               <motion.div 
                 animate={{ opacity: [0, 0.5, 0], x: ["-100%", "200%"] }}
                 transition={{ duration: 3, repeat: Infinity }}
                 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
               />
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}