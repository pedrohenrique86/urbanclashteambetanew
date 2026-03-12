import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSWRConfig } from 'swr';
import { apiClient } from '../../lib/supabaseClient';

interface DashboardHeaderProps {
  username: string;
  themeClasses?: {
    bg: string;
    cardBg: string;
    sidebarBg: string;
    text: string;
    textSecondary: string;
    border: string;
    hover: string;
    buttonSecondary: string;
    shadow: string;
  };
}

export default function DashboardHeader({ username, themeClasses }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig();

  const handleLogout = async () => {
    await apiClient.logout();
    mutate(() => true, undefined, { revalidate: false });
    // Pequeno delay antes de redirecionar
    await new Promise((resolve) => setTimeout(resolve, 1000));
    navigate('/');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800 border-b border-gray-700"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-orbitron flex items-center">
              <span className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text font-bold">
                URBAN
              </span>
              <span className="mx-1 text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-bold">
                CLASH
              </span>
              <span className="text-gray-400 font-normal ml-2">| Dashboard</span>
            </h1>
          </div>
          
          {/* User Info and Logout */}
          <div className="flex items-center space-x-4">
            <div className="bg-gray-700 px-4 py-2 rounded-lg">
              <p className="text-white font-orbitron">{username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-orbitron px-4 py-2 rounded-lg transition-colors hover:scale-105 transform"
            >
              SAIR
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}