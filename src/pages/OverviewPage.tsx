import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserProfile } from '../hooks/useUserProfile';
import { useTheme } from '../contexts/ThemeContext';
import { StatsCards, NavigationButtons } from '../components/dashboard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TopBar, BottomNavBar } from '../components/layout';

export default function OverviewPage() {
  const navigate = useNavigate();
  const { themeClasses, isDarkTheme } = useTheme();
  const { userProfile, loading: profileLoading } = useUserProfile();

  const navigateTo = (path: string): void => {
    navigate(path);
  };

  if (profileLoading) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center`}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-exo flex flex-col">
      <TopBar userProfile={userProfile} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="p-8 flex-grow"
      >
        <h1 className="text-3xl font-bold mb-8 text-white">Visão Geral</h1>
        <StatsCards
          userProfile={userProfile}
          themeClasses={themeClasses}
          isDarkTheme={isDarkTheme}
        />
        {/* NavigationButtons pode ser removido se a BottomNavBar for suficiente */}
        {/* <NavigationButtons navigateTo={navigateTo} /> */}
      </motion.div>
      <BottomNavBar navigateTo={navigateTo} />
    </div>
  );
}