import React, { useState, useEffect } from "react";
import { FaHourglassHalf, FaServer, FaInfoCircle } from "react-icons/fa";
import { apiClient } from "../../lib/supabaseClient";
import { motion } from "framer-motion";

const ServerClock: React.FC = () => {
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState({
    days: 20,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [gameSettings, setGameSettings] = useState<{
    game_start_time?: string;
    is_countdown_active?: boolean;
  }>({});
  const [statusMessage, setStatusMessage] = useState<string>("Carregando...");

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [settings, timeResponse] = await Promise.all([
          apiClient.getGameSettings(),
          apiClient.getServerTime(),
        ]);

        setGameSettings(settings);
        if (timeResponse.serverTime) {
          setServerTime(new Date(timeResponse.serverTime));
        } else {
          throw new Error("Formato de resposta do servidor inválido.");
        }
      } catch (err) {
        setError("Falha ao buscar dados do servidor.");
        console.error(err);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!serverTime || !gameSettings) return;

    const { game_start_time, is_countdown_active } = gameSettings;

    if (!is_countdown_active) {
      setStatusMessage("Contagem Pausada");
      setCountdown({ days: 20, hours: 0, minutes: 0, seconds: 0 });
      return; // Para o intervalo se a contagem for pausada
    }

    if (!game_start_time) {
      setStatusMessage("Aguardando Agendamento");
      return;
    }

    const startTime = new Date(game_start_time);
    const gameEndDate = new Date(
      startTime.getTime() + 20 * 24 * 60 * 60 * 1000,
    );

    const interval = setInterval(() => {
      setServerTime((prevTime) => {
        const newTime = new Date(prevTime!.getTime() + 1000);

        if (newTime < startTime) {
          setStatusMessage(
            `Inicia em ${startTime.toLocaleDateString("pt-BR")}`,
          );
          return newTime;
        }

        setStatusMessage("Fim do Jogo em:");
        const timeLeft = gameEndDate.getTime() - newTime.getTime();

        if (timeLeft > 0) {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
          );
          const minutes = Math.floor(
            (timeLeft % (1000 * 60 * 60)) / (1000 * 60),
          );
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          setCountdown({ days, hours, minutes, seconds });
        } else {
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          setStatusMessage("Jogo Encerrado");
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [serverTime, gameSettings]);

  const formatTwoDigits = (num: number) => num.toString().padStart(2, "0");

  if (error) {
    return <div className="text-red-500 text-xs font-semibold">{error}</div>;
  }

  if (!serverTime) {
    return (
      <div className="text-gray-400 text-xs font-semibold">
        Carregando relógio...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center space-x-4 bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-700/50 text-white font-mono text-sm"
    >
      {/* Status da Contagem */}
      <div
        className="hidden lg:flex items-center space-x-2"
        title={statusMessage}
      >
        <FaInfoCircle className="text-gray-400" />
        <span className="font-bold text-amber-400 w-32 truncate">
          {statusMessage}
        </span>
      </div>

      {/* Contagem Regressiva */}
      <div
        className="flex items-center space-x-1.5"
        title="Tempo restante para o fim do jogo"
      >
        <FaHourglassHalf className="text-cyan-400" />
        <span>{formatTwoDigits(countdown.days)}d</span>
        <span>{formatTwoDigits(countdown.hours)}h</span>
        <span>{formatTwoDigits(countdown.minutes)}m</span>
        <span className="text-amber-400 font-bold">
          {formatTwoDigits(countdown.seconds)}s
        </span>
      </div>

      {/* Relógio do Servidor */}
      <div
        className="flex items-center space-x-2"
        title="Hora oficial do servidor do jogo (BRT)"
      >
        <FaServer className="text-purple-400" />
        <span>
          {serverTime.toLocaleTimeString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}
        </span>
      </div>
    </motion.div>
  );
};

export default ServerClock;
