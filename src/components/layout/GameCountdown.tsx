import React from "react";
import { motion } from "framer-motion";

interface GameCountdownProps {
  remainingTime: number;
}

// Função para formatar o tempo em partes (dias, horas, minutos, segundos)
const formatTimeParts = (totalSeconds: number) => {
  if (totalSeconds <= 0) {
    return { days: "00", hours: "00", minutes: "00", seconds: "00" };
  }

  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
};

const TimeBlock: React.FC<{ value: string; label: string }> = ({
  value,
  label,
}) => (
  <div className="flex flex-col items-center">
    <span className="font-orbitron text-2xl md:text-4xl font-bold text-white tracking-wider">
      {value}
    </span>
    <span className="text-xs md:text-sm font-semibold uppercase text-cyan-300 tracking-widest">
      {label}
    </span>
  </div>
);

const GameCountdown: React.FC<GameCountdownProps> = ({ remainingTime }) => {
  const { days, hours, minutes, seconds } = formatTimeParts(remainingTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="w-full bg-black bg-opacity-30 backdrop-blur-md border-b-2 border-cyan-500/50 py-4"
    >
      <div className="container mx-auto text-center">
        <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-wider mb-3">
          Próxima rodada começa em
        </h2>
        <div className="flex justify-center items-center gap-2 md:gap-4">
          <TimeBlock value={days} label="Dias" />
          <span className="font-orbitron text-2xl md:text-4xl text-cyan-400 -mt-4">
            :
          </span>
          <TimeBlock value={hours} label="Horas" />
          <span className="font-orbitron text-2xl md:text-4xl text-cyan-400 -mt-4">
            :
          </span>
          <TimeBlock value={minutes} label="Minutos" />
          <span className="font-orbitron text-2xl md:text-4xl text-cyan-400 -mt-4">
            :
          </span>
          <TimeBlock value={seconds} label="Segundos" />
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(GameCountdown);
