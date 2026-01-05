"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { useProperties, usePropertyContext } from "@/context/PropertyContext";
import { useAccount } from "@/context/AccountContext";
import { Download, X, ChevronDown, ChevronUp, Edit2, Save, XCircle, Plus, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';
import apiClient from "@/lib/api-client";

// Helper functions for historical data calculations
const getYearFromDateString = (value) => {
  if (!value) return NaN;
  const match = String(value).match(/^(\d{4})/);
  return match ? Number(match[1]) : NaN;
};

// Helper function to format date to YYYY-MM-DD (removes time component)
const formatDateOnly = (dateValue) => {
  if (!dateValue) return "N/A";
  // If it's already in YYYY-MM-DD format, return as is
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  // If it's an ISO string with time, extract just the date part
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  // Try to parse as Date and format
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // If parsing fails, return original value
  }
  return dateValue;
};

function getHistoricalIncome(property, year) {
  const targetYear = parseInt(year);
  
  // Check if there's a manual income override for this year
  if (property.incomeHistory && property.incomeHistory.length > 0) {
    const incomeOverride = property.incomeHistory.find(income => {
      const incomeYear = getYearFromDateString(income.date);
      return incomeYear === targetYear;
    });
    if (incomeOverride) {
      return incomeOverride.amount || 0;
    }
  }
  
  // Otherwise, calculate from tenant data
  if (!property.tenants || property.tenants.length === 0) return 0;
  
  const calendarYearStart = new Date(targetYear, 0, 1); // January 1st
  const calendarYearEnd = new Date(targetYear, 11, 31); // December 31st
  let totalIncome = 0;
  
  property.tenants.forEach(tenant => {
    const leaseStart = new Date(tenant.leaseStart);
    const leaseEnd = tenant.leaseEnd === 'Active' 
      ? new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
      : new Date(tenant.leaseEnd);
    
    // Check if tenant was active during any part of the calendar year
    if (leaseStart <= calendarYearEnd && leaseEnd >= calendarYearStart) {
      // Calculate the overlap between tenant lease and the calendar year
      const overlapStart = new Date(Math.max(leaseStart.getTime(), calendarYearStart.getTime()));
      const overlapEnd = new Date(Math.min(leaseEnd.getTime(), calendarYearEnd.getTime()));
      
      if (overlapStart <= overlapEnd) {
        // Calculate days in overlap for precise calculation
        const daysInOverlap = Math.max(0, Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1);
        
        // Calculate days in the month for proration
        const overlapStartMonth = overlapStart.getMonth();
        const overlapEndMonth = overlapEnd.getMonth();
        
        let monthlyIncome = 0;
        
        // Handle same month
        if (overlapStartMonth === overlapEndMonth) {
          const daysInMonth = new Date(overlapStart.getFullYear(), overlapStart.getMonth() + 1, 0).getDate();
          const prorationFactor = daysInOverlap / daysInMonth;
          monthlyIncome = tenant.rent * prorationFactor;
        } else {
          // Handle multiple months
          for (let month = overlapStartMonth; month <= overlapEndMonth; month++) {
            const monthStart = new Date(overlapStart.getFullYear(), month, 1);
            const monthEnd = new Date(overlapStart.getFullYear(), month + 1, 0);
            
            const monthOverlapStart = new Date(Math.max(overlapStart.getTime(), monthStart.getTime()));
            const monthOverlapEnd = new Date(Math.min(overlapEnd.getTime(), monthEnd.getTime()));
            
            const daysInMonth = monthEnd.getDate();
            const daysInOverlap = Math.max(0, Math.ceil((monthOverlapEnd - monthOverlapStart) / (1000 * 60 * 60 * 24)) + 1);
            const prorationFactor = daysInOverlap / daysInMonth;
            
            monthlyIncome += tenant.rent * prorationFactor;
          }
        }
        
        totalIncome += monthlyIncome;
      }
    }
  });
  
  return totalIncome;
}

function getHistoricalExpenses(property, year) {
  if (!property.expenseHistory) return 0;
  
  const targetYear = parseInt(year);
  const yearExpenses = property.expenseHistory.filter(expense => {
    const expenseYear = getYearFromDateString(expense.date);
    return expenseYear === targetYear;
  });
  
  return yearExpenses.reduce((total, expense) => total + expense.amount, 0);
}

function getAvailableYears(property) {
  const years = new Set();
  const currentYear = new Date().getFullYear();
  
  const addYear = (value) => {
    const year = getYearFromDateString(value);
    if (!Number.isNaN(year)) {
      years.add(year);
    }
  };
  
  // Get years from expense history
  if (property.expenseHistory) {
    property.expenseHistory.forEach(expense => {
      addYear(expense.date);
    });
  }
  
  // Get years from tenant history
  if (property.tenants) {
    property.tenants.forEach(tenant => {
      const leaseStartYear = getYearFromDateString(tenant.leaseStart);
      const leaseEndYear = tenant.leaseEnd === 'Active' 
        ? currentYear
        : getYearFromDateString(tenant.leaseEnd);
      
      for (let year = leaseStartYear; year <= leaseEndYear; year++) {
        if (!Number.isNaN(year)) {
        years.add(year);
        }
      }
    });
  }
  
  // Always include current year if we have any data (for forecast mode to work)
  // This ensures that even if only future years have data, current year is available
  if (years.size > 0) {
    years.add(currentYear);
  }
  
  return Array.from(years).sort((a, b) => a - b); // Sort ascending (oldest first)
}

