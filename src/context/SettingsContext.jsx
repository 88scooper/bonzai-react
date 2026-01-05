"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, setSetting } from '@/lib/settings-storage';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(() => {
    if (typeof window !== 'undefined') {
      return getSettings();
    }
    return { currencyDecimals: false, percentageDecimals: false, darkMode: null };
  });

  // Update settings when localStorage changes (e.g., from another tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e) => {
      if (e.key === 'proplytics_settings') {
        setSettingsState(getSettings());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateSetting = (key, value) => {
    setSetting(key, value);
    setSettingsState((prev) => ({ ...prev, [key]: value }));
  };

  const value = {
    settings,
    updateSetting,
    currencyDecimals: settings.currencyDecimals,
    percentageDecimals: settings.percentageDecimals,
    darkMode: settings.darkMode,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}







