import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  showLiveFeed: boolean;
  setShowLiveFeed: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showLiveFeed, setShowLiveFeed] = useState<boolean>(() => {
    const saved = localStorage.getItem('settings_show_live_feed');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('settings_show_live_feed', String(showLiveFeed));
  }, [showLiveFeed]);

  return (
    <SettingsContext.Provider value={{ showLiveFeed, setShowLiveFeed }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
