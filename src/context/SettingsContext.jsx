"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, setSetting } from '@/lib/settings-storage';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(() => {
    if (typeof window !== 'undefined') {
      return getSettings();
    }
    return { currencyDecimals: false, percentageDecimals: false, darkMode: false };
  });

  // Update settings when localStorage changes (e.g., from another tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e) => {
      if (e.key === 'bonzai_settings') {
        setSettingsState(getSettings());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Apply dark mode to document based on settings (immediately on mount and when changed)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    let shouldBeDark = false;

    if (settings.darkMode === null) {
      // System preference
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        shouldBeDark = true;
      }
    } else {
      // Explicit user preference
      shouldBeDark = settings.darkMode === true;
    }

    // Apply or remove dark class immediately (synchronous)
    if (shouldBeDark) {
      root.classList.add("dark");
      console.log('[SettingsContext] Applied dark mode - class added');
    } else {
      root.classList.remove("dark");
      console.log('[SettingsContext] Applied light mode - class removed');
    }
    // Verify class is present
    console.log('[SettingsContext] HTML classes:', root.className);
    console.log('[SettingsContext] Has .dark class:', root.classList.contains('dark'));

    // Listen for system preference changes when darkMode is null (system mode)
    if (settings.darkMode === null && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e) => {
        if (e.matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.darkMode]);

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







