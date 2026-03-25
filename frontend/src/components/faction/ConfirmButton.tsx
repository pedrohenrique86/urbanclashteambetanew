import { motion } from "framer-motion";

interface ConfirmButtonProps {
  selectedFaction: "gangsters" | "guardas" | null;
  loading: boolean;
  processing: boolean;
  onConfirm: () => void;
}

export default function ConfirmButton({ selectedFaction, loading, processing, onConfirm }: ConfirmButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="flex justify-center"
    >
      <button
        onClick={onConfirm}
        disabled={!selectedFaction || loading || processing}
        className={`px-10 py-4 rounded-lg font-orbitron text-lg transition-all duration-300 transform ${
          !selectedFaction
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : selectedFaction === "gangsters"
            ? "bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-400 hover:to-orange-600 text-white hover:scale-105"
            : "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white hover:scale-105"
        }`}
      >
        {loading || processing ? (
          <span className="flex items-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {processing ? 'PROCESSANDO...' : 'CONFIRMANDO...'}
          </span>
        ) : (
          "CONFIRMAR ESCOLHA"
        )}
      </button>
    </motion.div>
  );
}