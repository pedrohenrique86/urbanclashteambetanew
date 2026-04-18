import { motion } from "framer-motion";

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
      glow: "shadow-none"
    };
    
    return selectedFaction === "gangsters" 
      ? {
          bg: "bg-orange-600 hover:bg-orange-500",
          text: "text-white",
          border: "border-orange-400/50",
          glow: "shadow-[0_0_30px_rgba(249,115,22,0.4)]"
        }
      : {
          bg: "bg-blue-600 hover:bg-blue-500",
          text: "text-white",
          border: "border-blue-400/50",
          glow: "shadow-[0_0_30px_rgba(37,99,235,0.4)]"
        };
  };

  const theme = getTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="flex justify-center mt-12 pb-10"
    >
      <div className="relative group">
        {/* Ambient Glow */}
        {selectedFaction && (
          <motion.div
            layoutId="buttonGlow"
            className={`absolute -inset-1 rounded-xl blur-xl opacity-50 transition-all duration-500 ${theme.bg}`}
          />
        )}
        
        <button
          onClick={onConfirm}
          disabled={!selectedFaction}
          className={`relative px-12 py-5 rounded-xl font-orbitron text-xl font-black tracking-[0.2em] transition-all duration-500 border-2 uppercase ${theme.bg} ${theme.text} ${theme.border} ${theme.glow} ${
            !selectedFaction 
              ? "cursor-not-allowed" 
              : "hover:scale-105 active:scale-95"
          }`}
        >
          <span className="relative z-10">ALISTAR-SE AGORA</span>
          
          {/* Internal Shine Effect */}
          {selectedFaction && (
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />
          )}
        </button>
      </div>
    </motion.div>
  );
}