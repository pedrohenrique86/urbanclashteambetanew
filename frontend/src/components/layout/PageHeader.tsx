import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  backTo?: string;
}

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
      clipRule="evenodd"
    />
  </svg>
);

export default function PageHeader({
  title,
  backTo = "/dashboard",
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800 border-b border-gray-700"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            to={backTo}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeftIcon />
            <span>Voltar ao Dashboard</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-orbitron flex items-center">
            <span className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text font-bold">
              URBAN
            </span>
            <span className="mx-1 text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-bold">
              CLASH
            </span>
            <span className="text-gray-400 font-normal ml-2">| {title}</span>
          </h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </div>
    </motion.div>
  );
}
