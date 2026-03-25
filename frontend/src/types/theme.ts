export type Theme = 'light' | 'dark';

export interface ThemeClasses {
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

export interface ThemeContextType {
  theme: Theme;
  isDarkTheme: boolean;
  themeClasses: ThemeClasses;
  toggleTheme: () => void;
}

export const lightTheme: ThemeClasses = {
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

export const darkTheme: ThemeClasses = {
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