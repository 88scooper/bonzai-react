"use client";

import { useState, useEffect, useRef } from "react";
import { DollarSign, TrendingUp, ChevronDown, Save, RotateCcw, Pin, Trash2, HelpCircle } from "lucide-react";
import { CASH_FLOW_DEFAULT_ASSUMPTIONS, EQUITY_DEFAULT_ASSUMPTIONS, SCENARIO_PRESETS } from "@/lib/sensitivity-analysis";
import { formatCurrency } from "@/utils/formatting";
import { getCurrentMortgageBalance, getMonthlyMortgagePayment, getMortgageYearlySummary } from '@/utils/mortgageCalculator';

// Ensure Tailwind includes these gradient classes (used dynamically)
// These classes must be present in the codebase for Tailwind to include them:
// bg-gradient-to-br from-blue-400 to-blue-600
// bg-gradient-to-br from-emerald-400 to-emerald-600  
// bg-gradient-to-br from-purple-400 to-purple-600
// bg-gradient-to-br from-orange-400 to-orange-600
// bg-gradient-to-br from-pink-400 to-pink-600
// bg-gradient-to-br from-teal-400 to-teal-600

// Tooltip content for all assumptions
const ASSUMPTION_TOOLTIPS = {
  // Cash Flow mode
  annualRentIncrease: "The Growth Lever. This is how much you expect to raise rent each year. Even a 1% difference can significantly boost your long-term profit due to compounding.",
  annualExpenseInflation: "The Inflation Hedge. Taxes, insurance, and maintenance usually go up. If this number is higher than your Rent Increase, your profit 'margin' will shrink over time.",
  vacancyRate: "The Safety Buffer. No property is full 100% of the time. Setting this to 5% (roughly 2 weeks a year) helps you prepare for the reality of tenant turnover.",
  futureInterestRate: "The Refinance Risk. When your current mortgage term ends, what will the new rate be? Increasing this helps you see if the property stays profitable if rates go up.",
  // Equity mode
  annualPropertyAppreciation: "The Wealth Builder. This is how much the property value grows. It's the biggest driver of your 'Total Profit' when you eventually sell.",
  exitCapRate: "The Market Mood. A lower number assumes you sell in a 'hot' market for a higher price; a higher number is a safer, 'cooler' market assumption.",
  // Prepayment
  prepaymentAmount: "The Strategic Infusion. Model a one-time principal payment in a specific year to instantly reduce debt and maximize long-term interest savings.",
};

