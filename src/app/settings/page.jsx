"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { Settings, TrendingUp, Moon, Sun, Monitor, ChevronDown, ChevronUp } from "lucide-react";
import { useProperties } from "@/context/PropertyContext";

export default function SettingsPage() {
  const { settings, updateSetting, currencyDecimals, percentageDecimals, darkMode } = useSettings();
  const { addToast } = useToast();
  const properties = useProperties();
  const [isClient, setIsClient] = useState(false);
  const currentYear = new Date().getFullYear();
  const [assumptionsMode, setAssumptionsMode] = useState('blended');
  const [annualAssumptions, setAnnualAssumptions] = useState({
    propertyValueChange: '',
    rentChange: '',
    expenseChange: ''
  });
  const [propertyAssumptions, setPropertyAssumptions] = useState({});
  const [expandedProperties, setExpandedProperties] = useState(new Set());
  const [assumptionsLoading, setAssumptionsLoading] = useState(false);
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

  // Load annual assumptions when component mounts
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      const storedAssumptions = localStorage.getItem(`annualAssumptions_${currentYear}`);
      if (storedAssumptions) {
        try {
          const parsed = JSON.parse(storedAssumptions);
          
          // Backward compatibility: if no mode field, default to 'blended'
          const mode = parsed.mode || 'blended';
          setAssumptionsMode(mode);
          
          // Load blended assumptions
          setAnnualAssumptions({
            propertyValueChange: parsed.propertyValueChange?.toString() || '',
            rentChange: parsed.rentChange?.toString() || '',
            expenseChange: parsed.expenseChange?.toString() || ''
          });
          
          // Load property-specific assumptions if they exist
          if (parsed.propertyAssumptions && typeof parsed.propertyAssumptions === 'object') {
            // Convert numeric values back to strings for input fields
            const propertyAssumptionsStrings = {};
            
            Object.keys(parsed.propertyAssumptions).forEach(propertyId => {
              const prop = parsed.propertyAssumptions[propertyId];
              propertyAssumptionsStrings[propertyId] = {
                propertyValueChange: prop.propertyValueChange?.toString() || '',
                rentChange: prop.rentChange?.toString() || '',
                expenseChange: prop.expenseChange?.toString() || ''
              };
            });
            
            setPropertyAssumptions(propertyAssumptionsStrings);
          } else {
            // Initialize property assumptions with defaults from blended values
            const defaults = {};
            
            properties.forEach(property => {
              defaults[property.id] = {
                propertyValueChange: parsed.propertyValueChange?.toString() || '',
                rentChange: parsed.rentChange?.toString() || '',
                expenseChange: parsed.expenseChange?.toString() || ''
              };
            });
            
            setPropertyAssumptions(defaults);
          }
        } catch (error) {
          console.error('Error loading annual assumptions:', error);
        }
      } else {
        // No saved assumptions - initialize property assumptions with empty values
        const defaults = {};
        
        properties.forEach(property => {
          defaults[property.id] = {
            propertyValueChange: '',
            rentChange: '',
            expenseChange: ''
          };
        });
        
        setPropertyAssumptions(defaults);
      }
    }
  }, [isClient, currentYear, properties]);

  // Update property assumptions when properties change or mode switches
  useEffect(() => {
    if (isClient && properties.length > 0) {
      setPropertyAssumptions(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        properties.forEach(property => {
          if (!updated[property.id]) {
            // New property - use blended values as default
            updated[property.id] = {
              propertyValueChange: annualAssumptions.propertyValueChange || '',
              rentChange: annualAssumptions.rentChange || '',
              expenseChange: annualAssumptions.expenseChange || ''
            };
            hasChanges = true;
          }
        });
        
        // Remove properties that no longer exist
        Object.keys(updated).forEach(propertyId => {
          if (!properties.find(p => p.id === propertyId)) {
            delete updated[propertyId];
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }
  }, [properties, isClient, annualAssumptions]);

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

  const handleAssumptionsChange = (field, value) => {
    // Allow negative numbers, decimals, and empty string
    if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
      setAnnualAssumptions(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handlePropertyAssumptionChange = (propertyId, field, value) => {
    // Allow negative numbers, decimals, and empty string
    if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
      setPropertyAssumptions(prev => ({
        ...prev,
        [propertyId]: {
          ...prev[propertyId],
          [field]: value
        }
      }));
    }
  };

  const togglePropertyExpanded = (propertyId) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });
  };

  const handleModeChange = (mode) => {
    setAssumptionsMode(mode);
    
    // When switching to by-property, initialize any missing properties with blended values
    if (mode === 'by-property') {
      setPropertyAssumptions(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        properties.forEach(property => {
          if (!updated[property.id] || 
              (!updated[property.id].propertyValueChange && 
               !updated[property.id].rentChange && 
               !updated[property.id].expenseChange)) {
            updated[property.id] = {
              propertyValueChange: annualAssumptions.propertyValueChange || '',
              rentChange: annualAssumptions.rentChange || '',
              expenseChange: annualAssumptions.expenseChange || ''
            };
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }
  };

  const handleSaveAssumptions = () => {
    if (assumptionsMode === 'blended') {
      // Validate blended assumptions
      if (annualAssumptions.propertyValueChange === '' || 
          annualAssumptions.rentChange === '' || 
          annualAssumptions.expenseChange === '') {
        addToast("Please fill in all assumption fields.", { type: "error" });
        return;
      }

      const propertyValueChange = parseFloat(annualAssumptions.propertyValueChange);
      const rentChange = parseFloat(annualAssumptions.rentChange);
      const expenseChange = parseFloat(annualAssumptions.expenseChange);

      if (isNaN(propertyValueChange) || isNaN(rentChange) || isNaN(expenseChange)) {
        addToast("Please enter valid numbers for all assumptions.", { type: "error" });
        return;
      }

      setAssumptionsLoading(true);
      try {
        const assumptions = {
          year: currentYear,
          mode: 'blended',
          propertyValueChange,
          rentChange,
          expenseChange,
          reviewedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`annualAssumptions_${currentYear}`, JSON.stringify(assumptions));
        
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
    } else {
      // Validate by-property assumptions
      const invalidProperties = [];
      
      properties.forEach(property => {
        const propAssumptions = propertyAssumptions[property.id];
        if (!propAssumptions ||
            propAssumptions.propertyValueChange === '' ||
            propAssumptions.rentChange === '' ||
            propAssumptions.expenseChange === '') {
          invalidProperties.push(property.nickname || property.address || property.id);
        } else {
          const propertyValueChange = parseFloat(propAssumptions.propertyValueChange);
          const rentChange = parseFloat(propAssumptions.rentChange);
          const expenseChange = parseFloat(propAssumptions.expenseChange);
          
          if (isNaN(propertyValueChange) || isNaN(rentChange) || isNaN(expenseChange)) {
            invalidProperties.push(property.nickname || property.address || property.id);
          }
        }
      });
      
      if (invalidProperties.length > 0) {
        addToast(
          `Please fill in all assumption fields for: ${invalidProperties.slice(0, 3).join(', ')}${invalidProperties.length > 3 ? '...' : ''}`,
          { type: "error" }
        );
        return;
      }

      setAssumptionsLoading(true);
      try {
        // Convert property assumptions to numbers
        const propertyAssumptionsNumeric = {};
        
        Object.keys(propertyAssumptions).forEach(propertyId => {
          propertyAssumptionsNumeric[propertyId] = {
            propertyValueChange: parseFloat(propertyAssumptions[propertyId].propertyValueChange),
            rentChange: parseFloat(propertyAssumptions[propertyId].rentChange),
            expenseChange: parseFloat(propertyAssumptions[propertyId].expenseChange)
          };
        });
        
        const assumptions = {
          year: currentYear,
          mode: 'by-property',
          propertyValueChange: annualAssumptions.propertyValueChange ? parseFloat(annualAssumptions.propertyValueChange) : 0, // Keep for fallback
          rentChange: annualAssumptions.rentChange ? parseFloat(annualAssumptions.rentChange) : 0,
          expenseChange: annualAssumptions.expenseChange ? parseFloat(annualAssumptions.expenseChange) : 0,
          propertyAssumptions: propertyAssumptionsNumeric,
          reviewedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`annualAssumptions_${currentYear}`, JSON.stringify(assumptions));
        
        const reviewedYears = JSON.parse(localStorage.getItem('annualAssumptionsReviewedYears') || '[]');
        if (!reviewedYears.includes(currentYear)) {
          reviewedYears.push(currentYear);
          localStorage.setItem('annualAssumptionsReviewedYears', JSON.stringify(reviewedYears));
        }
        
        addToast("Property-specific assumptions saved successfully!", { type: "success" });
      } catch (error) {
        console.error("Error saving assumptions:", error);
        addToast("Failed to save assumptions. Please try again.", { type: "error" });
      } finally {
        setAssumptionsLoading(false);
      }
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
            {/* Appearance Section */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-black/10 dark:border-white/10 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Appearance
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                      {getDarkModeIcon()}
                      Theme
                    </h3>
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

            {/* Percentage Formatting Section */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-black/10 dark:border-white/10 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Percentage Formatting
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Decimal Places
                    </h3>
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

            {/* Annual Assumptions Section */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-black/10 dark:border-white/10 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-[#205A3E] dark:text-[#66B894]" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Annual Assumptions ({currentYear})
                  </h2>
                </div>
                
                {/* Mode Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Blended</span>
                  <button
                    onClick={() => handleModeChange(assumptionsMode === 'blended' ? 'by-property' : 'blended')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#205A3E] focus:ring-offset-2 ${
                      assumptionsMode === 'by-property'
                        ? 'bg-[#205A3E]' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label="Toggle assumptions mode"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        assumptionsMode === 'by-property' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">By Property</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {assumptionsMode === 'blended' 
                  ? `Review and update your key financial assumptions for ${currentYear}. These values will be applied to all properties.`
                  : `Set property-specific assumptions for ${currentYear}. Each property can have different values for property value change, rent change, and expense change.`}
              </p>
              
              {assumptionsMode === 'blended' ? (
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
              ) : (
                <div className="space-y-4">
                  {properties.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>No properties found. Add properties to set property-specific assumptions.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {properties.map((property) => {
                        const propertyName = property.nickname || property.address || `Property ${property.id.slice(0, 8)}`;
                        const isExpanded = expandedProperties.has(property.id);
                        const propAssumptions = propertyAssumptions[property.id] || {
                          propertyValueChange: '',
                          rentChange: '',
                          expenseChange: ''
                        };
                        
                        return (
                          <div
                            key={property.id}
                            className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden"
                          >
                            <button
                              onClick={() => togglePropertyExpanded(property.id)}
                              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <span className="font-medium text-gray-900 dark:text-white">
                                {propertyName}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                              )}
                            </button>
                            
                            {isExpanded && (
                              <div className="p-4 space-y-4 bg-white dark:bg-neutral-900">
                                <div>
                                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                                    Property Value Change (%)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={propAssumptions.propertyValueChange}
                                      onChange={(e) => handlePropertyAssumptionChange(property.id, 'propertyValueChange', e.target.value)}
                                      placeholder="e.g., 3.5"
                                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-4 py-2.5 pr-8 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                                      %
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    Expected annual change in property values
                                  </p>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                                    Rent Change (%)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={propAssumptions.rentChange}
                                      onChange={(e) => handlePropertyAssumptionChange(property.id, 'rentChange', e.target.value)}
                                      placeholder="e.g., 2.5"
                                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-4 py-2.5 pr-8 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                                      %
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    Expected annual change in rental income
                                  </p>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                                    Expense Change (%)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={propAssumptions.expenseChange}
                                      onChange={(e) => handlePropertyAssumptionChange(property.id, 'expenseChange', e.target.value)}
                                      placeholder="e.g., 2.0"
                                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-4 py-2.5 pr-8 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                                      %
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    Expected annual change in operating expenses
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <button
                    onClick={handleSaveAssumptions}
                    disabled={assumptionsLoading}
                    className="w-full mt-4 px-4 py-2.5 bg-[#205A3E] hover:bg-[#1a4a32] text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assumptionsLoading ? 'Saving...' : 'Save Property Assumptions'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}







