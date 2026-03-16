import React, { useState } from "react";
import { motion } from "framer-motion";
import { apiClient } from "../../lib/supabaseClient";

interface AdminMenuProps {
  onClose: () => void;
}

const AdminMenu: React.FC<AdminMenuProps> = ({ onClose }) => {
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [isCountdownActive, setIsCountdownActive] = useState(false);
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
      console.error("Erro ao agendar o jogo:", error);
      setMessage({ type: "error", text: "Erro ao agendar. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCountdown = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      await apiClient.toggleCountdown(!isCountdownActive);

      setIsCountdownActive(!isCountdownActive);
      setMessage({
        type: "success",
        text: `Contagem ${!isCountdownActive ? "ativada" : "pausada"} com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao alterar contagem:", error);
      setMessage({
        type: "error",
        text: "Erro ao alterar estado da contagem.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-24 right-4 z-50 bg-gray-800/90 backdrop-blur-lg border border-purple-500/50 rounded-lg shadow-2xl p-6 w-80"
    >
      <h3 className="text-xl font-orbitron text-purple-300 mb-4">
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
          onClick={handleToggleCountdown}
          disabled={isLoading}
          className={`w-full text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 ${
            isCountdownActive
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isLoading
            ? "Aguarde..."
            : isCountdownActive
              ? "Pausar Contagem"
              : "Ativar Contagem"}
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Fechar
        </button>
      </div>

      {message && (
        <div
          className={`mt-4 text-sm text-center p-2 rounded-md ${message.type === "success" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}
        >
          {message.text}
        </div>
      )}
    </motion.div>
  );
};

export default AdminMenu;
