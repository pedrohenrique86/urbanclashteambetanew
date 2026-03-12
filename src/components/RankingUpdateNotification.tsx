import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RankingUpdateNotificationProps {
  lastUpdated: Date;
}

export default function RankingUpdateNotification({ lastUpdated }: RankingUpdateNotificationProps) {
  const [show, setShow] = useState(false);
  
  // Mostrar a notificação por 5 segundos quando o componente for montado ou quando lastUpdated mudar
  useEffect(() => {
    setShow(true);
    
    const timer = setTimeout(() => {
      setShow(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [lastUpdated]);
  
  // Formatar a hora da última atualização
  const formattedTime = lastUpdated.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-300 text-lg">⏱️</span>
              <span className="text-white font-medium">
                Ranking atualizado às {formattedTime}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}