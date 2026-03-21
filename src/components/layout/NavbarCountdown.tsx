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
    <div className="flex items-baseline justify-center gap-2 font-orbitron">
      <span className="text-sm uppercase tracking-wider text-cyan-300">
        Próxima rodada começa em:
      </span>
      <div className="flex items-baseline gap-1 bg-gray-900/50 rounded-md px-2 py-0.5 border border-gray-700">
        <span className="text-base font-bold text-white">{d}</span>
        <span className="text-xs text-cyan-400 mr-1">d</span>
        <span className="text-base font-bold text-white">{h}</span>
        <span className="text-xs text-cyan-400 mr-1">h</span>
        <span className="text-base font-bold text-white">{m}</span>
        <span className="text-xs text-cyan-400 mr-1">m</span>
        <span className="text-base font-bold text-white">{s}</span>
        <span className="text-xs text-cyan-400">s</span>
      </div>
    </div>
  );
};

export default React.memo(NavbarCountdown);
