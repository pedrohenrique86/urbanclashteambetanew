import React from "react";
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

  return (
    <>
      <div
        className={`rounded-lg shadow-lg flex flex-col items-center justify-center gap-1 overflow-hidden ${
          isCollapsed ? "p-1 w-auto" : "p-2 w-full border border-slate-700/50"
        }`}
        data-tooltip-id="game-clock-tooltip"
        data-tooltip-content={`${statusText} ${remainingTimeStr}`}
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
              {/* Linha 1: Status */}
              <div
                className={`w-full flex items-center justify-center gap-1.5 ${statusColor}`}
                title={statusText}
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
                className="w-full flex items-center justify-center gap-1 text-gray-400 cursor-pointer hover:text-white transition-colors"
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

      <Tooltip
        id="server-time-tooltip"
        place="top"
        style={{ zIndex: 9999 }}
        className="!bg-slate-700 !bg-opacity-80 !backdrop-blur-sm !text-white !rounded-lg !px-3 !py-1 !text-[8px] !font-sans"
      />
      {isCollapsed && (
        <Tooltip
          id="game-clock-tooltip"
          place="top"
          style={{ zIndex: 9999 }}
          className="!bg-slate-700 !bg-opacity-80 !backdrop-blur-sm !text-white !rounded-lg !px-3 !py-1 !text-[8px] !font-sans"
        />
      )}
    </>
  );
};

// Envolve o componente com React.memo para otimizar as renderizações,
// evitando re-renders desnecessários se as props não mudarem.
export default React.memo(GameClockDisplay);
