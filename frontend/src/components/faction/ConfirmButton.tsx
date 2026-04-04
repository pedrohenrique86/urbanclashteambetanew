import { motion } from "framer-motion";

interface ConfirmButtonProps {
  selectedFaction: "gangsters" | "guardas" | null;
  onConfirm: () => void;
}

export default function ConfirmButton({
  selectedFaction,
  onConfirm,
}: ConfirmButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="flex justify-center"
    >
      <button
        onClick={onConfirm}
        disabled={!selectedFaction}
        className={`px-10 py-4 rounded-lg font-orbitron text-lg transition-all duration-300 transform ${
          !selectedFaction
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : selectedFaction === "gangsters"
              ? "bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-400 hover:to-orange-600 text-white hover:scale-105"
              : "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white hover:scale-105"
        }`}
      >
        CONFIRMAR ESCOLHA
      </button>
    </motion.div>
  );
}