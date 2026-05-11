import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "react-tooltip";
import {
  FaHourglassHalf,
  FaPlay,
  FaStop,
  FaPause,
  FaFlagCheckered,
} from "react-icons/fa";
import { IoMdTime } from "react-icons/io";

interface GameClockDisplayProps {
  remainingTime: number;
  status: string;
  serverTime: Date | null;
  isCollapsed: boolean;
  isMobileMode?: boolean;
}

const formatRemainingTime = (totalSeconds: number): string => {
  if (totalSeconds <= 0) {
    return "0d 00h 00m 00s";
  }
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
};

const formatServerTime = (date: Date | null): string => {
  if (!date) return "--:--:-- BRT | --:--:-- UTC";

  // Opções para formatar a hora nos fusos específicos.
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  // Formata para São Paulo (BRT/BRST)
  const saoPauloTime = date.toLocaleString("en-GB", {
    ...options,
    timeZone: "America/Sao_Paulo",
  });

  // Formata para UTC
  const utcTime = date.toLocaleString("en-GB", { ...options, timeZone: "UTC" });

  // Pega a sigla do fuso horário de São Paulo (ex: BRT ou BRST)
  const saoPauloTimeZoneName = new Intl.DateTimeFormat("pt-BR", {
    timeZoneName: "short",
    timeZone: "America/Sao_Paulo",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  return `${saoPauloTime} ${saoPauloTimeZoneName || "BRT"} | ${utcTime} UTC`;
};

const GameClockDisplay: React.FC<GameClockDisplayProps> = ({
  remainingTime,
  status,
  serverTime,
  isCollapsed,
  isMobileMode = false,
}) => {
  const remainingTimeStr = formatRemainingTime(remainingTime);
  const serverTimeStr = formatServerTime(serverTime);

  const getStatusInfo = () => {
    switch (status) {
      case "running":
        return {
          text: "Tempo Restante",
          color: "text-lime-400",
          icon: <FaPlay />,
        };
      case "paused":
        return {
          text: "Pausado:",
          color: "text-orange-400",
          icon: <FaPause />,
        };
      case "finished":
        return {
          text: "Finalizado",
          color: "text-gray-400",
          icon: <FaFlagCheckered />,
        };
      case "stopped":
        return {
          text: "Rodada Parada",
          color: "text-red-500",
          icon: <FaStop />,
        };
      case "scheduled":
        return {
          text: "Aguardando Início",
          color: "text-cyan-400",
          icon: <FaHourglassHalf />,
        };
      default:
        return {
          text: "Carregando...",
          color: "text-gray-500",
          icon: <IoMdTime />,
        };
    }
  };

  const {
    text: statusText,
    color: statusColor,
    icon: statusIcon,
  } = getStatusInfo();

  const [isInteracting, setIsInteracting] = useState(false);
  const interactionTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleInteractionStart = () => {
      setIsInteracting(true);
      if (interactionTimer.current) {
        clearTimeout(interactionTimer.current);
      }
    };

    const handleInteractionEnd = () => {
      interactionTimer.current = setTimeout(() => {
        setIsInteracting(false);
      }, 250); // A barra reaparece após 250ms de inatividade
    };

    // Combina scroll e touch para uma lógica unificada
    const handleScroll = () => {
      handleInteractionStart();
      handleInteractionEnd();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("touchstart", handleInteractionStart, { passive: true });
    document.addEventListener("touchend", handleInteractionEnd, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("touchstart", handleInteractionStart);
      document.removeEventListener("touchend", handleInteractionEnd);
      if (interactionTimer.current) {
        clearTimeout(interactionTimer.current);
      }
    };
  }, []);

  const shouldBeVisible = !isInteracting;

  if (isMobileMode) {
    return (
      <>
        <AnimatePresence>
          {shouldBeVisible && (
            <motion.div
              initial={{ y: 20, opacity: 0, x: "-50%" }}
              animate={{ y: 0, opacity: 1, x: "-50%" }}
              exit={{ y: 20, opacity: 0, x: "-50%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-24 left-1/2 z-[60] flex items-center gap-4 px-5 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.8)] md:hidden whitespace-nowrap"
            >
              {/* Status e Cronômetro */}
              <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${statusColor}`}>
                <span className="scale-90">{statusIcon}</span>
                <span>{statusText.split(':')[0]}</span>
                <span className="font-mono text-white bg-white/5 px-2 py-0.5 rounded border border-white/5">{remainingTimeStr}</span>
              </div>

              {/* Divisor */}
              <div className="w-px h-3 bg-white/20" />

              {/* Hora do Servidor */}
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/80">
                <IoMdTime className="scale-110 text-purple-400" />
                <span className="font-mono">{serverTimeStr}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Tooltip id="status-tooltip" place="top" className="!bg-slate-700 !bg-opacity-80 !backdrop-blur-sm !text-white !rounded-lg !px-3 !py-1 !text-xs !font-sans" style={{ zIndex: 9999 }} />
      </>
    );
  }

  return (
    <>
      <div
        className={`flex flex-col items-center justify-center gap-1 overflow-hidden ${
          isCollapsed ? "p-1 w-auto" : "p-2 w-full"
        }`}
        data-tooltip-id={isCollapsed ? "game-clock-tooltip" : undefined}
        data-tooltip-content={
          isCollapsed ? `${statusText} ${remainingTimeStr}` : undefined
        }
      >
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded-clock"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full flex flex-col items-center gap-1"
            >
              {/* Divisor Transparente */}
              <div className="w-full h-px bg-white/10 my-1"></div>

              {/* Linha 1: Status */}
              <div
                className={`w-full flex items-center justify-center gap-1.5 ${statusColor}`}
              >
                <span className="text-[10px]">{statusIcon}</span>
                <span className="font-orbitron font-bold uppercase tracking-wider text-[8px]">
                  {statusText}
                </span>
              </div>

              {/* Linha 2: Cronômetro */}
              <div
                className={`w-full font-mono font-bold text-[10px] ${statusColor} text-center`}
              >
                {remainingTimeStr}
              </div>

              {/* Linha 3: Hora do Servidor */}
              <div
                data-tooltip-id="server-time-tooltip"
                data-tooltip-content="Horário de São Paulo (BRT) | Horário Coordenado Universal (UTC)"
                className="w-full flex items-center justify-center gap-1 text-gray-400 transition-colors"
              >
                <IoMdTime className="text-[10px]" />
                <span className="font-mono text-[10px] min-w-max whitespace-nowrap">
                  {serverTimeStr}
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-clock"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center gap-2 py-1"
            >
              <span className={`${statusColor} text-sm`}>{statusIcon}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// Envolve o componente com React.memo para otimizar as renderizações,
// evitando re-renders desnecessários se as props não mudarem.
export default React.memo(GameClockDisplay);