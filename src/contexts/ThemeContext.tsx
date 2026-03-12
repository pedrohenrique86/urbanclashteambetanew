import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeClasses {
  bg: string;
  cardBg: string;
  sidebarBg: string;
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  buttonSecondary: string;
  shadow: string;
}

interface ThemeContextType {
  theme: Theme;
  isDarkTheme: boolean;
  themeClasses: ThemeClasses;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightTheme: ThemeClasses = {
  bg: 'bg-gray-50',
  cardBg: 'bg-white',
  sidebarBg: 'bg-white',
  text: 'text-gray-900',
  textSecondary: 'text-gray-600',
  border: 'border-gray-200',
  hover: 'hover:bg-gray-100',
  buttonSecondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  shadow: 'shadow-lg'
};

const darkTheme: ThemeClasses = {
  bg: 'bg-gray-900',
  cardBg: 'bg-gray-800',
  sidebarBg: 'bg-gray-800',
  text: 'text-white',
  textSecondary: 'text-gray-300',
  border: 'border-gray-700',
  hover: 'hover:bg-gray-700',
  buttonSecondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200',
  shadow: 'shadow-xl'
};

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const isDarkTheme = theme === 'dark';
  const themeClasses = isDarkTheme ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{
      theme,
      isDarkTheme,
      themeClasses,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}