import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  show: boolean;
  onClose: () => void;
}

export default function Toast({ message, type, duration = 5000, show, onClose }: ToastProps) {
  // Fechar o toast automaticamente após a duração especificada
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);
  
  // Definir cores e ícones com base no tipo de toast
  const toastStyles = {
    success: {
      gradient: 'from-green-500 to-green-600',
      icon: '✅',
      iconColor: 'text-white'
    },
    error: {
      gradient: 'from-red-500 to-red-600',
      icon: '❌',
      iconColor: 'text-white'
    },
    warning: {
      gradient: 'from-yellow-500 to-yellow-600',
      icon: '⚠️',
      iconColor: 'text-white'
    },
    info: {
      gradient: 'from-blue-500 to-blue-600',
      icon: 'ℹ️',
      iconColor: 'text-white'
    }
  };
  
  const { gradient, icon, iconColor } = toastStyles[type];
  
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
          <div className={`bg-gradient-to-r ${gradient} px-4 py-3 rounded-lg shadow-lg`}>
            <div className="flex items-center space-x-2">
              <span className={`${iconColor} text-lg`}>{icon}</span>
              <span className="text-white font-medium">
                {message}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}