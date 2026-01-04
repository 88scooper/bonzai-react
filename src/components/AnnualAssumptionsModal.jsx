"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, TrendingUp } from "lucide-react";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { useProperties } from "@/context/PropertyContext";
import { formatCurrency } from "@/utils/formatting";

export default function AnnualAssumptionsModal({ isOpen, onClose, currentYear }) {
  const { addToast } = useToast();
  const properties = useProperties();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    propertyValueChange: '',
    rentChange: '',
    expenseChange: ''
  });
  const [unitValues, setUnitValues] = useState({});
  const [baseUnitValues, setBaseUnitValues] = useState({});
  
  // Load saved assumptions when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedAssumptions = localStorage.getItem(`annualAssumptions_${currentYear}`);
      if (savedAssumptions) {
        try {
          const parsed = JSON.parse(savedAssumptions);
          setFormData({
            propertyValueChange: parsed.propertyValueChange?.toString() || '',
            rentChange: parsed.rentChange?.toString() || '',
            expenseChange: parsed.expenseChange?.toString() || ''
          });
        } catch (e) {
          console.error("Error parsing saved assumptions:", e);
        }
      }
    }
  }, [isOpen, currentYear]);

  // Initialize unit values when modal opens
  useEffect(() => {
    if (isOpen && properties.length > 0) {
      // Calculate base unit values from properties
      const baseValues = {};
      properties.forEach(property => {
        const numUnits = property.units || 1;
        const propertyValue = property.currentMarketValue || property.currentValue || 0;
        const unitValue = numUnits > 0 ? propertyValue / numUnits : propertyValue;
        
        for (let i = 0; i < numUnits; i++) {
          const unitKey = `${property.id}_unit_${i + 1}`;
          baseValues[unitKey] = unitValue;
        }
      });
      setBaseUnitValues(baseValues);
      
      // Load saved unit values or use base values
      const savedUnitValues = localStorage.getItem(`unitValues_${currentYear}`);
      if (savedUnitValues) {
        try {
          const parsed = JSON.parse(savedUnitValues);
          // Verify all properties have unit values, if not, use base values
          const allUnitKeys = {};
          properties.forEach(property => {
            const numUnits = property.units || 1;
            for (let i = 0; i < numUnits; i++) {
              const unitKey = `${property.id}_unit_${i + 1}`;
              allUnitKeys[unitKey] = parsed[unitKey] !== undefined 
                ? parsed[unitKey] 
                : baseValues[unitKey];
            }
          });
          setUnitValues(allUnitKeys);
        } catch (e) {
          console.error("Error parsing saved unit values:", e);
          setUnitValues(baseValues);
        }
      } else {
        setUnitValues(baseValues);
      }
      
      // Reset the ref when modal opens
      prevPropertyValueChangeRef.current = '';
    }
  }, [isOpen, properties, currentYear]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, loading, onClose]);

  // Track previous property value change to detect when it actually changes
  const prevPropertyValueChangeRef = useRef('');
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Allow negative numbers, decimals, and empty string
    if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
      const prevValue = formData[name];
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // If property value change % changed and is valid, apply it to base unit values
      if (name === 'propertyValueChange' && value !== '' && value !== '-' && value !== prevValue) {
        const percentageChange = parseFloat(value);
        if (!isNaN(percentageChange) && prevPropertyValueChangeRef.current !== value && Object.keys(baseUnitValues).length > 0) {
          prevPropertyValueChangeRef.current = value;
          const multiplier = 1 + (percentageChange / 100);
          const updatedValues = {};
          Object.keys(baseUnitValues).forEach(key => {
            updatedValues[key] = baseUnitValues[key] * multiplier;
          });
          setUnitValues(updatedValues);
        }
      }
    }
  };

  const handleUnitValueChange = (unitKey, value) => {
    // Allow numbers, decimals, commas, and empty string
    const cleanedValue = value.replace(/,/g, '');
    if (cleanedValue === '' || cleanedValue === '-' || /^-?\d*\.?\d*$/.test(cleanedValue)) {
      setUnitValues(prev => ({
        ...prev,
        [unitKey]: cleanedValue === '' || cleanedValue === '-' ? 0 : parseFloat(cleanedValue) || 0
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that all fields are filled
    if (formData.propertyValueChange === '' || 
        formData.rentChange === '' || 
        formData.expenseChange === '') {
      addToast("Please fill in all assumption fields.", { type: "error" });
      return;
    }

    const propertyValueChange = parseFloat(formData.propertyValueChange);
    const rentChange = parseFloat(formData.rentChange);
    const expenseChange = parseFloat(formData.expenseChange);

    // Validate that values are numbers
    if (isNaN(propertyValueChange) || isNaN(rentChange) || isNaN(expenseChange)) {
      addToast("Please enter valid numbers for all assumptions.", { type: "error" });
      return;
    }

    setLoading(true);
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
      
      // Store unit values
      localStorage.setItem(`unitValues_${currentYear}`, JSON.stringify(unitValues));
      
      // Mark this year as reviewed
      const reviewedYears = JSON.parse(localStorage.getItem('annualAssumptionsReviewedYears') || '[]');
      if (!reviewedYears.includes(currentYear)) {
        reviewedYears.push(currentYear);
        localStorage.setItem('annualAssumptionsReviewedYears', JSON.stringify(reviewedYears));
      }
      
      addToast("Annual assumptions saved successfully!", { type: "success" });
      onClose();
    } catch (error) {
      console.error("Error saving assumptions:", error);
      addToast("Failed to save assumptions. Please try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Render using portal to document body
  if (typeof window === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        // Prevent closing on background click - user must submit or use X button
        e.stopPropagation();
      }}
    >
      <div
        className="bg-white dark:bg-neutral-950 rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden flex flex-col border border-black/10 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#205A3E]/10 dark:bg-[#205A3E]/20">
              <TrendingUp className="w-5 h-5 text-[#205A3E] dark:text-[#66B894]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Review {currentYear} Assumptions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Update your key financial assumptions for the year
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                Please review and update your key assumptions for {currentYear}. These values will be used in your financial projections and calculations.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="propertyValueChange" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Property Value Change (%)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="propertyValueChange"
                    name="propertyValueChange"
                    value={formData.propertyValueChange}
                    onChange={handleInputChange}
                    placeholder="e.g., 3.5"
                    required
                    className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-4 py-2.5 pr-8 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                    %
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Expected annual change in property values (can be positive or negative)
                </p>
                
                {/* Unit Values List */}
                {properties.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Current Estimated Property Values
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-black/10 dark:border-white/10 rounded-md p-3 bg-gray-50/50 dark:bg-neutral-900/50">
                      {properties.map(property => {
                        const numUnits = property.units || 1;
                        const propertyName = property.nickname || property.name || property.address || 'Unnamed Property';
                        
                        return (
                          <div key={property.id} className="space-y-2">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {propertyName}
                              {numUnits > 1 && ` (${numUnits} units)`}
                            </p>
                            {Array.from({ length: numUnits }, (_, i) => {
                              const unitIndex = i + 1;
                              const unitKey = `${property.id}_unit_${unitIndex}`;
                              const unitValue = unitValues[unitKey] || 0;
                              
                              return (
                                <div key={unitKey} className="flex items-center gap-2 pl-3">
                                  <label className="text-xs text-gray-600 dark:text-gray-400 min-w-[60px]">
                                    {numUnits > 1 ? `Unit ${unitIndex}:` : 'Value:'}
                                  </label>
                                  <div className="relative flex-1">
                                    <input
                                      type="text"
                                      value={typeof unitValue === 'number' ? unitValue.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : unitValue}
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/,/g, '');
                                        handleUnitValueChange(unitKey, value);
                                      }}
                                      className="w-full rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-neutral-950 px-2.5 py-1.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs">
                                      $
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="rentChange" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Rent Change (%)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="rentChange"
                    name="rentChange"
                    value={formData.rentChange}
                    onChange={handleInputChange}
                    placeholder="e.g., 2.5"
                    required
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
                <label htmlFor="expenseChange" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Expense Change (%)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="expenseChange"
                    name="expenseChange"
                    value={formData.expenseChange}
                    onChange={handleInputChange}
                    placeholder="e.g., 2.0"
                    required
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
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-black/10 dark:border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
            >
              Save Assumptions
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

