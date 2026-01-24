"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, setSetting, applyDarkMode } from '@/lib/settings-storage';

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
    if (typeof window === 'undefined') {
      return;
    }

    // Flag to prevent infinite loops in MutationObserver
    let isApplying = false;

    // Calculate expected dark mode state
    const getExpectedDarkMode = () => {
      if (settings.darkMode === null) {
        // System preference
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return settings.darkMode === true;
    };

    const shouldBeDark = getExpectedDarkMode();
    
    // Apply dark mode immediately
    applyDarkMode(settings.darkMode);

    // Set up a MutationObserver to watch for unexpected class changes
    // This helps catch cases where something else might be removing the dark class
    // IMPORTANT: Only restore if the change was NOT made by our own code
    const observer = new MutationObserver((mutations) => {
      // Prevent infinite loops by checking if we're currently applying
      if (isApplying) return;

      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const currentShouldBeDark = getExpectedDarkMode();
          const currentHasDark = document.documentElement.classList.contains('dark');
          
          // Only restore if there's a mismatch AND we didn't just apply it
          // Check the data attribute to see if it was our code that made the change
          const dataAttr = document.documentElement.getAttribute('data-dark-mode-applied');
          const expectedDataAttr = currentShouldBeDark ? 'true' : 'false';
          
          if (currentHasDark !== currentShouldBeDark && dataAttr !== expectedDataAttr) {
            // Only warn and restore if the change was unexpected (data attribute mismatch)
            console.warn('[SettingsContext] Dark class was unexpectedly changed! Restoring...', {
              expected: currentShouldBeDark,
              actual: currentHasDark,
              settingsDarkMode: settings.darkMode,
              dataAttr
            });
            
            // Set flag to prevent observer from triggering during apply
            isApplying = true;
            applyDarkMode(settings.darkMode);
            // Reset flag after a brief delay
            setTimeout(() => {
              isApplying = false;
            }, 10);
          }
        }
      });
    });

    // Observe the html element for class changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also apply after a short delay to catch any hydration issues
    const timeoutId = setTimeout(() => {
      const currentHasDark = document.documentElement.classList.contains('dark');
      const expectedDark = getExpectedDarkMode();
      if (currentHasDark !== expectedDark) {
        console.warn('[SettingsContext] Post-hydration check: dark class mismatch. Fixing...');
        isApplying = true;
        applyDarkMode(settings.darkMode);
        setTimeout(() => {
          isApplying = false;
        }, 10);
      }
    }, 100);

    // Listen for system preference changes when darkMode is null (system mode)
    let mediaQuery = null;
    let mediaQueryHandler = null;
    
    if (settings.darkMode === null && window.matchMedia) {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQueryHandler = (e) => {
        console.log('[SettingsContext] System preference changed, dark mode:', e.matches);
        isApplying = true;
        applyDarkMode(null); // Re-apply with system preference
        setTimeout(() => {
          isApplying = false;
        }, 10);
      };

      mediaQuery.addEventListener('change', mediaQueryHandler);
    }

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      if (mediaQuery && mediaQueryHandler) {
        mediaQuery.removeEventListener('change', mediaQueryHandler);
      }
    };
  }, [settings.darkMode]);

  const updateSetting = (key, value) => {
    setSetting(key, value);
    setSettingsState((prev) => {
      return { ...prev, [key]: value };
    });
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