// Shared DataRow component for displaying data rows
function DataRow({ label, value, isBold = false }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <span className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${isBold ? 'font-bold' : ''}`}>{label}</span>
      <span className={`text-sm text-gray-900 dark:text-gray-100 ${isBold ? 'font-bold' : ''}`}>{value || "N/A"}</span>
    </div>
  );
}

// Historical Data Display Component
function HistoricalDataDisplay({ property, expenseView, selectedYear: externalSelectedYear, onYearChange, isEditing = false, editedData = null, onUpdateExpense = null, onUpdateIncome = null, onUpdatePaymentFrequency = null, onUpdateForecastMode = null }) {
  const availableYears = [...getAvailableYears(property)].sort((a, b) => a - b);
  const [hoveredYear, setHoveredYear] = useState(null);
  // Local state for input values to prevent focus loss during typing
  const [inputValues, setInputValues] = useState({});
  
  // Use editedData if available, otherwise use property
  const dataSource = isEditing && editedData ? editedData : property;

  if (availableYears.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        <div className="text-sm">No historical data available</div>
      </div>
    );
  }

  // Always display all years
  // Ensure current year is included if we have any years (needed for forecast mode)
  const currentYear = new Date().getFullYear();
  const yearsToDisplay = (() => {
    if (availableYears.length > 0 && !availableYears.includes(currentYear)) {
      // Add current year if we have other years but current year is missing
      return [...availableYears, currentYear].sort((a, b) => a - b);
    }
    return availableYears;
  })();
  
  // Determine if forecast mode should be shown (current year must exist and there must be at least one previous year)
  const currentYearIndex = yearsToDisplay.findIndex(year => year === currentYear);
  // Show forecast mode if current year exists and there's at least one year before it in the sorted array
  const showForecastMode = currentYearIndex > 0 && yearsToDisplay.length > 1;
  
  // Get forecast modes from property data (stored in propertyData.expenseForecastModes)
  const expenseForecastModes = (dataSource.propertyData?.expenseForecastModes || {});
  
  // Default expense inflation rate (from assumptions, could also be from property.annualAssumptions)
  const annualExpenseInflation = 2.5; // Default 2.5% (from CASH_FLOW_DEFAULT_ASSUMPTIONS)

  if (yearsToDisplay.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        <div className="text-sm">No historical data available</div>
      </div>
    );
  }

  const snapshots = yearsToDisplay.map((year) => {
    const income = getHistoricalIncome(dataSource, year);
    const expenses = getHistoricalExpenses(dataSource, year);

    const expenseBreakdown = (dataSource.expenseHistory || [])
      .filter(expense => getYearFromDateString(expense.date) === year)
      .reduce((acc, expense) => {
        const category = expense.category;
        if (!acc[category]) {
          acc[category] = { total: 0, paymentFrequency: null };
        }
        acc[category].total += expense.amount;
        // Use the first payment frequency found for this category, or prefer from expenseData
        if (!acc[category].paymentFrequency && expense.expenseData?.paymentFrequency) {
          acc[category].paymentFrequency = expense.expenseData.paymentFrequency;
        } else if (!acc[category].paymentFrequency) {
          acc[category].paymentFrequency = 'Annual'; // Default
        }
        return acc;
      }, {});

    return {
      year,
      income,
      expenses,
      netIncome: income - expenses,
      expenseBreakdown,
    };
  });

  // Use the same expense categories as the onboarding wizard
  const EXPENSE_CATEGORIES = [
    'Advertising',
    'Insurance',
    'Interest & Bank Charges',
    'Office Expenses',
    'Professional Fees',
    'Management & Administration',
    'Repairs & Maintenance',
    'Salaries, Wages, and Benefits',
    'Property Taxes',
    'Travel',
    'Utilities',
    'Motor Vehicle Expenses',
    'Other Expenses',
    'Condo Maintenance Fees',
    'Mortgage (Principal)'
  ];
  
  // Categories that support forecast mode (all except the excluded ones)
  const FORECAST_MODE_EXCLUDED = ['Interest & Bank Charges', 'Mortgage (Principal)'];
  
  // Always show all categories, not just ones with expenses
  const sortedCategories = EXPENSE_CATEGORIES;

  const formatValue = (amount) =>
    `$${(
      expenseView === 'monthly'
        ? amount / 12
        : amount
    ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Helper function to determine if a column should be highlighted
  const isColumnHovered = (year) => hoveredYear === year;

  // Calculate forecasted value for a category based on previous year
  const calculateForecastValue = (category, currentYearValue) => {
    if (currentYearIndex <= 0) return currentYearValue; // No previous year available
    
    const previousYear = yearsToDisplay[currentYearIndex - 1];
    const previousYearSnapshot = snapshots.find(s => s.year === previousYear);
    const previousYearValue = previousYearSnapshot?.expenseBreakdown[category]?.total || 0;
    
    if (previousYearValue === 0) return currentYearValue; // Can't forecast from zero
    
    return previousYearValue * (1 + annualExpenseInflation / 100);
  };

  // Function to update forecast mode for a category
  const updateForecastMode = (category, mode) => {
    if (!onUpdateForecastMode) return;
    
    // Update the forecast mode
    onUpdateForecastMode(category, mode);
    
    // If switching to automatic, calculate and update the current year expense
    if (mode === 'automatic' && currentYearIndex >= 0 && onUpdateExpense) {
      const forecastedValue = calculateForecastValue(category, 0);
      if (forecastedValue > 0) {
        onUpdateExpense(category, currentYear, forecastedValue);
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-200 sticky left-0 bg-white dark:bg-gray-900 z-10">Category</th>
            <th className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-200 sticky left-[200px] bg-white dark:bg-gray-900 z-10 min-w-[140px]">Payment Frequency</th>
            {snapshots.map(snapshot => (
              <th
                key={`header-${snapshot.year}`}
                className="py-2 px-4 font-semibold text-gray-700 dark:text-gray-200 text-right min-w-[120px]"
                onMouseEnter={() => setHoveredYear(snapshot.year)}
                onMouseLeave={() => setHoveredYear(null)}
              >
                {snapshot.year}
              </th>
            ))}
            {showForecastMode && (
              <th className="py-2 px-4 font-semibold text-gray-700 dark:text-gray-200 text-center min-w-[140px]">
                Forecast Mode
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          <tr>
            <td className={`py-2 pr-4 text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-900 z-10 ${
              snapshots.some(s => isColumnHovered(s.year)) 
                ? 'bg-amber-50 dark:bg-amber-900/20' 
                : ''
            }`}>
              Rent
            </td>
            <td className={`py-2 pr-4 text-gray-500 dark:text-gray-400 sticky left-[200px] bg-white dark:bg-gray-900 z-10 ${
              snapshots.some(s => isColumnHovered(s.year)) 
                ? 'bg-amber-50 dark:bg-amber-900/20' 
                : ''
            }`}>
              {/* Empty cell for Rent - Payment Frequency does not apply */}
            </td>
            {snapshots.map(snapshot => {
              const income = snapshot.income || 0;
              const calculatedAmount = expenseView === 'monthly' ? income / 12 : income;
              // Format value for input - round to 2 decimal places, handle NaN
              const storedValue = isNaN(calculatedAmount) ? 0 : parseFloat(calculatedAmount.toFixed(2));
              const inputKey = `income-${snapshot.year}`;
              // Use local input value if it exists, otherwise use stored value
              // When using stored value, ensure it's properly formatted to 2 decimals
              let displayValue = inputValues[inputKey] !== undefined ? inputValues[inputKey] : storedValue;
              
              // If displayValue is a number and not from local input, ensure it's formatted to 2 decimals
              if (inputValues[inputKey] === undefined && typeof displayValue === 'number' && !isNaN(displayValue)) {
                displayValue = parseFloat(displayValue.toFixed(2));
              }
              
              return (
                <td 
                  key={`rent-${snapshot.year}`} 
                  className={`py-2 px-4 text-right text-gray-900 dark:text-gray-100 transition-colors ${
                    isColumnHovered(snapshot.year) 
                      ? 'bg-amber-50 dark:bg-amber-900/20' 
                      : ''
                  }`}
                  onMouseEnter={() => setHoveredYear(snapshot.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {isEditing && onUpdateIncome ? (
                    <input
                      type="number"
                      step="0.01"
                      value={displayValue}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // Update local state immediately for smooth typing
                        setInputValues(prev => ({
                          ...prev,
                          [inputKey]: inputValue
                        }));
                      }}
                      onBlur={(e) => {
                        const inputValue = e.target.value;
                        // Clear local state
                        setInputValues(prev => {
                          const newState = { ...prev };
                          delete newState[inputKey];
                          return newState;
                        });
                        // Update parent state with final value, rounded to 2 decimals
                        if (inputValue === '' || inputValue === '-') {
                          onUpdateIncome(snapshot.year, 0);
                          return;
                        }
                        const newValue = parseFloat(inputValue);
                        if (!isNaN(newValue)) {
                          // Round to 2 decimal places before converting
                          const roundedValue = parseFloat(newValue.toFixed(2));
                          const annualValue = expenseView === 'monthly' ? roundedValue * 12 : roundedValue;
                          // Round annual value to 2 decimals as well
                          const roundedAnnualValue = parseFloat(annualValue.toFixed(2));
                          onUpdateIncome(snapshot.year, roundedAnnualValue);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur(); // Trigger blur which will update the parent state
                        }
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#205A3E] text-right"
                    />
                  ) : (
                    formatValue(income)
                  )}
                </td>
              );
            })}
            {showForecastMode && (
              <td className="py-2 px-4 text-center">
                {/* Empty - Rent doesn't have forecast mode */}
              </td>
            )}
          </tr>
          {sortedCategories.map(category => {
            // Get payment frequency from first snapshot that has this category
            const paymentFrequency = snapshots
              .map(s => s.expenseBreakdown[category]?.paymentFrequency)
              .find(freq => freq) || 'Annual';
            
            // Check if this category supports forecast mode
            const supportsForecastMode = !FORECAST_MODE_EXCLUDED.includes(category);
            const currentYearMode = expenseForecastModes[category] || 'manual';
            
            // Get current year snapshot data
            const currentYearSnapshot = snapshots.find(s => s.year === currentYear);
            const currentYearCategoryData = currentYearSnapshot?.expenseBreakdown[category];
            const currentYearAmount = currentYearCategoryData?.total || 0;
            
            // Calculate automatic forecast value if in automatic mode
            const shouldUseForecast = showForecastMode && supportsForecastMode && currentYearMode === 'automatic' && currentYearIndex >= 0;
            const forecastedAmount = shouldUseForecast 
              ? calculateForecastValue(category, currentYearAmount)
              : currentYearAmount;
            
            return (
              <tr key={`category-${category}`}>
                <td className={`py-2 pr-4 text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-900 z-10 ${
                  snapshots.some(s => isColumnHovered(s.year)) 
                    ? 'bg-amber-50 dark:bg-amber-900/20' 
                    : ''
                }`}>
                  {category}
                </td>
                <td className={`py-2 pr-4 text-gray-500 dark:text-gray-400 sticky left-[200px] bg-white dark:bg-gray-900 z-10 ${
                  snapshots.some(s => isColumnHovered(s.year)) 
                    ? 'bg-amber-50 dark:bg-amber-900/20' 
                    : ''
                }`}>
                  {isEditing && onUpdatePaymentFrequency ? (
                    <select
                      value={paymentFrequency}
                      onChange={(e) => onUpdatePaymentFrequency(category, e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#205A3E]"
                    >
                      <option value="Annual">Annual</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  ) : (
                    paymentFrequency
                  )}
                </td>
                {snapshots.map(snapshot => {
                  const categoryData = snapshot.expenseBreakdown[category];
                  const amount = categoryData?.total || 0;
                  const isCurrentYear = snapshot.year === currentYear;
                  
                  // Use forecasted value for current year if in automatic mode, otherwise use actual amount
                  const calculatedAmount = isCurrentYear && shouldUseForecast
                    ? (expenseView === 'monthly' ? forecastedAmount / 12 : forecastedAmount)
                    : (expenseView === 'monthly' ? amount / 12 : amount);
                  
                  // Format value for input - round to 2 decimal places, handle NaN
                  const storedValue = isNaN(calculatedAmount) ? 0 : Number(calculatedAmount.toFixed(2));
                  const inputKey = `expense-${category}-${snapshot.year}`;
                  // Use local input value if it exists, otherwise use stored value
                  const displayAmountForYear = inputValues[inputKey] !== undefined ? inputValues[inputKey] : storedValue;
                  
                  // Check if this year should be disabled
                  // Current year is only editable when in Manual mode (disabled in Automatic mode)
                  // Historical years (2023-2025) are always editable when in edit mode
                  // shouldUseForecast is true only when currentYearMode === 'automatic'
                  const isDisabled = isCurrentYear && shouldUseForecast;
                  
                  return (
                    <td 
                      key={`category-${category}-${snapshot.year}`} 
                      className={`py-2 px-4 text-right text-gray-900 dark:text-gray-100 transition-colors ${
                        isColumnHovered(snapshot.year) 
                          ? 'bg-amber-50 dark:bg-amber-900/20' 
                          : ''
                      } ${
                        isCurrentYear && shouldUseForecast
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : ''
                      }`}
                      onMouseEnter={() => setHoveredYear(snapshot.year)}
                      onMouseLeave={() => setHoveredYear(null)}
                    >
                      {isEditing && onUpdateExpense ? (
                        <input
                          type="number"
                          step="0.01"
                          value={displayAmountForYear}
                          disabled={isDisabled}
                          onChange={(e) => {
                            if (isDisabled) return;
                            const inputValue = e.target.value;
                            // Update local state immediately for smooth typing
                            setInputValues(prev => ({
                              ...prev,
                              [inputKey]: inputValue
                            }));
                          }}
                          onBlur={(e) => {
                            if (isDisabled) return;
                            const inputValue = e.target.value;
                            // Clear local state
                            setInputValues(prev => {
                              const newState = { ...prev };
                              delete newState[inputKey];
                              return newState;
                            });
                            // Update parent state with final value
                            if (inputValue === '' || inputValue === '-') {
                              onUpdateExpense(category, snapshot.year, 0);
                              return;
                            }
                            const newValue = parseFloat(inputValue);
                            if (!isNaN(newValue)) {
                              const annualValue = expenseView === 'monthly' ? newValue * 12 : newValue;
                              onUpdateExpense(category, snapshot.year, annualValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur(); // Trigger blur which will update the parent state
                            }
                          }}
                          className={`w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#205A3E] text-right ${
                            isDisabled ? 'bg-blue-50 dark:bg-blue-900/20 cursor-not-allowed opacity-75' : ''
                          }`}
                          title={isDisabled ? 'Automatically calculated from previous year' : ''}
                        />
                      ) : (
                        formatValue(isCurrentYear && shouldUseForecast ? forecastedAmount : amount)
                      )}
                    </td>
                  );
                })}
                {showForecastMode && (
                  <td className="py-2 px-4 text-center">
                    {supportsForecastMode && isEditing ? (
                      <select
                        value={currentYearMode}
                        onChange={(e) => {
                          const newMode = e.target.value;
                          updateForecastMode(category, newMode);
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#205A3E]"
                      >
                        <option value="manual">Manual</option>
                        <option value="automatic">Automatic</option>
                      </select>
                    ) : supportsForecastMode ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {currentYearMode === 'automatic' ? 'Auto' : 'Manual'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          <tr>
            <td className={`py-2 pr-4 font-semibold text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900 z-10 ${
              snapshots.some(s => isColumnHovered(s.year)) 
                ? 'bg-amber-50 dark:bg-amber-900/20' 
                : ''
            }`}>
              {expenseView === 'monthly' ? 'Total Monthly Expenses' : 'Total Annual Expenses'}
            </td>
            <td className={`py-2 pr-4 sticky left-[200px] bg-white dark:bg-gray-900 z-10 ${
              snapshots.some(s => isColumnHovered(s.year)) 
                ? 'bg-amber-50 dark:bg-amber-900/20' 
                : ''
            }`}>
              {/* Empty cell for total row */}
            </td>
            {snapshots.map(snapshot => {
              // For current year, recalculate total expenses if any categories are in automatic mode
              let displayExpenses = snapshot.expenses;
              if (snapshot.year === currentYear && showForecastMode) {
                let recalculatedExpenses = 0;
                sortedCategories.forEach(category => {
                  if (FORECAST_MODE_EXCLUDED.includes(category)) {
                    // Include excluded categories from actual data
                    const categoryData = snapshot.expenseBreakdown[category];
                    recalculatedExpenses += categoryData?.total || 0;
                  } else {
                    const mode = expenseForecastModes[category] || 'manual';
                    if (mode === 'automatic' && currentYearIndex > 0) {
                      // Use forecasted value
                      recalculatedExpenses += calculateForecastValue(category, snapshot.expenseBreakdown[category]?.total || 0);
                    } else {
                      // Use actual value
                      const categoryData = snapshot.expenseBreakdown[category];
                      recalculatedExpenses += categoryData?.total || 0;
                    }
                  }
                });
                displayExpenses = recalculatedExpenses;
              }
              
              return (
                <td 
                  key={`total-exp-${snapshot.year}`} 
                  className={`py-2 px-4 text-right font-semibold text-gray-900 dark:text-gray-100 transition-colors ${
                    isColumnHovered(snapshot.year) 
                      ? 'bg-amber-50 dark:bg-amber-900/20' 
                      : ''
                  }`}
                  onMouseEnter={() => setHoveredYear(snapshot.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {formatValue(displayExpenses)}
                </td>
              );
            })}
            {showForecastMode && (
              <td className="py-2 px-4">
                {/* Empty cell for total row */}
              </td>
            )}
          </tr>
          <tr>
            <td className={`py-2 pr-4 font-semibold text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900 z-10 ${
              snapshots.some(s => isColumnHovered(s.year)) 
                ? 'bg-amber-50 dark:bg-amber-900/20' 
                : ''
            }`}>
              {expenseView === 'monthly' ? 'Monthly Net Income' : 'Annual Net Income'}
            </td>
            <td className={`py-2 pr-4 sticky left-[200px] bg-white dark:bg-gray-900 z-10 ${
              snapshots.some(s => isColumnHovered(s.year)) 
                ? 'bg-amber-50 dark:bg-amber-900/20' 
                : ''
            }`}>
              {/* Empty cell for net income row */}
            </td>
            {snapshots.map(snapshot => {
              // Recalculate net income for current year if expenses were forecasted
              let displayNetIncome = snapshot.netIncome;
              if (snapshot.year === currentYear && showForecastMode) {
                let recalculatedExpenses = 0;
                sortedCategories.forEach(category => {
                  if (FORECAST_MODE_EXCLUDED.includes(category)) {
                    const categoryData = snapshot.expenseBreakdown[category];
                    recalculatedExpenses += categoryData?.total || 0;
                  } else {
                    const mode = expenseForecastModes[category] || 'manual';
                    if (mode === 'automatic' && currentYearIndex > 0) {
                      recalculatedExpenses += calculateForecastValue(category, snapshot.expenseBreakdown[category]?.total || 0);
                    } else {
                      const categoryData = snapshot.expenseBreakdown[category];
                      recalculatedExpenses += categoryData?.total || 0;
                    }
                  }
                });
                displayNetIncome = snapshot.income - recalculatedExpenses;
              }
              
              return (
                <td 
                  key={`net-${snapshot.year}`} 
                  className={`py-2 px-4 text-right font-semibold text-gray-900 dark:text-gray-100 transition-colors ${
                    isColumnHovered(snapshot.year) 
                      ? 'bg-amber-50 dark:bg-amber-900/20' 
                      : ''
                  }`}
                  onMouseEnter={() => setHoveredYear(snapshot.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {formatValue(displayNetIncome)}
                </td>
              );
            })}
            {showForecastMode && (
              <td className="py-2 px-4">
                {/* Empty cell for net income row */}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// PropertyCard component with collapsible sections
function PropertyCard({ property, onUpdate, onAddExpense, onAddTenant }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [expenseView, setExpenseView] = useState('annual');
  const [tenantView, setTenantView] = useState('current');

  const clonePropertyData = (value) => {
    const structuredCloneFn = (globalThis).structuredClone;
    if (typeof structuredCloneFn === "function") {
      return structuredCloneFn(value);
    }
    return JSON.parse(JSON.stringify(value));
  };

  const getValueAtPath = (obj, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((acc, key) => {
      if (acc === null || acc === undefined) return undefined;
      return acc[key];
    }, obj);
  };

  const setValueAtPath = (obj, path, value) => {
    if (!path) return obj;
    const keys = path.split('.');
    const base = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
    let current = base;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const next = current[key];
      if (Array.isArray(next)) {
        current[key] = [...next];
      } else if (next && typeof next === 'object') {
        current[key] = { ...next };
      } else {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return base;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedData(clonePropertyData(property));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleSave = () => {
    const payload =
      editedData && Object.keys(editedData).length > 0
        ? clonePropertyData(editedData)
        : clonePropertyData(property);

    if (!payload.rent) {
      payload.rent = { monthlyRent: 0, annualRent: 0 };
    }
    const monthlyRent = Number(payload.rent.monthlyRent || 0);
    payload.rent.monthlyRent = monthlyRent;
    payload.rent.annualRent = Number(payload.rent.annualRent || monthlyRent * 12);

    if (!payload.monthlyExpenses) {
      payload.monthlyExpenses = {};
    }

    const operatingExpenseKeys = [
      "advertising",
      "insurance",
      "officeExpenses",
      "professionalFees",
      "management",
      "maintenance",
      "propertyTax",
      "travel",
      "utilities",
      "motorVehicle",
      "condoFees",
    ];

    const monthlyExpensesRecord = payload.monthlyExpenses;
    operatingExpenseKeys.forEach((key) => {
      monthlyExpensesRecord[key] = Number(monthlyExpensesRecord[key] || 0);
    });
    monthlyExpensesRecord.mortgageInterest = Number(monthlyExpensesRecord.mortgageInterest || 0);
    monthlyExpensesRecord.mortgagePrincipal = Number(monthlyExpensesRecord.mortgagePrincipal || 0);
    monthlyExpensesRecord.mortgagePayment = Number(monthlyExpensesRecord.mortgagePayment || 0);

    const operatingTotal = operatingExpenseKeys.reduce(
      (sum, key) => sum + (monthlyExpensesRecord[key] || 0),
      0
    );
    monthlyExpensesRecord.total = Number(operatingTotal.toFixed(2));

    payload.monthlyPropertyTax = monthlyExpensesRecord.propertyTax || 0;
    payload.monthlyCondoFees = monthlyExpensesRecord.condoFees || 0;
    payload.monthlyInsurance = monthlyExpensesRecord.insurance || 0;
    payload.monthlyMaintenance = monthlyExpensesRecord.maintenance || 0;
    payload.monthlyProfessionalFees = monthlyExpensesRecord.professionalFees || 0;
    payload.monthlyUtilities = monthlyExpensesRecord.utilities || 0;

    if (onUpdate) {
      onUpdate(property.id, payload);
    }

    setIsEditing(false);
    setEditedData({});
  };

  const updateField = (path, value, type = "text") => {
    if (!path) return;
    setEditedData(prev => {
      const base =
        prev && Object.keys(prev).length > 0 ? prev : clonePropertyData(property);
      let parsedValue;
      if (type === "number") {
        parsedValue = value === "" ? "" : Number(value);
      } else if (type === "checkbox") {
        parsedValue = Boolean(value);
      } else {
        parsedValue = value;
      }
      return setValueAtPath(base, path, parsedValue);
    });
  };

  // Function to update expense amount for a category/year combination
  const updateExpense = (category, year, annualAmount) => {
    setEditedData(prev => {
      const base = prev && Object.keys(prev).length > 0 ? prev : clonePropertyData(property);
      const expenseHistory = base.expenseHistory || [];
      
      const targetYear = parseInt(year);
      const targetDate = `${targetYear}-01-01`; // Use January 1st as default date
      const numAmount = parseFloat(annualAmount) || 0;
      
      // Remove all expenses for this category/year (we'll add one back if amount > 0)
      let updatedExpenseHistory = expenseHistory.filter(expense => {
        const expenseYear = getYearFromDateString(expense.date);
        return !(expenseYear === targetYear && expense.category === category);
      });
      
      // If amount is greater than 0, add a new expense record (consolidates multiple into one)
      if (numAmount > 0) {
        // Try to preserve the date from the first existing expense if any
        const existingExpense = expenseHistory.find(expense => {
          const expenseYear = getYearFromDateString(expense.date);
          return expenseYear === targetYear && expense.category === category;
        });
        
        const newExpense = {
          date: existingExpense?.date || targetDate,
          amount: numAmount,
          category: category,
          description: existingExpense?.description || null,
          expenseData: existingExpense?.expenseData || {
            paymentFrequency: 'Annual'
          }
        };
        updatedExpenseHistory.push(newExpense);
      }
      
      return {
        ...base,
        expenseHistory: updatedExpenseHistory
      };
    });
  };

  // Function to update payment frequency for a category
  const updatePaymentFrequency = (category, frequency) => {
    setEditedData(prev => {
      const base = prev && Object.keys(prev).length > 0 ? prev : clonePropertyData(property);
      const expenseHistory = base.expenseHistory || [];
      
      // Update payment frequency for all expenses of this category
      const updatedExpenseHistory = expenseHistory.map(expense => {
        if (expense.category === category) {
          return {
            ...expense,
            expenseData: {
              ...(expense.expenseData || {}),
              paymentFrequency: frequency
            }
          };
        }
        return expense;
      });
      
      // If there are no expenses for this category yet, we might want to create a placeholder
      // But for now, we'll just update existing ones
      
      return {
        ...base,
        expenseHistory: updatedExpenseHistory
      };
    });
  };

  // Function to update income amount for a year
  const updateIncome = (year, annualAmount) => {
    setEditedData(prev => {
      const base = prev && Object.keys(prev).length > 0 ? prev : clonePropertyData(property);
      
      // Initialize incomeHistory if it doesn't exist
      if (!base.incomeHistory) {
        base.incomeHistory = [];
      }
      
      const targetYear = parseInt(year);
      const numAmount = parseFloat(annualAmount) || 0;
      // Round to 2 decimal places
      const roundedAmount = parseFloat(numAmount.toFixed(2));
      
      // Remove existing income record for this year
      const updatedIncomeHistory = base.incomeHistory.filter(income => {
        const incomeYear = getYearFromDateString(income.date);
        return incomeYear !== targetYear;
      });
      
      // If amount is greater than 0, add a new income record
      if (roundedAmount > 0) {
        const targetDate = `${targetYear}-01-01`; // Use January 1st as default date
        const existingIncome = base.incomeHistory.find(income => {
          const incomeYear = getYearFromDateString(income.date);
          return incomeYear === targetYear;
        });
        
        const newIncome = {
          date: existingIncome?.date || targetDate,
          amount: roundedAmount,
          source: 'manual' // Mark as manually entered
        };
        updatedIncomeHistory.push(newIncome);
      }
      
      return {
        ...base,
        incomeHistory: updatedIncomeHistory
      };
    });
  };

  // Function to update forecast mode for a category
  const updateForecastMode = (category, mode) => {
    setEditedData(prev => {
      const base = prev && Object.keys(prev).length > 0 ? prev : clonePropertyData(property);
      
      if (!base.propertyData) {
        base.propertyData = {};
      }
      if (!base.propertyData.expenseForecastModes) {
        base.propertyData.expenseForecastModes = {};
      }
      
      base.propertyData.expenseForecastModes[category] = mode;
      
      return base;
    });
  };

  const Section = ({ title, sectionKey, children }) => {
    const isExpanded = expandedSections[sectionKey];
    return (
      <div className="border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {isExpanded && (
          <div className="p-4 pt-0 bg-gray-50 dark:bg-gray-800/50">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Editable DataRow component for PropertyCard (with editing capabilities)
  const EditableDataRow = ({ label, value, editable = false, field = "", type = "text", isBold = false, options = [] }) => {
    const rawInputValue = field ? getValueAtPath(editedData, field) : undefined;
    const inputValue = rawInputValue === undefined || rawInputValue === null 
      ? (type === "checkbox" ? false : "") 
      : rawInputValue;
    const inputString = inputValue === "" ? "" : String(inputValue);

    return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <span className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${isBold ? 'font-bold' : ''}`}>{label}</span>
      {isEditing && editable ? (
        type === "checkbox" ? (
          <input
            type="checkbox"
            checked={inputValue === true || inputValue === "true" || inputValue === 1}
            onChange={(e) => updateField(field, e.target.checked, type)}
            className="w-4 h-4 text-[#205A3E] border-gray-300 rounded focus:ring-[#205A3E]"
          />
        ) : type === "select" ? (
          <select
            value={inputString}
            onChange={(e) => updateField(field, e.target.value, type)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#205A3E]"
          >
            <option value="">Select...</option>
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={type === "number" ? inputString : inputString}
            onChange={(e) => updateField(field, e.target.value, type)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#205A3E]"
          />
        )
      ) : (
        <span className={`text-sm text-gray-900 dark:text-gray-100 ${isBold ? 'font-bold' : ''}`}>
          {type === "checkbox" ? (value ? "Yes" : "No") : (value || "N/A")}
        </span>
      )}
    </div>
  );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="py-[1.35rem] px-6 bg-gradient-to-r from-[#205A3E] to-[#2a7050] text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4 flex-1">
            {/* Thumbnail Image */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-lg border-2 border-white/20 overflow-hidden shadow-lg bg-white/10">
                {property.imageUrl ? (
                  <img 
                    src={`${property.imageUrl}?v=3`}
                    alt={property.name || property.nickname || 'Property image'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                    <div className="text-white/60 text-xs text-center px-1">
                      No Image
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Property Name and Address */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{property.name || property.nickname}</h2>
              <p className="text-sm opacity-90 mt-1">{property.address}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Save changes"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Cancel editing"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Edit property"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <Section title="Property Details" sectionKey="propertyDetails">
        <div className="space-y-1">
          <EditableDataRow label="Property Name" value={property.name || property.nickname} editable field="name" />
          <EditableDataRow label="Address" value={property.address} editable field="address" />
          <EditableDataRow label="Property Type" value={property.propertyType || property.type} editable field="propertyType" />
          <EditableDataRow label="Year Built" value={property.yearBuilt} editable field="yearBuilt" type="number" />
          <EditableDataRow label="Square Footage" value={property.size || property.squareFootage} editable field="size" type="number" />
          <EditableDataRow label="Bedrooms" value={property.bedrooms?.[0] || property.bedrooms} editable field="bedrooms" type="number" />
          <EditableDataRow label="Bathrooms" value={property.bathrooms?.[0] || property.bathrooms} editable field="bathrooms" type="number" />
          <EditableDataRow label="Dens" value={property.dens?.[0] || property.dens} editable field="dens" type="number" />
          <EditableDataRow label="Units" value={property.units || 1} editable field="units" type="number" />
          <EditableDataRow label="Principal Residence" value={property.isPrincipalResidence || false} editable field="isPrincipalResidence" type="checkbox" />
          <EditableDataRow 
            label="Ownership" 
            value={property.ownership || property.propertyData?.ownership || ""} 
            editable 
            field="ownership" 
            type="select" 
            options={["Personal", "Incorporated"]} 
          />
        </div>
      </Section>

      <Section title="Purchase Information" sectionKey="purchaseInfo">
        <div className="space-y-1">
          <EditableDataRow label="Purchase Date" value={formatDateOnly(property.purchaseDate)} editable field="purchaseDate" type="date" />
          <EditableDataRow 
            label="Purchase Price" 
            value={`$${(property.purchasePrice || 0).toLocaleString()}`} 
            editable 
            field="purchasePrice" 
            type="number" 
          />
          <EditableDataRow 
            label="Original Mortgage" 
            value={`$${(property.mortgage?.originalAmount || 0).toLocaleString()}`} 
            editable 
            field="mortgage.originalAmount" 
            type="number" 
          />
          <EditableDataRow 
            label="Down Payment" 
            value={`$${((property.purchasePrice || 0) - (property.mortgage?.originalAmount || 0)).toLocaleString()}`} 
          />
          <EditableDataRow 
            label="Closing Costs" 
            value={`$${(property.closingCosts || 0).toLocaleString()}`} 
            editable 
            field="closingCosts" 
            type="number" 
          />
          <EditableDataRow 
            label="Initial Renovations" 
            value={`$${(property.initialRenovations || 0).toLocaleString()}`} 
            editable 
            field="initialRenovations" 
            type="number" 
          />
          <EditableDataRow 
            label="Total Purchase Cost" 
            value={`$${(((property.purchasePrice || 0) - (property.mortgage?.originalAmount || 0)) + (property.closingCosts || 0) + (property.initialRenovations || 0)).toLocaleString()}`} 
          />
          <EditableDataRow 
            label="Current Market Value" 
            value={`$${(property.currentMarketValue || property.currentValue || 0).toLocaleString()}`} 
            editable 
            field="currentMarketValue" 
            type="number" 
          />
          <EditableDataRow 
            label="Appreciation" 
            value={`$${(property.appreciation || 0).toLocaleString()}`} 
          />
        </div>
      </Section>

      <Section title="Mortgage Details" sectionKey="mortgageDetails">
        <div className="space-y-1">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Mortgage information can be edited on the{" "}
              <a 
                href="/mortgages" 
                className="underline font-semibold hover:text-blue-900 dark:hover:text-blue-100"
              >
                Mortgages page
              </a>
              .
            </p>
          </div>
          <EditableDataRow label="Lender" value={property.mortgage?.lender} />
          <EditableDataRow 
            label="Original Amount" 
            value={`$${(property.mortgage?.originalAmount || 0).toLocaleString()}`} 
          />
          <EditableDataRow 
            label="Interest Rate" 
            value={`${((property.mortgage?.interestRate || 0) * 100).toFixed(2)}%`} 
          />
          <EditableDataRow label="Rate Type" value={property.mortgage?.rateType} />
          <EditableDataRow 
            label="Amortization (Years)" 
            value={property.mortgage?.amortizationYears?.toFixed(1)} 
          />
          <EditableDataRow label="Term (Months)" value={property.mortgage?.termMonths} />
          <EditableDataRow label="Payment Frequency" value={property.mortgage?.paymentFrequency} />
          <EditableDataRow label="Start Date" value={formatDateOnly(property.mortgage?.startDate)} />
        </div>
      </Section>

      <Section title="Income & Expenses" sectionKey="incomeExpenses">
        <div className="space-y-1">
          {/* Note about annual expenses */}
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Expenses incurred annually are averaged out over the year.
            </p>
          </div>
          {/* View Toggle */}
          <div className="flex items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setExpenseView('monthly')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    expenseView === 'monthly'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setExpenseView('annual')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    expenseView === 'annual'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Annual
                </button>
              </div>
            </div>
          </div>

          {/* Historical Data Display - Always show historical format */}
          <HistoricalDataDisplay 
            property={property} 
            expenseView={expenseView}
            selectedYear="all"
            onYearChange={() => {}}
            isEditing={isEditing}
            editedData={editedData}
            onUpdateExpense={updateExpense}
            onUpdateIncome={updateIncome}
            onUpdatePaymentFrequency={updatePaymentFrequency}
            onUpdateForecastMode={updateForecastMode}
          />
        </div>
      </Section>

      <Section title="Tenant Information" sectionKey="tenantInfo">
        <div className="space-y-1">
          {/* View Toggle and Add Tenant Button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setTenantView('current')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    tenantView === 'current'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Current
                </button>
                <button
                  onClick={() => setTenantView('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    tenantView === 'all'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Tenant History
                </button>
              </div>
            </div>
            <button
              onClick={() => onAddTenant && onAddTenant(property)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#205A3E] text-white rounded-lg hover:bg-[#1a4a32] transition-colors"
              title="Add tenant"
            >
              <Plus className="w-4 h-4" />
              Add Tenant
            </button>
          </div>

          {tenantView === 'current' ? (
            /* Current Tenant */
            <>
              {(() => {
                const activeTenant = property.tenants?.find(t => t.status === 'Active') || property.tenant;
                const tenantIndex = property.tenants?.findIndex(t => t.status === 'Active') ?? 0;
                return (
                  <>
                    <EditableDataRow 
                      label="Tenant Name" 
                      value={activeTenant?.name || 'N/A'} 
                      editable 
                      field={`tenants.${tenantIndex}.name`}
                    />
                    <EditableDataRow 
                      label="Unit" 
                      value={activeTenant?.unit || 'N/A'} 
                      editable 
                      field={`tenants.${tenantIndex}.unit`}
                    />
                    <EditableDataRow 
                      label="Lease Start Date" 
                      value={activeTenant?.leaseStartDate || activeTenant?.leaseStart || 'N/A'} 
                      editable 
                      field={`tenants.${tenantIndex}.leaseStart`}
                      type="date"
                    />
                    <EditableDataRow 
                      label="Lease End Date" 
                      value={activeTenant?.leaseEndDate || activeTenant?.leaseEnd || 'N/A'} 
                      editable 
                      field={`tenants.${tenantIndex}.leaseEnd`}
                      type="date"
                    />
                    <EditableDataRow 
                      label="Monthly Rent" 
                      value={`$${(activeTenant?.rent || 0).toLocaleString()}`} 
                      editable 
                      field={`tenants.${tenantIndex}.rent`}
                      type="number"
                    />
                    <EditableDataRow label="Key Deposit" value="" />
                    <EditableDataRow 
                      label="Status" 
                      value={activeTenant?.status || 'N/A'} 
                      editable 
                      field={`tenants.${tenantIndex}.status`}
                    />
                  </>
                );
              })()}
            </>
          ) : (
            /* All Tenants */
            <div className="space-y-4">
              {property.tenants && property.tenants.length > 0 ? (
                property.tenants.map((tenant, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Tenant {index + 1}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          tenant.status === 'Active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {tenant.status}
                        </span>
                      </div>
                      <EditableDataRow 
                        label="Name" 
                        value={tenant.name} 
                        editable 
                        field={`tenants.${index}.name`}
                      />
                      <EditableDataRow 
                        label="Unit" 
                        value={tenant.unit} 
                        editable 
                        field={`tenants.${index}.unit`}
                      />
                      <EditableDataRow 
                        label="Lease Start" 
                        value={tenant.leaseStart} 
                        editable 
                        field={`tenants.${index}.leaseStart`}
                        type="date"
                      />
                      <EditableDataRow 
                        label="Lease End" 
                        value={tenant.leaseEnd} 
                        editable 
                        field={`tenants.${index}.leaseEnd`}
                        type="date"
                      />
                      <EditableDataRow 
                        label="Monthly Rent" 
                        value={`$${(tenant.rent || 0).toLocaleString()}`} 
                        editable 
                        field={`tenants.${index}.rent`}
                        type="number"
                      />
                      <EditableDataRow label="Key Deposit" value="" />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${tenant.name || 'this tenant'}?`)) {
                              const updatedTenants = property.tenants.filter((_, idx) => idx !== index);
                              const updatedProperty = {
                                ...property,
                                tenants: updatedTenants
                              };
                              onUpdate(property.id, updatedProperty);
                            }
                          }}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center gap-1"
                          title="Remove tenant"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <div className="text-sm">No tenant data available</div>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

export default function DataPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const properties = useProperties(); // Get properties from context
  const { updateProperty } = usePropertyContext();
  const { currentAccountId, refreshAccounts } = useAccount();
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [selectedPropertyForExpense, setSelectedPropertyForExpense] = useState(null);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [selectedPropertyForTenant, setSelectedPropertyForTenant] = useState(null);

  const handlePropertyUpdate = async (propertyId, updatedData) => {
    try {
      // Normalize purchaseDate to YYYY-MM-DD format
      let normalizedPurchaseDate = null;
      if (updatedData.purchaseDate) {
        const formatted = formatDateOnly(updatedData.purchaseDate);
        // Only set if it's a valid date format (not "N/A")
        if (formatted !== "N/A" && /^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
          normalizedPurchaseDate = formatted;
        }
      }

      // Prepare the data for the API - map frontend structure to API schema
      const apiData = {
        nickname: updatedData.name || updatedData.nickname,
        address: updatedData.address,
        purchasePrice: updatedData.purchasePrice,
        purchaseDate: normalizedPurchaseDate,
        closingCosts: updatedData.closingCosts,
        renovationCosts: updatedData.renovationCosts,
        initialRenovations: updatedData.initialRenovations,
        currentMarketValue: updatedData.currentMarketValue || updatedData.currentValue,
        yearBuilt: updatedData.yearBuilt,
        propertyType: updatedData.propertyType || updatedData.type,
        size: updatedData.size || updatedData.squareFootage,
        unitConfig: updatedData.unitConfig,
        propertyData: {
          // Preserve existing property_data fields first
          ...(updatedData.propertyData || {}),
          // Override with updated values
          rent: updatedData.rent,
          mortgage: updatedData.mortgage,
          monthlyExpenses: updatedData.monthlyExpenses,
          tenants: updatedData.tenants,
          expenseHistory: updatedData.expenseHistory,
          bedrooms: updatedData.bedrooms,
          bathrooms: updatedData.bathrooms,
          dens: updatedData.dens,
          units: updatedData.units,
          isPrincipalResidence: updatedData.isPrincipalResidence || false,
          ownership: updatedData.ownership || updatedData.propertyData?.ownership || null,
          // Ensure expenseForecastModes is always included (even if empty object)
          expenseForecastModes: updatedData.propertyData?.expenseForecastModes || {},
        }
      };

      // Save to API
      const response = await apiClient.updateProperty(propertyId, apiData);
      
      if (response.success && response.data) {
        // Use the API response data to update local state - it has the correct format from the database
        // Map the API response (snake_case) to frontend format (camelCase)
        const apiProperty = response.data;
        const apiPropertyData = apiProperty.property_data || {};
        // Use API response as source of truth - it contains the exact data as saved in the database
        const mappedProperty = {
          ...updatedData,
          // Override with API response values to ensure consistency (API response is source of truth)
          nickname: apiProperty.nickname || updatedData.name || updatedData.nickname,
          address: apiProperty.address || updatedData.address,
          purchasePrice: parseFloat(apiProperty.purchase_price || 0) || updatedData.purchasePrice,
          purchaseDate: apiProperty.purchase_date || normalizedPurchaseDate || updatedData.purchaseDate,
          closingCosts: parseFloat(apiProperty.closing_costs || 0) || updatedData.closingCosts,
          renovationCosts: parseFloat(apiProperty.renovation_costs || 0) || updatedData.renovationCosts,
          initialRenovations: parseFloat(apiProperty.initial_renovations || 0) || updatedData.initialRenovations,
          currentMarketValue: parseFloat(apiProperty.current_market_value || 0) || updatedData.currentMarketValue || updatedData.currentValue,
          yearBuilt: apiProperty.year_built || updatedData.yearBuilt,
          propertyType: apiProperty.property_type || updatedData.propertyType || updatedData.type,
          size: parseFloat(apiProperty.size || 0) || updatedData.size || updatedData.squareFootage,
          unitConfig: apiProperty.unit_config || updatedData.unitConfig,
          // Use API response property_data as source of truth - contains all saved fields
          propertyData: apiPropertyData,
          // Extract key fields from property_data for easy access (using API response values)
          bedrooms: apiPropertyData.bedrooms,
          bathrooms: apiPropertyData.bathrooms,
          dens: apiPropertyData.dens,
          units: apiPropertyData.units,
          isPrincipalResidence: apiPropertyData.isPrincipalResidence,
          ownership: apiPropertyData.ownership,
          imageUrl: apiPropertyData.imageUrl || (apiProperty.nickname ? `/images/${apiProperty.nickname}.png` : null),
          rent: apiPropertyData.rent || updatedData.rent,
          mortgage: apiPropertyData.mortgage || updatedData.mortgage,
          monthlyExpenses: apiPropertyData.monthlyExpenses || updatedData.monthlyExpenses,
          tenants: apiPropertyData.tenants || updatedData.tenants,
          expenseHistory: apiPropertyData.expenseHistory || updatedData.expenseHistory,
        };
        // Skip save since we already saved via API - this prevents a reload that would overwrite our changes
        updateProperty(propertyId, mappedProperty, true);
        addToast("Property updated successfully!", { type: "success" });
      } else {
        throw new Error(response.error || "Failed to update property");
      }
    } catch (error) {
      console.error("Failed to update property", error);
      addToast(`Failed to update property: ${error.message}`, { type: "error" });
    }
  };


  return (
    <RequireAuth>
      <Layout>
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Property Data</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                View and manage comprehensive property information and financial details.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsExcelModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
          </div>

          {/* Property Cards Grid */}
          {properties && properties.length > 0 ? (
            <div className="space-y-6">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onUpdate={handlePropertyUpdate}
                  onAddExpense={(property) => {
                    setSelectedPropertyForExpense(property);
                    setShowAddExpenseModal(true);
                  }}
                  onAddTenant={(property) => {
                    setSelectedPropertyForTenant(property);
                    setShowAddTenantModal(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No properties found. Add properties on the My Properties page.
              </p>
              <Button
                onClick={() => window.location.href = '/my-properties'}
                className="flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Go to My Properties
              </Button>
            </div>
          )}

          {/* Excel Export Modal */}
          {isExcelModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Export to Excel
                  </h2>
                  <button
                    onClick={() => setIsExcelModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Export Property Data</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Download your property data as an Excel file. To add new properties, please use the My Properties page.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        // Export current properties to Excel
                        const exportData = properties.map(property => ({
                          name: property.name || property.nickname,
                          address: property.address,
                          propertyType: property.propertyType || property.type,
                          purchasePrice: property.purchasePrice,
                          purchaseDate: property.purchaseDate,
                          currentMarketValue: property.currentMarketValue || property.currentValue,
                          yearBuilt: property.yearBuilt,
                          size: property.size || property.squareFootage,
                          unitConfig: property.unitConfig,
                          monthlyRent: property.rent?.monthlyRent || 0,
                          // Add other fields as needed
                        }));

                        const ws = XLSX.utils.json_to_sheet(exportData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Properties");
                        XLSX.writeFile(wb, `property_data_export_${new Date().toISOString().split('T')[0]}.xlsx`);
                        addToast("Property data exported successfully!", { type: "success" });
                        setIsExcelModalOpen(false);
                      }}
                      className="flex items-center gap-2 w-full"
                    >
                      <Download className="w-4 h-4" />
                      Export Properties
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>• Exports all current property data</p>
                    <p>• File will be downloaded to your device</p>
                    <p>• To add new properties, visit the My Properties page</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Expense Modal */}
          {showAddExpenseModal && selectedPropertyForExpense && (
            <AddExpenseModal
              property={selectedPropertyForExpense}
              onClose={() => {
                setShowAddExpenseModal(false);
                setSelectedPropertyForExpense(null);
              }}
              onSave={async (expenseData) => {
                try {
                  const response = await apiClient.createExpense(selectedPropertyForExpense.id, expenseData);
                  if (response.success) {
                    addToast("Expense added successfully!", { type: "success" });
                    // Refresh properties to show new expense
                    await refreshAccounts();
                    setShowAddExpenseModal(false);
                    setSelectedPropertyForExpense(null);
                  } else {
                    throw new Error(response.error || "Failed to add expense");
                  }
                } catch (error) {
                  console.error("Error adding expense:", error);
                  addToast(error.message || "Failed to add expense", { type: "error" });
                }
              }}
            />
          )}

          {/* Add Tenant Modal */}
          {showAddTenantModal && selectedPropertyForTenant && (
            <AddTenantModal
              property={selectedPropertyForTenant}
              onClose={() => {
                setShowAddTenantModal(false);
                setSelectedPropertyForTenant(null);
              }}
              onSave={async (tenantData) => {
                try {
                  // Add tenant to property's tenants array
                  const updatedTenants = [
                    ...(selectedPropertyForTenant.tenants || []),
                    tenantData
                  ];
                  const updatedProperty = {
                    ...selectedPropertyForTenant,
                    tenants: updatedTenants
                  };
                  await handlePropertyUpdate(selectedPropertyForTenant.id, updatedProperty);
                  setShowAddTenantModal(false);
                  setSelectedPropertyForTenant(null);
                } catch (error) {
                  console.error("Error adding tenant:", error);
                  addToast(error.message || "Failed to add tenant", { type: "error" });
                }
              }}
            />
          )}
        </div>
      </Layout>
    </RequireAuth>
  );
}

// Add Expense Modal Component
function AddExpenseModal({ property, onClose, onSave }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    description: '',
    paymentFrequency: 'Annual'
  });

  const expenseCategories = [
    'Advertising',
    'Insurance',
    'Interest & Bank Charges',
    'Office Expenses',
    'Professional Fees',
    'Management & Administration',
    'Repairs & Maintenance',
    'Salaries, Wages, and Benefits',
    'Property Taxes',
    'Travel',
    'Utilities',
    'Motor Vehicle Expenses',
    'Other Expenses',
    'Condo Maintenance Fees',
    'Mortgage (Principal)'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return;
    }
    onSave({
      date: formData.date,
      amount: parseFloat(formData.amount),
      category: formData.category || null,
      description: formData.description || null,
      expenseData: {
        paymentFrequency: formData.paymentFrequency
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Expense - {property.name || property.nickname}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              You can select any date, including past dates for historical expenses
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Select category (optional)</option>
              {expenseCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Frequency
            </label>
            <select
              value={formData.paymentFrequency}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentFrequency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="Monthly">Monthly</option>
              <option value="Annual">Annual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Expense
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Tenant Modal Component
function AddTenantModal({ property, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    leaseStart: new Date().toISOString().split('T')[0],
    leaseEnd: '',
    rent: '',
    status: 'Active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.rent) {
      return;
    }
    onSave({
      name: formData.name,
      unit: formData.unit || null,
      leaseStart: formData.leaseStart,
      leaseEnd: formData.leaseEnd || 'Active',
      rent: parseFloat(formData.rent) || 0,
      status: formData.status
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Tenant - {property.name || property.nickname}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tenant Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Unit
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Unit number or identifier"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lease Start *
              </label>
              <input
                type="date"
                value={formData.leaseStart}
                onChange={(e) => setFormData(prev => ({ ...prev, leaseStart: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lease End
              </label>
              <input
                type="date"
                value={formData.leaseEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, leaseEnd: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Leave empty for active"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monthly Rent *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.rent}
              onChange={(e) => setFormData(prev => ({ ...prev, rent: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Past">Past</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Tenant
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}



