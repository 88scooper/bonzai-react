"use client";

import { useMemo, useState, useRef } from 'react';
import { formatCurrency, formatPercentage } from '@/utils/formatting';
import { calculateYoYMetrics } from '@/lib/sensitivity-analysis';
import { TrendingUp, ChevronDown } from 'lucide-react';

/**
 * YoY Analysis Component
 * 
 * Displays year-over-year performance metrics for property analysis
 * Shows historical trends and projected YoY changes based on sensitivity assumptions
 */
export default function YoYAnalysis({ property, assumptions, baselineAssumptions }) {
  const [isOpen, setIsOpen] = useState(true);
  const dropdownRef = useRef(null);

  // Calculate YoY metrics using the improved function
  const yoyMetrics = useMemo(() => {
    if (!property) return null;
    return calculateYoYMetrics(property, assumptions, baselineAssumptions);
  }, [property, assumptions, baselineAssumptions]);

  if (!yoyMetrics) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          disabled
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-start">
              <span className="font-semibold text-gray-900 dark:text-white">
                Year-over-Year Analysis
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const previousYear = currentYear - 1;
                  return `${currentYear} vs ${previousYear}`;
                })()}
              </span>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="px-4 pb-4">
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <div className="text-sm">No property selected for analysis</div>
        </div>
          </div>
        )}
      </div>
    );
  }

  const { 
    historical, 
    projected, 
    baselineProjected, 
    hasHistoricalData, 
    dataRequirement,
    warningMessage,
    reasonInsufficient,
    dataQuality,
    currentYearValidation,
    previousYearValidation
  } = yoyMetrics;

  // Determine warning severity and styling
  const getWarningStyle = () => {
    switch (dataQuality) {
      case 'insufficient':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'partial':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';
      case 'projected':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
      default:
        return '';
    }
  };

  const getWarningIcon = () => {
    switch (dataQuality) {
      case 'insufficient':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'partial':
      case 'projected':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-black/10 dark:border-white/10 shadow-sm" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <div className="flex flex-col items-start">
            <span className="font-semibold text-gray-900 dark:text-white">
              Year-over-Year Analysis
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {(() => {
                const currentYear = new Date().getFullYear();
                const previousYear = currentYear - 1;
                return `${currentYear} vs ${previousYear}`;
              })()}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="px-4 pb-6 pt-2">
      {/* Data Quality Warning */}
      {warningMessage && (
        <div className={`mb-4 rounded-xl border p-4 ${getWarningStyle()}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getWarningIcon()}
            </div>
            <div className="flex-1">
              <div className="font-medium mb-1">
                {dataQuality === 'insufficient' && 'Insufficient Data'}
                {dataQuality === 'partial' && 'Incomplete Year Data'}
                {dataQuality === 'projected' && 'Projected Values'}
              </div>
              <div className="text-sm opacity-90">
                {warningMessage}
              </div>
              {reasonInsufficient && (
                <div className="mt-2 text-xs opacity-75">
                  {reasonInsufficient === 'missing_prior_year' && 
                    'Recommendation: Add complete expense history for prior year to enable YoY analysis.'}
                  {reasonInsufficient === 'incomplete_prior_year' && 
                    'Recommendation: Complete prior year expense data to ensure accurate comparisons.'}
                  {reasonInsufficient === 'incomplete_current_year' && 
                    `Current year progress: ${currentYearValidation?.monthsElapsed || 0}/12 months. Projections will improve as more data becomes available.`}
                  {reasonInsufficient === 'projected_prior_year' && 
                    'Historical YoY analysis requires actual results, not projections.'}
                  {reasonInsufficient === 'projected_current_year' && 
                    'Current year contains projected values. Historical comparisons may be less reliable.'}
                  {reasonInsufficient === 'missing_current_year' && 
                    'Recommendation: Add current year expense history to calculate YoY metrics.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Historical YoY Performance */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Historical Performance
          {!dataRequirement?.meetsFullPriorYearRequirement && (
            <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
              (Requires complete prior year - {previousYearValidation?.isComplete ? 'available' : 'incomplete'})
            </span>
          )}
        </h4>
        
        {dataRequirement?.meetsRequirement ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Revenue Growth</div>
              <div className={`text-sm font-medium ${
                historical.revenue === null 
                  ? 'text-gray-400' 
                  : historical.revenue >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
              }`}>
                {historical.revenue === null 
                  ? 'N/A' 
                  : `${historical.revenue >= 0 ? '+' : ''}${historical.revenue.toFixed(1)}%`
                }
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expense Growth</div>
              <div className={`text-sm font-medium ${
                historical.expenses === null 
                  ? 'text-gray-400' 
                  : historical.expenses >= 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {historical.expenses === null 
                  ? 'N/A' 
                  : `${historical.expenses >= 0 ? '+' : ''}${historical.expenses.toFixed(1)}%`
                }
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cash Flow Growth</div>
              <div className={`text-sm font-medium ${
                historical.cashFlow === null 
                  ? 'text-gray-400' 
                  : historical.cashFlow >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
              }`}>
                {historical.cashFlow === null 
                  ? 'N/A' 
                  : `${historical.cashFlow >= 0 ? '+' : ''}${historical.cashFlow.toFixed(1)}%`
                }
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Insufficient Historical Data
              </span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
              Historical YoY analysis requires a complete prior year and current year data. 
              {!dataRequirement?.meetsFullPriorYearRequirement && (
                <span> Prior year ({previousYearValidation?.reason || 'unknown'}) is incomplete.</span>
              )}
              {!yoyMetrics?.hasCurrentYearData && (
                <span> Current year data is unavailable.</span>
              )}
            </p>
            {previousYearValidation?.message && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {previousYearValidation.message}
              </p>
            )}
            {currentYearValidation?.message && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {currentYearValidation.message}
              </p>
            )}
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
              Projected YoY analysis is still available below.
            </p>
          </div>
        )}
      </div>

      {/* Projected YoY Performance */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Projected Next Year Performance</h4>
        <div className="space-y-4">
          {/* Revenue Growth */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Revenue Growth</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Baseline: {baselineProjected.revenue >= 0 ? '+' : ''}{baselineProjected.revenue.toFixed(1)}%
              </div>
              <div className={`text-sm font-medium ${
                projected.revenue >= baselineProjected.revenue 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {projected.revenue >= 0 ? '+' : ''}{projected.revenue.toFixed(1)}%
              </div>
              <div className={`text-xs px-2 py-1 rounded ${
                projected.revenue >= baselineProjected.revenue 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {projected.revenue >= baselineProjected.revenue ? '↗' : '↘'} 
                {Math.abs(projected.revenue - baselineProjected.revenue).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Expense Growth */}
          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Expense Growth</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Baseline: {baselineProjected.expenses >= 0 ? '+' : ''}{baselineProjected.expenses.toFixed(1)}%
              </div>
              <div className={`text-sm font-medium ${
                projected.expenses <= baselineProjected.expenses 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {projected.expenses >= 0 ? '+' : ''}{projected.expenses.toFixed(1)}%
              </div>
              <div className={`text-xs px-2 py-1 rounded ${
                projected.expenses <= baselineProjected.expenses 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {projected.expenses <= baselineProjected.expenses ? '↘' : '↗'} 
                {Math.abs(projected.expenses - baselineProjected.expenses).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Cash Flow Growth */}
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cash Flow Growth</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Baseline: {baselineProjected.cashFlow >= 0 ? '+' : ''}{baselineProjected.cashFlow.toFixed(1)}%
              </div>
              <div className={`text-sm font-medium ${
                projected.cashFlow >= baselineProjected.cashFlow 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {projected.cashFlow >= 0 ? '+' : ''}{projected.cashFlow.toFixed(1)}%
              </div>
              <div className={`text-xs px-2 py-1 rounded ${
                projected.cashFlow >= baselineProjected.cashFlow 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {projected.cashFlow >= baselineProjected.cashFlow ? '↗' : '↘'} 
                {Math.abs(projected.cashFlow - baselineProjected.cashFlow).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Insights</h4>
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          {projected.revenue > baselineProjected.revenue && (
            <div>• Higher rent growth assumptions will increase revenue by {Math.abs(projected.revenue - baselineProjected.revenue).toFixed(1)}% more than baseline</div>
          )}
          {projected.expenses < baselineProjected.expenses && (
            <div>• Lower expense inflation assumptions will reduce expense growth by {Math.abs(projected.expenses - baselineProjected.expenses).toFixed(1)}% vs baseline</div>
          )}
          {projected.cashFlow > baselineProjected.cashFlow && (
            <div>• Combined assumptions project {Math.abs(projected.cashFlow - baselineProjected.cashFlow).toFixed(1)}% higher cash flow growth than baseline</div>
          )}
          {!dataRequirement?.meetsRequirement && (
            <div>
              • Historical YoY analysis requires a complete prior year and current year data. 
              {!dataRequirement?.meetsFullPriorYearRequirement && (
                <span> Prior year validation: {previousYearValidation?.message || 'incomplete'}.</span>
              )}
              {currentYearValidation?.isPartial && (
                <span> Current year: {currentYearValidation.monthsElapsed}/12 months ({currentYearValidation.expenseMonthsFound} months of expense data).</span>
              )}
              Projections based on current assumptions.
            </div>
          )}
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
