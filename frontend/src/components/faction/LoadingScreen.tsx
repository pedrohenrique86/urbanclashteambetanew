import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface LoadingScreenProps {
  error: string | null;
  pageLoading: boolean;
}

export default function LoadingScreen({
  error,
  pageLoading,
}: LoadingScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 border-t-4 border-b-4 border-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-white text-xl font-orbitron">CARREGANDO</div>
        <div className="text-orange-500 text-sm">Por favor, aguarde...</div>
        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-white max-w-md text-center">
            <p>{error}</p>
            <div className="flex justify-center space-x-3 mt-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        )}
        {!error && pageLoading && (
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors text-white"
          >
            Recarregar página
          </button>
        )}
      </motion.div>
    </div>
  );
}
