import React from "react";

interface NavbarCountdownProps {
  remainingTime: number;
}

// Função para formatar o tempo de forma compacta
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

const NavbarCountdown: React.FC<NavbarCountdownProps> = ({ remainingTime }) => {
  const { d, h, m, s } = formatTimeWithSeparators(remainingTime);

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 font-orbitron">
      <span className="whitespacea_nowrap text-xs uppercase tracking-wider text-cyan-300 underline md:text-base lg:text-xl md:underline-offset-4">
        Próxima rodada começa em
      </span>
      <div className="flex items-baseline gap-1 rounded-md border border-gray-700 bg-gray-900/50 px-2 py-0.5">
        <span className="text-sm font-bold text-white md:text-base lg:text-lg">
          {d}
        </span>
        <span className="text-xs text-cyan-400 mr-1">d</span>
        <span className="text-sm font-bold text-white md:text-base lg:text-lg">
          {h}
        </span>
        <span className="text-xs text-cyan-400 mr-1">h</span>
        <span className="text-sm font-bold text-white md:text-base lg:text-lg">
          {m}
        </span>
        <span className="text-xs text-cyan-400 mr-1">m</span>
        <span className="text-sm font-bold text-white md:text-base lg:text-lg">
          {s}
        </span>
        <span className="text-xs text-cyan-400">s</span>
      </div>
    </div>
  );
};

export default React.memo(NavbarCountdown);
