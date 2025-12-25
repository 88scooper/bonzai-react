"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Settings, Moon, Sun, Monitor } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function SettingsModal({ isOpen, onClose }) {
  const { settings, updateSetting, currencyDecimals, percentageDecimals, darkMode } = useSettings();
  const [isClient, setIsClient] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleCurrencyDecimalsToggle = (enabled) => {
    updateSetting('currencyDecimals', enabled);
  };

  const handlePercentageDecimalsToggle = (enabled) => {
    updateSetting('percentageDecimals', enabled);
  };

  const handleDarkModeChange = (mode) => {
    updateSetting('darkMode', mode);
  };

  const getDarkModeLabel = () => {
    if (darkMode === null) return 'System';
    return darkMode ? 'Dark' : 'Light';
  };

  const getDarkModeIcon = () => {
    if (darkMode === null) return <Monitor className="w-4 h-4" />;
    return darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />;
  };

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render using portal to document body
  if (typeof window === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-950 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-black/10 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/10 dark:border-white/10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {!isClient ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Loading...
              </div>
            </div>
          ) : (
            <>
              {/* Appearance Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Appearance
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                        {getDarkModeIcon()}
                        Theme
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Choose your preferred theme: System, Dark, or Light
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDarkModeChange(null)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          darkMode === null
                            ? 'bg-[#205A3E] text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        title="System"
                      >
                        <Monitor className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDarkModeChange(false)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          darkMode === false
                            ? 'bg-[#205A3E] text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        title="Light"
                      >
                        <Sun className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDarkModeChange(true)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          darkMode === true
                            ? 'bg-[#205A3E] text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        title="Dark"
                      >
                        <Moon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                    Current: {getDarkModeLabel()} {darkMode === null && `(${systemPrefersDark ? 'Dark' : 'Light'})`}
                  </div>
                </div>
              </div>

              {/* Currency Formatting Section */}
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Currency Formatting
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Decimal Places
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show two decimal places (0.00) in currency values
                      </p>
                    </div>
                    <button
                      onClick={() => handleCurrencyDecimalsToggle(!currencyDecimals)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#205A3E] focus:ring-offset-2 ${
                        currencyDecimals 
                          ? 'bg-[#205A3E]' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      aria-label="Toggle decimal places"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          currencyDecimals ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">With decimals:</span> $1,234.56
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Without decimals:</span> $1,235
                      </div>
                      <div className="text-sm font-semibold text-[#205A3E] dark:text-[#66B894] mt-2">
                        Current format: {currencyDecimals ? '$1,234.56' : '$1,235'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Percentage Formatting Section */}
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Percentage Formatting
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Decimal Places
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show two decimal places (0.00%) in percentage values
                      </p>
                    </div>
                    <button
                      onClick={() => handlePercentageDecimalsToggle(!percentageDecimals)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#205A3E] focus:ring-offset-2 ${
                        percentageDecimals 
                          ? 'bg-[#205A3E]' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      aria-label="Toggle percentage decimal places"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          percentageDecimals ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">With decimals:</span> 12.34%
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Without decimals:</span> 12%
                      </div>
                      <div className="text-sm font-semibold text-[#205A3E] dark:text-[#66B894] mt-2">
                        Current format: {percentageDecimals ? '12.34%' : '12%'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

