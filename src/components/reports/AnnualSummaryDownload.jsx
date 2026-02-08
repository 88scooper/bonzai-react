"use client";

import { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useAccount } from '@/context/AccountContext';
import { exportAnnualSummaryAsExcel } from '@/utils/annualSummaryExport';
import { useToast } from '@/context/ToastContext';

export default function AnnualSummaryDownload() {
  const { currentAccount } = useAccount();
  // Default to previous year (tax year is typically the previous calendar year)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [isLoading, setIsLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const { addToast } = useToast();

  // Generate available years (previous year and past 5 years)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Include previous year and past 5 years
    for (let i = 0; i <= 5; i++) {
      years.push(currentYear - 1 - i);
    }
    setAvailableYears(years);
  }, []);

  const handleDownload = async () => {
    if (!currentAccount?.id) {
      addToast('Please select an account', { type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      // Fetch annual summary data from API
      const response = await fetch(
        `/api/reports/annual-summary?year=${selectedYear}&accountId=${currentAccount.id}`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch annual summary data');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate summary');
      }

      const apiData = result.data;

      // Check for pro-forma warning
      if (!apiData.hasActualData) {
        const proceed = window.confirm(
          'Warning: This summary is based on estimated values, not actual transactions. ' +
          'For tax purposes, ensure you have actual expense records. Continue?'
        );
        if (!proceed) {
          setIsLoading(false);
          return;
        }
      }

      // Export as Excel (default format)
      exportAnnualSummaryAsExcel(apiData, selectedYear);
      addToast('Annual summary exported as Excel', { type: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      addToast(error.message || 'Failed to export annual summary', { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#0f172a] mb-6">
      <div className="flex items-center justify-between gap-6">
        {/* Title - Left */}
        <h2 className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
          Tax-Ready Portfolio Summary
        </h2>

      {/* Year Selector - Middle */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          TAX YEAR
        </label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-700 text-sm font-medium
                   focus:outline-none focus:ring-2 focus:ring-[#205A3E] focus:border-transparent
                   dark:text-gray-200"
          disabled={isLoading}
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Download Button - Right */}
      <button
        onClick={handleDownload}
        disabled={isLoading || !currentAccount?.id}
        className="px-6 py-2.5 bg-[#205A3E] hover:bg-[#1a4730] text-white 
                 rounded-lg font-semibold text-sm
                 flex items-center gap-2
                 transition-colors duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed
                 shadow-sm hover:shadow-md"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Download Report
          </>
        )}
      </button>
      </div>
    </div>
  );
}
