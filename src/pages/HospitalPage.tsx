import { motion } from 'framer-motion';
import PageHeader from '../components/layout/PageHeader';

export default function HospitalPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-exo">
      <PageHeader title="Hospital" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-300 mb-4">Hospital</h2>
          <p className="text-gray-400">Esta página está em desenvolvimento.</p>
        </div>
      </motion.div>
    </div>
  );
}