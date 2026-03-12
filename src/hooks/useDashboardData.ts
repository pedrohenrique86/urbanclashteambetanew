import { useState } from 'react';
import { UserProfile } from '../types';
import { useTheme } from '../contexts/ThemeContext';

export const useDashboardData = (userProfile: UserProfile | null) => {
  const { theme, themeClasses, isDarkTheme } = useTheme();
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});

  const toggleMenu = (menuId: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  return {
    isDarkTheme,
    openMenus,
    themeClasses,
    toggleMenu,
    userProfile
  };
};