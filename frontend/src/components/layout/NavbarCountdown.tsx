import React from "react";

interface NavbarCountdownProps {
  remainingTime: number;
}

// Função para formatar o tempo de forma compacta
const formatTimeWithSeparators = (totalSeconds: number) => {
  if (totalSeconds <= 0) {
    return { d: "00", h: "00", m: "00", s: "00" };
  }

  const d = Math.floor(totalSeconds / (3600 * 24));
  const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  return {
    d: String(d).padStart(2, "0"),
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
  };
};

const NavbarCountdown: React.FC<NavbarCountdownProps> = ({ remainingTime }) => {
  const { d, h, m, s } = formatTimeWithSeparators(remainingTime);

  // Calculate Target Start Date
  const targetDate = new Date(Date.now() + remainingTime * 1000);
  const formattedDate = targetDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).replace(/ de /g, ".").toUpperCase().replace(/\./g, ".");

  return (
    <div className="flex flex-col md:flex-row items-center gap-0.5 md:gap-3 px-1 md:px-2 py-0 relative group w-full md:w-auto">
      {/* HUD Accent - Left (Hidden on Mobile Stack) */}
      <div className="hidden lg:block h-4 w-[1px] bg-gradient-to-b from-transparent via-cyan-500 to-transparent" />

      {/* Main Mission Protocol Info */}
      <div className="flex flex-col items-start min-w-[100px] sm:min-w-[120px]">
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-cyan-500 rotate-45 animate-pulse" />
          <span className="text-[8px] sm:text-[9px] font-black font-orbitron text-white tracking-[0.1em] uppercase">
            Data_<span className="text-cyan-400">Inicio</span>
          </span>
        </div>
        <span className="text-[7px] sm:text-[8px] font-mono font-bold text-gray-400 tracking-tighter">
           {formattedDate.replace(/\.$/, "")} <span className="text-[6px] text-gray-700 mx-0.5">|</span> START_DAY
        </span>
      </div>

      {/* Armored HUD Timer Frame */}
      <div className="relative p-[1px] bg-gradient-to-br from-cyan-500/30 via-transparent to-orange-500/30"
           style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
        
        <div className="bg-zinc-950 px-1.5 sm:px-3 py-0.5 flex items-center gap-1 sm:gap-2 relative overflow-hidden"
             style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
          
          {/* Flowing Energy Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
          
          {[
            { val: d, label: "D" },
            { val: h, label: "H" },
            { val: m, label: "M" },
            { val: s, label: "S" }
          ].map((item, idx) => (
            <React.Fragment key={item.label}>
              <div className="flex items-center">
                <div className="w-3.5 sm:w-6 flex justify-end">
                  <span className="text-xs sm:text-lg font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] tabular-nums">
                    {item.val}
                  </span>
                </div>
                <span className="text-[8px] sm:text-[10px] font-mono font-bold text-cyan-500/60 ml-0.5">{item.label}</span>
              </div>
              {idx < 3 && (
                <div className="h-3 w-px bg-white/5 mx-0.5" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(NavbarCountdown);
