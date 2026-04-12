import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGoogle, FaUserCircle, FaSignOutAlt, FaSpinner } from 'react-icons/fa';
import { startGoogleLoginFlow } from '../../services/authService';

const UserAuthWidget: React.FC = () => {
  const { user, logout } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // Chama a função centralizada para iniciar o fluxo de login
      await startGoogleLoginFlow('login');
    } catch (err) {
      setError('Falha ao iniciar o login. Tente novamente.');
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    setIsProcessing(true);
    try {
      await logout();
      setIsMenuOpen(false);
    } catch (err) {
      setError('Falha ao fazer logout.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (user) {
    return (
      <div className="relative" ref={menuRef}>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors">
          <FaUserCircle size={24} />
          <span className="hidden md:inline">{user.username}</span>
        </button>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50"
            >
              <button
                onClick={handleLogout}
                disabled={isProcessing}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center disabled:opacity-50"
              >
                {isProcessing ? (
                  <FaSpinner className="animate-spin mr-2" />
                ) : (
                  <FaSignOutAlt className="mr-2" />
                )}
                Sair
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleGoogleLogin}
        disabled={isProcessing}
        className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <FaSpinner className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
            Processando...
          </>
        ) : (
          <>
            <FaGoogle className="-ml-1 mr-2 h-5 w-5" />
            Entrar com Google
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

export default UserAuthWidget;