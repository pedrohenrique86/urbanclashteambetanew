import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { apiClient } from "../../lib/supabaseClient";

interface AdminMenuProps {
  onClose: () => void;
}

const AdminMenu: React.FC<AdminMenuProps> = ({ onClose }) => {
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSchedule = async () => {
    if (!startDate || !startTime) {
      setMessage({
        type: "error",
        text: "Por favor, preencha a data e a hora.",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const gameStartTime = new Date(`${startDate}T${startTime}`);

      await apiClient.scheduleGameStart(gameStartTime.toISOString());

      setMessage({
        type: "success",
        text: `Jogo agendado para ${gameStartTime.toLocaleString("pt-BR")}`,
      });
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao agendar. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTime = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      // Esta função será implementada no apiClient para chamar a nova rota
      await apiClient.stopGameTime();

      setMessage({
        type: "success",
        text: "Tempo parado e cronômetro resetado com sucesso!",
      });
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao parar o tempo." });
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-gray-800/95 border border-purple-500/50 rounded-xl shadow-2xl p-6 w-full max-w-md relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 className="text-xl font-orbitron text-purple-300 mb-6 pr-8">
          Painel do Administrador
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Data de Início
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Hora de Início
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleSchedule}
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? "Agendando..." : "Agendar Início"}
          </button>
          <button
            onClick={handleStopTime}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? "Parando..." : "Parar Tempo"}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 text-sm text-center p-3 rounded-md ${message.type === "success" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}
          >
            {message.text}
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
};

export default AdminMenu;
