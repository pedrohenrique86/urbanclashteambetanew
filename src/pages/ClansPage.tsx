import { motion } from "framer-motion";
import ClanManagement from "../components/ClanManagement";

export default function ClansPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-exo">
      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <ClanManagement />
      </motion.div>
    </div>
  );
}
