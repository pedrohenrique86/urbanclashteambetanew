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
      borderClass: isSelected ? "border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.4)]" : "border-transparent",
      confirmBg: "bg-orange-600 hover:bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]",
    },
    guardas: {
      image: guardioesImg,
      color: "blue",
      borderClass: isSelected ? "border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.4)]" : "border-transparent",
      confirmBg: "bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.5)]",
    },
  };

  const c = config[faction];

  return (
    <motion.div
      whileHover={!isSelected ? { y: -5 } : {}}
      className="relative w-full flex flex-col items-center transition-all duration-300"
    >
      {/* Protocol Active Status Label */}
      <div className="h-8 mb-2 flex items-center justify-center">
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className={`px-3 py-1 rounded-t-sm border-t-2 border-x-2 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm ${
                faction === "gangsters" ? "border-orange-500 text-orange-400" : "border-blue-500 text-blue-400"
              }`}
            >
              <span className="text-[9px] font-black tracking-[0.3em] uppercase whitespace-nowrap">
                Protocolo {faction === "gangsters" ? "Renegado" : "Guardião"} Ativo
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div 
        onClick={() => !isSelected && onSelect(faction)}
        className={`relative transition-all duration-500 rounded-2xl border-4 ${c.borderClass} overflow-hidden ${!isSelected ? "cursor-pointer" : ""}`}
      >
        <img
          src={c.image}
          alt={faction}
          className={`h-[450px] md:h-[550px] w-auto object-contain transition-all duration-700 ${
            isSelected ? "scale-105" : "grayscale-[0.5] opacity-70 hover:grayscale-0 hover:opacity-100"
          }`}
        />

        {/* Confirmation Overlay */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-white font-orbitron font-black text-xl tracking-wider">
                    CONFIRMAR ESCOLHA?
                  </h3>
                  <p className="text-gray-300 text-[10px] uppercase tracking-[0.2em]">
                    Clique abaixo para iniciar seu alistamento
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm();
                  }}
                  className={`
                    group relative px-8 py-4 rounded-xl 
                    font-orbitron font-black text-sm tracking-[0.2em] text-white
                    transition-all duration-300 uppercase
                    ${c.confirmBg}
                  `}
                >
                  <span className="relative z-10 flex items-center gap-3">
                    ALISTAR-SE AGORA
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </span>
                  
                  {/* Button Shine Effect */}
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <motion.div 
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                    />
                  </div>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
