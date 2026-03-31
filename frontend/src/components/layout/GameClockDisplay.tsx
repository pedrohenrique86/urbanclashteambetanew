import React from "react";
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
  if (!date) return "--:--:--";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const GameClockDisplay: React.FC<GameClockDisplayProps> = ({
  remainingTime,
  status,
  serverTime,
}) => {
  const remainingTimeStr = formatRemainingTime(remainingTime);
  const serverTimeStr = formatServerTime(serverTime);

  const getStatusInfo = () => {
    switch (status) {
      case "running":
        return {
          text: "Tempo Restante:",
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
          text: "Parado",
          color: "text-gray-400",
          icon: <FaStop />,
        };
      case "scheduled":
        return {
          text: "Inicia em:",
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
      {/* 
        Container com borda fixa e sólida para teste de estabilidade.
        Removido gradiente, blur e borda dinâmica para eliminar qualquer fonte de flicker.
      */}
      <div className="w-full bg-slate-900 rounded-xl shadow-lg shadow-black/30 border-t-2 border-slate-600">
        <div className="flex items-center justify-between px-3 py-1">
          {/* Bloco da Esquerda: Status + Cronômetro */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 ${statusColor}`}>
              <span className="text-base">{statusIcon}</span>
              <span className="font-orbitron font-bold uppercase tracking-wider text-[11px]">
                {statusText}
              </span>
            </div>
            {/* Largura fixa com 'w-[16ch]' para garantir que o tamanho não mude com os segundos */}
            <span
              className={`font-mono font-bold text-sm ${statusColor} block w-[16ch]`}
            >
              {remainingTimeStr}
            </span>
          </div>

          {/* Bloco da Direita: Separador + Hora do Servidor */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-light">|</span>
            <div
              data-tooltip-id="server-time-tooltip"
              data-tooltip-content="Hora do Servidor São Paulo/BR"
              className="flex items-center gap-1 text-gray-300 cursor-pointer hover:text-white transition-colors"
            >
              <IoMdTime className="text-base" />
              {/* Largura fixa com 'w-[8ch]' para o relógio do servidor */}
              <span className="font-mono text-sm block w-[8ch]">
                {serverTimeStr}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tooltip
        id="server-time-tooltip"
        place="top"
        className="!bg-slate-700 !bg-opacity-80 !backdrop-blur-sm !text-white !rounded-lg !px-3 !py-1 !text-xs !font-sans"
      />
    </>
  );
};

// Envolve o componente com React.memo para otimizar as renderizações,
// evitando re-renders desnecessários se as props não mudarem.
export default React.memo(GameClockDisplay);