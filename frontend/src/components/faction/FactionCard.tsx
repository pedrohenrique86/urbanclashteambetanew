import { motion, AnimatePresence } from "framer-motion";
import renegadosImg from "../../assets/card-select-faction-renegados.webp";
import guardioesImg from "../../assets/card-select-faction-guardioes.webp";

interface FactionCardProps {
  faction: "gangsters" | "guardas";
  selectedFaction: "gangsters" | "guardas" | null;
  onSelect: (faction: "gangsters" | "guardas") => void;
  onConfirm: () => void;
}

export default function FactionCard({
  faction,
  selectedFaction,
  onSelect,
  onConfirm,
}: FactionCardProps) {
  const isSelected = selectedFaction === faction;

  const config = {
    gangsters: {
      image: renegadosImg,
      color: "orange",
      accent: "text-orange-500",
      borderClass: isSelected ? "border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.3)] scale-105" : "border-white/10 hover:border-orange-500/50 hover:scale-[1.02]",
      buttonClass: "bg-orange-600 hover:bg-orange-500",
      label: "PROTOCOLO_RENEGADO"
    },
    guardas: {
      image: guardioesImg,
      color: "blue",
      accent: "text-blue-500",
      borderClass: isSelected ? "border-blue-500 shadow-[0_0_40px_rgba(37,99,235,0.3)] scale-105" : "border-white/10 hover:border-blue-500/50 hover:scale-[1.02]",
      buttonClass: "bg-blue-600 hover:bg-blue-500",
      label: "PROTOCOLO_GUARDIAO"
    },
  };

  const c = config[faction];

  return (
    <div className="relative group transition-all duration-700">
      {/* Selection Glow */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`absolute -inset-10 bg-${c.color}-500/5 blur-[100px] rounded-full pointer-events-none z-0`}
          />
        )}
      </AnimatePresence>

      <motion.div
        onClick={() => !isSelected && onSelect(faction)}
        className={`
          relative z-10 flex flex-col items-center transition-all duration-500 
          rounded-2xl border-[1px] bg-black/40 backdrop-blur-md overflow-hidden 
          ${c.borderClass} ${!isSelected ? "cursor-pointer" : ""}
        `}
      >
        {/* Top Status Bar */}
        <div className="w-full flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
           <div className="flex items-center gap-2">
              <div className={`w-1 h-1 rounded-full ${isSelected ? "animate-pulse " + (faction === 'gangsters' ? 'bg-orange-500' : 'bg-blue-500') : 'bg-white/20'}`} />
              <span className={`text-[7px] font-black font-orbitron tracking-widest ${isSelected ? 'text-white' : 'text-white/40'}`}>
                 {c.label}
              </span>
           </div>
           <span className="text-[6px] text-zinc-600 font-bold uppercase">U.C._NETWORKS</span>
        </div>

        {/* Card Image Wrapper */}
        <div className="relative h-[350px] sm:h-[450px] lg:h-[500px] w-full overflow-hidden">
          <img
            src={c.image}
            alt={faction}
            className={`
              w-full h-full object-cover transition-all duration-1000
              ${isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-90"}
            `}
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
        </div>

        {/* Confirmation Overlay */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-white font-orbitron font-black text-2xl tracking-[0.1em] uppercase">
                     IDENTIDADE <span className={c.accent}>CONFIRMADA</span>
                  </h3>
                  <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em]">
                     ASSUMIR PROTOCOLO DE COMBATE?
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm();
                  }}
                  className={`
                    relative px-10 py-4 rounded-sm
                    font-orbitron font-black text-xs tracking-[0.4em] text-white
                    transition-all duration-300 uppercase overflow-hidden
                    ${c.buttonClass}
                  `}
                >
                  <span className="relative z-10">ALISTAR-SE</span>
                  <div className="absolute inset-0 bg-white/20 -translate-x-full hover:translate-x-full transition-transform duration-700 skew-x-12" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Decorative Label */}
        {!isSelected && (
           <div className="absolute bottom-6 left-0 w-full text-center transition-all group-hover:bottom-8 opacity-0 group-hover:opacity-100">
              <span className="text-[10px] font-black text-white font-orbitron tracking-[0.5em] uppercase">
                 SELECIONAR
              </span>
           </div>
        )}
      </motion.div>
    </div>
  );
}

