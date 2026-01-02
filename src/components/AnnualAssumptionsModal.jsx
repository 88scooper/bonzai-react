"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, TrendingUp } from "lucide-react";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";

export default function AnnualAssumptionsModal({ isOpen, onClose, currentYear }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    propertyValueChange: '',
    rentChange: '',
    expenseChange: ''
  });

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Allow negative numbers, decimals, and empty string
    if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({
        ...prev,
        [name]: value
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

