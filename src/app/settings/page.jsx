"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { Settings, TrendingUp } from "lucide-react";

export default function SettingsPage() {
  const { settings, updateSetting, currencyDecimals } = useSettings();
  const { addToast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const currentYear = new Date().getFullYear();
  const [annualAssumptions, setAnnualAssumptions] = useState({
    propertyValueChange: '',
    rentChange: '',
    expenseChange: ''
  });
  const [assumptionsLoading, setAssumptionsLoading] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load annual assumptions when component mounts
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      const storedAssumptions = localStorage.getItem(`annualAssumptions_${currentYear}`);
      if (storedAssumptions) {
        try {
          const parsed = JSON.parse(storedAssumptions);
          setAnnualAssumptions({
            propertyValueChange: parsed.propertyValueChange?.toString() || '',
            rentChange: parsed.rentChange?.toString() || '',
            expenseChange: parsed.expenseChange?.toString() || ''
          });
        } catch (error) {
          console.error('Error loading annual assumptions:', error);
        }
      }
    }
  }, [isClient, currentYear]);

  const handleCurrencyDecimalsToggle = (enabled) => {
    updateSetting('currencyDecimals', enabled);
  };

  const handleAssumptionsChange = (field, value) => {
    // Allow negative numbers, decimals, and empty string
    if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
      setAnnualAssumptions(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSaveAssumptions = () => {
    // Validate that all fields are filled
    if (annualAssumptions.propertyValueChange === '' || 
        annualAssumptions.rentChange === '' || 
        annualAssumptions.expenseChange === '') {
      addToast("Please fill in all assumption fields.", { type: "error" });
      return;
    }

    const propertyValueChange = parseFloat(annualAssumptions.propertyValueChange);
    const rentChange = parseFloat(annualAssumptions.rentChange);
    const expenseChange = parseFloat(annualAssumptions.expenseChange);

    // Validate that values are numbers
    if (isNaN(propertyValueChange) || isNaN(rentChange) || isNaN(expenseChange)) {
      addToast("Please enter valid numbers for all assumptions.", { type: "error" });
      return;
    }

    setAssumptionsLoading(true);
    try {
      // Store assumptions in localStorage
      const assumptions = {
        year: currentYear,
        propertyValueChange,
        rentChange,
        expenseChange,
        reviewedAt: new Date().toISOString()
      };
      
      localStorage.setItem(`annualAssumptions_${currentYear}`, JSON.stringify(assumptions));
      
      // Mark this year as reviewed
      const reviewedYears = JSON.parse(localStorage.getItem('annualAssumptionsReviewedYears') || '[]');
      if (!reviewedYears.includes(currentYear)) {
        reviewedYears.push(currentYear);
        localStorage.setItem('annualAssumptionsReviewedYears', JSON.stringify(reviewedYears));
      }
      
      addToast("Annual assumptions saved successfully!", { type: "success" });
    } catch (error) {
      console.error("Error saving assumptions:", error);
      addToast("Failed to save assumptions. Please try again.", { type: "error" });
    } finally {
      setAssumptionsLoading(false);
    }
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

            {/* Annual Assumptions Section */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-black/10 dark:border-white/10 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-[#205A3E] dark:text-[#66B894]" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Annual Assumptions ({currentYear})
                </h2>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Review and update your key financial assumptions for {currentYear}. These values are used in your financial projections and calculations.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="settings-propertyValueChange" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Property Value Change (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="settings-propertyValueChange"
                      name="propertyValueChange"
                      value={annualAssumptions.propertyValueChange}
                      onChange={(e) => handleAssumptionsChange('propertyValueChange', e.target.value)}
                      placeholder="e.g., 3.5"
                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-4 py-2.5 pr-8 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                      %
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Expected annual change in property values (can be positive or negative)
                  </p>
                </div>

                <div>
                  <label htmlFor="settings-rentChange" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Rent Change (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="settings-rentChange"
                      name="rentChange"
                      value={annualAssumptions.rentChange}
                      onChange={(e) => handleAssumptionsChange('rentChange', e.target.value)}
                      placeholder="e.g., 2.5"
                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-4 py-2.5 pr-8 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                      %
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Expected annual change in rental income (can be positive or negative)
                  </p>
                </div>

                <div>
                  <label htmlFor="settings-expenseChange" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Expense Change (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="settings-expenseChange"
                      name="expenseChange"
                      value={annualAssumptions.expenseChange}
                      onChange={(e) => handleAssumptionsChange('expenseChange', e.target.value)}
                      placeholder="e.g., 2.0"
                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-4 py-2.5 pr-8 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                      %
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Expected annual change in operating expenses (can be positive or negative)
                  </p>
                </div>

                <button
                  onClick={handleSaveAssumptions}
                  disabled={assumptionsLoading}
                  className="w-full mt-4 px-4 py-2.5 bg-[#205A3E] hover:bg-[#1a4a32] text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assumptionsLoading ? 'Saving...' : 'Save Assumptions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}


