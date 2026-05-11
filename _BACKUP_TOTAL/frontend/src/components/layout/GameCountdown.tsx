import React from "react";
import { motion } from "framer-motion";
import { useMediaQuery } from "../../hooks/useMediaQuery"; // Importa o novo hook

interface GameCountdownProps {
  remainingTime: number;
}

const formatTimeWithSeparators = (totalSeconds: number) => {
  if (totalSeconds <= 0) {
    return { d: "0", h: "00", m: "00", s: "00" };
  }

  const d = Math.floor(totalSeconds / (3600 * 24));
  const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  return {
    d: String(d),
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
  };
};

const GameCountdown: React.FC<GameCountdownProps> = ({ remainingTime }) => {
  const { d, h, m, s } = formatTimeWithSeparators(remainingTime);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full bg-gradient-to-r from-gray-800/80 to-gray-900/90 backdrop-blur-sm border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/10 p-4"
      >
        <div
          className={`flex justify-center items-center text-white font-orbitron ${isDesktop ? "flex-row" : "flex-col"}`}
        >
          <span
            className={`uppercase tracking-wider text-cyan-300 ${isDesktop ? "text-lg mr-3" : "text-sm mb-2"}`}
          >
            {isDesktop ? "Próxima rodada começa em:" : "Rodada começa em:"}
          </span>
          <div className="flex items-baseline gap-1 bg-gray-900/50 rounded-lg px-3 py-1 border border-gray-700">
            <span
              className={`${isDesktop ? "text-3xl" : "text-2xl"} font-bold text-white`}
            >
              {d}
            </span>
            <span className="text-sm text-cyan-400 mr-1">d</span>
            <span
              className={`${isDesktop ? "text-3xl" : "text-2xl"} font-bold text-white`}
            >
              {h}
            </span>
            <span className="text-sm text-cyan-400 mr-1">h</span>
            <span
              className={`${isDesktop ? "text-3xl" : "text-2xl"} font-bold text-white`}
            >
              {m}
            </span>
            <span className="text-sm text-cyan-400 mr-1">m</span>
            <span
              className={`${isDesktop ? "text-3xl" : "text-2xl"} font-bold text-white`}
            >
              {s}
            </span>
            <span className="text-sm text-cyan-400">s</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(GameCountdown);
