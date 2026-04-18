import { motion, AnimatePresence } from "framer-motion";
import renegadosImg from "../../assets/card-select-faction-renegados.webp";
import guardioesImg from "../../assets/card-select-faction-guardioes.webp";

interface FactionCardProps {
  faction: "gangsters" | "guardas";
  selectedFaction: "gangsters" | "guardas" | null;
  onSelect: (faction: "gangsters" | "guardas") => void;
}

export default function FactionCard({
  faction,
  selectedFaction,
  onSelect,
}: FactionCardProps) {
  const isSelected = selectedFaction === faction;

  const config = {
    gangsters: {
      image: renegadosImg,
      color: "orange",
      borderClass: isSelected ? "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]" : "border-transparent",
    },
    guardas: {
      image: guardioesImg,
      color: "blue",
      borderClass: isSelected ? "border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.5)]" : "border-transparent",
    },
  };

  const c = config[faction];

  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(faction)}
      className="relative w-full flex flex-col items-center cursor-pointer transition-all duration-300"
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

      <div className={`relative transition-all duration-300 rounded-2xl border-4 ${c.borderClass} overflow-hidden`}>
        <img
          src={c.image}
          alt={faction}
          className={`h-[450px] md:h-[500px] w-auto object-contain transition-all duration-500 ${
            isSelected ? "scale-105" : "grayscale-[0.4] opacity-80"
          }`}
        />
        
        {/* No indicator line here as per request */}
      </div>
    </motion.div>
  );
}
