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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SettingsContext.jsx:useEffect:entry',message:'dark mode useEffect running',data:{settingsDarkMode:settings.darkMode,windowDefined:typeof window !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    if (typeof window === 'undefined') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SettingsContext.jsx:useEffect:early-return',message:'window undefined, returning',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return;
    }

    const beforeApply = document.documentElement.classList.contains('dark');
    // Use the utility function to apply dark mode
    const shouldBeDark = applyDarkMode(settings.darkMode);
    const afterApply = document.documentElement.classList.contains('dark');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SettingsContext.jsx:useEffect:after-apply',message:'after applyDarkMode call',data:{settingsDarkMode:settings.darkMode,shouldBeDark,beforeApply,afterApply,success:afterApply === shouldBeDark},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
    console.log('[SettingsContext] Applied dark mode:', {
      darkMode: settings.darkMode,
      shouldBeDark,
      hasDarkClass: document.documentElement.classList.contains('dark'),
      htmlClasses: document.documentElement.className
    });

    // Set up a MutationObserver to watch for unexpected class changes
    // This helps catch cases where something else might be removing the dark class
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // Recalculate shouldBeDark based on current settings to avoid stale closure
          let currentShouldBeDark = false;
          if (settings.darkMode === null) {
            currentShouldBeDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
          } else {
            currentShouldBeDark = settings.darkMode === true;
          }
          
          const currentHasDark = document.documentElement.classList.contains('dark');
          if (currentHasDark !== currentShouldBeDark) {
            console.warn('[SettingsContext] Dark class was unexpectedly changed! Restoring...', {
              expected: currentShouldBeDark,
              actual: currentHasDark,
              settingsDarkMode: settings.darkMode
            });
            // Restore the correct state
            applyDarkMode(settings.darkMode);
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
      if (currentHasDark !== shouldBeDark) {
        console.warn('[SettingsContext] Post-hydration check: dark class mismatch. Fixing...');
        applyDarkMode(settings.darkMode);
      }
    }, 100);

    // Listen for system preference changes when darkMode is null (system mode)
    let mediaQuery = null;
    if (settings.darkMode === null && window.matchMedia) {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e) => {
        console.log('[SettingsContext] System preference changed, dark mode:', e.matches);
        applyDarkMode(null); // Re-apply with system preference
      };

      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
        if (mediaQuery) {
          mediaQuery.removeEventListener('change', handleChange);
        }
      };
    }

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [settings.darkMode]);

  const updateSetting = (key, value) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SettingsContext.jsx:updateSetting:entry',message:'updateSetting called',data:{key,value,currentSettings:settings},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    setSetting(key, value);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SettingsContext.jsx:updateSetting:before-state-update',message:'before setSettingsState',data:{key,value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    setSettingsState((prev) => {
      const newState = { ...prev, [key]: value };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SettingsContext.jsx:updateSetting:state-update',message:'setSettingsState callback executing',data:{prev,newState,key,value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      return newState;
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SettingsContext.jsx:updateSetting:after-state-update',message:'after setSettingsState call',data:{key,value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
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







