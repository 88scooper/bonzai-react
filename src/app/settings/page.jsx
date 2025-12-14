"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const { settings, updateSetting, currencyDecimals } = useSettings();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCurrencyDecimalsToggle = (enabled) => {
    updateSetting('currencyDecimals', enabled);
  };

  if (!isClient) {
    return (
      <RequireAuth>
        <Layout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold">Loading...</h1>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-6 h-6 text-[#205A3E]" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your application preferences
            </p>
          </div>

          <div className="space-y-6">
            {/* Currency Formatting Section */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-black/10 dark:border-white/10 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Currency Formatting
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Decimal Places
                    </h3>
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
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}