export default function ModelingSandboxSidebar({
  properties = [],
  selectedPropertyId,
  onPropertySelect,
  analysisMode,
  onModeChange,
  assumptions,
  onAssumptionsChange,
  holdingPeriod,
  onHoldingPeriodChange,
  onSaveSnapshot,
  onResetDefaults,
  pinnedSnapshotId,
  snapshots = [],
  onPinSnapshot,
  onDeleteSnapshot,
}) {
  const [activePreset, setActivePreset] = useState(null);
  const [showTooltip, setShowTooltip] = useState(null);
  const [tooltipTimeout, setTooltipTimeout] = useState(null);
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false);
  const propertyDropdownRef = useRef(null);

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
    };
  }, [tooltipTimeout]);

  // Close property dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(event.target)) {
        setIsPropertyDropdownOpen(false);
      }
    };

    if (isPropertyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPropertyDropdownOpen]);

  // Get property gradient placeholder based on index
  const getPropertyGradient = (index) => {
    const gradients = [
      { from: 'from-blue-400', to: 'to-blue-600' },
      { from: 'from-emerald-400', to: 'to-emerald-600' },
      { from: 'from-purple-400', to: 'to-purple-600' },
      { from: 'from-orange-400', to: 'to-orange-600' },
      { from: 'from-pink-400', to: 'to-pink-600' },
      { from: 'from-teal-400', to: 'to-teal-600' },
    ];
    return gradients[index % gradients.length];
  };

  // Re-apply active preset when mode changes
  useEffect(() => {
    if (activePreset) {
      const preset = SCENARIO_PRESETS[activePreset];
      if (preset) {
        const updatedAssumptions = { ...assumptions };
        Object.keys(preset).forEach(key => {
          if (key in assumptions) {
            updatedAssumptions[key] = preset[key];
          }
        });
        onAssumptionsChange(updatedAssumptions);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisMode]); // Only re-run when mode changes

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Handle property change - reset assumptions
  const handlePropertyChange = (propertyId) => {
    onPropertySelect(propertyId);
    setActivePreset(null); // Clear preset when property changes
    setIsPropertyDropdownOpen(false); // Close dropdown after selection
    // Reset to defaults when property changes
    if (analysisMode === 'cash-flow') {
      onAssumptionsChange(CASH_FLOW_DEFAULT_ASSUMPTIONS);
    } else {
      onAssumptionsChange(EQUITY_DEFAULT_ASSUMPTIONS);
    }
  };

  // Handle preset selection
  const handlePresetSelect = (presetKey) => {
    const preset = SCENARIO_PRESETS[presetKey];
    if (!preset) return;

    // Apply preset to current mode's assumptions
    const updatedAssumptions = { ...assumptions };
    
    // Apply all preset values that exist in current assumptions
    Object.keys(preset).forEach(key => {
      if (key in assumptions) {
        updatedAssumptions[key] = preset[key];
      }
    });

    onAssumptionsChange(updatedAssumptions);
    setActivePreset(presetKey);
  };

  // Tooltip handlers with 0.2s delay
  const handleTooltipEnter = (fieldId) => {
    // Clear any existing timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    
    const timeout = setTimeout(() => {
      setShowTooltip(fieldId);
    }, 200);
    
    setTooltipTimeout(timeout);
  };

  const handleTooltipLeave = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setShowTooltip(null);
  };

  // Calculate estimated mortgage balance for prepayment year validation
  const getEstimatedMortgageBalanceForYear = (targetYear) => {
    if (!selectedProperty || !selectedProperty.mortgage) return null;
    
    try {
      const summaries = getMortgageYearlySummary(selectedProperty.mortgage, holdingPeriod);
      if (summaries && summaries[targetYear - 1]) {
        return summaries[targetYear - 1].endingBalance;
      }
    } catch (error) {
      console.warn('Error calculating mortgage balance for validation:', error);
    }
    
    // Fallback: rough estimate
    try {
      const currentBalance = getCurrentMortgageBalance(selectedProperty.mortgage);
      const monthlyPayment = getMonthlyMortgagePayment(selectedProperty.mortgage);
      const interestRate = selectedProperty.mortgage.interestRate || 0;
      
      let balance = currentBalance;
      for (let y = 1; y < targetYear; y++) {
        const annualInterest = balance * (interestRate / 100);
        const annualPrincipal = Math.min((monthlyPayment * 12) - annualInterest, balance);
        balance = Math.max(0, balance - annualPrincipal);
      }
      return balance;
    } catch (error) {
      return null;
    }
  };

  // Cash flow assumptions
  const cashFlowFields = [
    {
      id: 'annualRentIncrease',
      label: 'Rent Increase',
      min: 0,
      max: 15,
      step: 0.1,
      suffix: '%',
    },
    {
      id: 'annualExpenseInflation',
      label: 'Cost Increase',
      min: 0,
      max: 15,
      step: 0.1,
      suffix: '%',
    },
    {
      id: 'vacancyRate',
      label: 'Vacancy Rate',
      min: 0,
      max: 25,
      step: 0.1,
      suffix: '%',
    },
    {
      id: 'futureInterestRate',
      label: 'Future Interest Rate',
      min: 1,
      max: 12,
      step: 0.1,
      suffix: '%',
    },
  ];

  // Equity assumptions
  const equityFields = [
    {
      id: 'annualPropertyAppreciation',
      label: 'Property Appreciation',
      min: -10,
      max: 15,
      step: 0.1,
      suffix: '%',
    },
    {
      id: 'exitCapRate',
      label: 'Exit Cap Rate',
      min: 2,
      max: 12,
      step: 0.1,
      suffix: '%',
    },
    {
      id: 'futureInterestRate',
      label: 'Future Interest Rate',
      min: 1,
      max: 12,
      step: 0.1,
      suffix: '%',
    },
  ];

  const fields = analysisMode === 'cash-flow' ? cashFlowFields : equityFields;

  const handleSliderChange = (fieldId, value) => {
    setActivePreset(null); // Clear preset when user manually adjusts
    onAssumptionsChange({
      ...assumptions,
      [fieldId]: parseFloat(value),
    });
  };

  const handleInputChange = (fieldId, value) => {
    setActivePreset(null); // Clear preset when user manually adjusts
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const field = fields.find(f => f.id === fieldId);
      const clampedValue = Math.max(field.min, Math.min(field.max, numValue));
      onAssumptionsChange({
        ...assumptions,
        [fieldId]: clampedValue,
      });
    }
  };

  return (
    <div className="w-[320px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full overflow-y-auto">
      {/* Hidden div to ensure Tailwind includes gradient classes */}
      <div className="hidden bg-gradient-to-br from-blue-400 to-blue-600 bg-gradient-to-br from-emerald-400 to-emerald-600 bg-gradient-to-br from-purple-400 to-purple-600 bg-gradient-to-br from-orange-400 to-orange-600 bg-gradient-to-br from-pink-400 to-pink-600 bg-gradient-to-br from-teal-400 to-teal-600" />

      <div className="flex-1 p-4 space-y-6">
        {/* Property Selector */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-2">
            Property
          </label>
          <div className="relative" ref={propertyDropdownRef}>
            <button
              type="button"
              onClick={() => setIsPropertyDropdownOpen(!isPropertyDropdownOpen)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#205A3E] focus:border-[#205A3E] flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {selectedProperty ? (
                <>
                  {selectedProperty.imageUrl && typeof selectedProperty.imageUrl === 'string' && selectedProperty.imageUrl.trim() ? (
                    <div 
                      className="flex-shrink-0 w-6 h-6 rounded overflow-hidden bg-cover bg-center border border-gray-200 dark:border-gray-700"
                      style={{ backgroundImage: `url(${selectedProperty.imageUrl}?v=3)` }}
                    />
                  ) : (
                    <div 
                      className={`flex-shrink-0 w-6 h-6 rounded overflow-hidden bg-gradient-to-br border border-gray-200 dark:border-gray-700 ${
                        getPropertyGradient(properties.findIndex(p => p.id === selectedProperty.id) >= 0 ? properties.findIndex(p => p.id === selectedProperty.id) : 0).from
                      } ${
                        getPropertyGradient(properties.findIndex(p => p.id === selectedProperty.id) >= 0 ? properties.findIndex(p => p.id === selectedProperty.id) : 0).to
                      } dark:opacity-80`}
                    />
                  )}
                  <span className="flex-1 text-left truncate">{selectedProperty.nickname}</span>
                </>
              ) : (
                <span className="flex-1 text-left text-gray-500 dark:text-gray-400">Select a property</span>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isPropertyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isPropertyDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {properties.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No properties available
                  </div>
                ) : (
                  properties.map((property, index) => {
                    const imageGradient = getPropertyGradient(index);
                    const isSelected = selectedPropertyId === property.id;
                    
                    return (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => handlePropertyChange(property.id)}
                        className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          isSelected ? 'bg-[#205A3E]/10 dark:bg-[#205A3E]/20' : ''
                        }`}
                      >
                        {property.imageUrl && typeof property.imageUrl === 'string' && property.imageUrl.trim() ? (
                          <div 
                            className="flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-cover bg-center border border-gray-200 dark:border-gray-700"
                            style={{ backgroundImage: `url(${property.imageUrl}?v=3)` }}
                          />
                        ) : (
                          <div 
                            className={`flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-gradient-to-br border border-gray-200 dark:border-gray-700 ${imageGradient.from} ${imageGradient.to} dark:opacity-80`}
                          />
                        )}
                        <span className={`flex-1 text-sm truncate ${isSelected ? 'font-medium text-[#205A3E] dark:text-[#66B894]' : 'text-gray-900 dark:text-white'}`}>
                          {property.nickname}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Mode Toggle */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-2">
            Analysis Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onModeChange('cash-flow')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                analysisMode === 'cash-flow'
                  ? 'bg-[#205A3E] text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Cash Flow
            </button>
            <button
              onClick={() => onModeChange('equity')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                analysisMode === 'equity'
                  ? 'bg-[#205A3E] text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Equity
            </button>
          </div>
        </div>

        {/* Presets ButtonGroup */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-2">
            Presets
          </label>
          <div className="flex gap-2">
            {Object.entries(SCENARIO_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePresetSelect(key)}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all capitalize ${
                  activePreset === key
                    ? 'bg-[#205A3E] text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Holding Period */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-2">
            Holding Period
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="30"
              value={holdingPeriod}
              onChange={(e) => onHoldingPeriodChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#205A3E]"
            />
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>1 year</span>
              <span className="font-semibold tabular-nums">{holdingPeriod} years</span>
              <span>30 years</span>
            </div>
          </div>
        </div>

        {/* Sensitivity Assumptions */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-3">
            Sensitivity Assumptions
          </label>
          <div className="space-y-4">
            {fields.map((field) => {
              const value = assumptions[field.id] || 0;
              const tooltipText = ASSUMPTION_TOOLTIPS[field.id];
              
              return (
                <div key={field.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {field.label}
                      {tooltipText && (
                        <div className="relative inline-block">
                          <HelpCircle
                            className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            onMouseEnter={() => handleTooltipEnter(field.id)}
                            onMouseLeave={handleTooltipLeave}
                          />
                          {showTooltip === field.id && (
                            <div className="absolute left-5 top-0 z-50 w-[220px] p-2.5 bg-gray-900 text-white text-xs rounded-md shadow-xl pointer-events-none">
                              {tooltipText}
                              <div className="absolute left-0 top-2 -ml-1.5 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900"></div>
                            </div>
                          )}
                        </div>
                      )}
                    </label>
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={value.toFixed(1)}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-16 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#205A3E] focus:border-[#205A3E] tabular-nums"
                    />
                  </div>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={value}
                    onChange={(e) => handleSliderChange(field.id, e.target.value)}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#205A3E]"
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    <span>{field.min}{field.suffix}</span>
                    <span>{field.max}{field.suffix}</span>
                  </div>
                </div>
              );
            })}

            {/* Mortgage Prepayment - Compact Row */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Mortgage Prepayment
                <div className="relative inline-block">
                  <HelpCircle
                    className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    onMouseEnter={() => handleTooltipEnter('prepaymentAmount')}
                    onMouseLeave={handleTooltipLeave}
                  />
                  {showTooltip === 'prepaymentAmount' && (
                    <div className="absolute left-5 top-0 z-50 w-[220px] p-2.5 bg-gray-900 text-white text-xs rounded-md shadow-xl pointer-events-none">
                      The Strategic Infusion. Model a one-time principal payment in a specific year to instantly reduce debt and maximize long-term interest savings.
                      <div className="absolute left-0 top-2 -ml-1.5 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900"></div>
                    </div>
                  )}
                </div>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="100"
                  value={assumptions.prepaymentAmount || 0}
                  onChange={(e) => {
                    setActivePreset(null);
                    const numValue = parseFloat(e.target.value) || 0;
                    onAssumptionsChange({
                      ...assumptions,
                      prepaymentAmount: Math.max(0, numValue),
                    });
                  }}
                  className={`flex-1 px-2 py-1 text-xs border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#205A3E] focus:border-[#205A3E] tabular-nums ${
                    (() => {
                      const prepaymentYear = assumptions.prepaymentYear || 1;
                      const estimatedBalance = getEstimatedMortgageBalanceForYear(prepaymentYear);
                      const prepaymentAmount = assumptions.prepaymentAmount || 0;
                      return estimatedBalance !== null && prepaymentAmount > estimatedBalance
                        ? 'border-orange-500 dark:border-orange-500'
                        : 'border-gray-200 dark:border-gray-700';
                    })()
                  }`}
                  placeholder="0"
                />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">$</span>
                <select
                  value={assumptions.prepaymentYear || 1}
                  onChange={(e) => {
                    setActivePreset(null);
                    const newYear = parseInt(e.target.value);
                    onAssumptionsChange({
                      ...assumptions,
                      prepaymentYear: newYear,
                    });
                  }}
                  className="w-24 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#205A3E] focus:border-[#205A3E]"
                >
                  {Array.from({ length: holdingPeriod }, (_, i) => i + 1).map((year) => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </div>
              {/* Warning message if prepayment exceeds estimated balance */}
              {(() => {
                const prepaymentYear = assumptions.prepaymentYear || 1;
                const estimatedBalance = getEstimatedMortgageBalanceForYear(prepaymentYear);
                const prepaymentAmount = assumptions.prepaymentAmount || 0;
                
                if (estimatedBalance !== null && prepaymentAmount > estimatedBalance && prepaymentAmount > 0) {
                  return (
                    <div className="mt-1.5 px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                      <p className="text-[10px] text-orange-700 dark:text-orange-300">
                        ⚠️ Prepayment exceeds estimated mortgage balance (${estimatedBalance.toLocaleString()}) for Year {prepaymentYear}. Amount will be capped at available balance.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* Save Snapshot Button */}
        <button
          onClick={onSaveSnapshot}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#205A3E] text-white rounded-md text-sm font-medium hover:bg-[#1a4a32] transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Snapshot
        </button>

        {/* Saved Snapshots */}
        {snapshots.length > 0 && (
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-2">
              Saved Snapshots
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {snapshots
                .filter(s => s.propertyId === selectedPropertyId && s.analysisMode === analysisMode)
                .map((snapshot) => {
                  const isPinned = pinnedSnapshotId === snapshot.id;
                  return (
                    <div
                      key={snapshot.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border ${
                        isPinned
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                          {snapshot.name}
                        </p>
                        {isPinned && (
                          <p className="text-[10px] text-blue-600 dark:text-blue-400">Baseline</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onPinSnapshot(snapshot.id)}
                          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                            isPinned ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                          }`}
                          title={isPinned ? 'Unpin baseline' : 'Pin as baseline'}
                        >
                          <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                        </button>
                        {onDeleteSnapshot && (
                          <button
                            onClick={() => onDeleteSnapshot(snapshot.id)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete snapshot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Reset to Defaults Button */}
        <button
          onClick={() => {
            setActivePreset(null); // Clear preset when resetting
            onResetDefaults();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
