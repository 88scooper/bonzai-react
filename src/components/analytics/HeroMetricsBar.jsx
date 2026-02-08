"use client";

import { useState } from "react";
import { formatCurrency, formatPercentage } from "@/utils/formatting";
import { HelpCircle } from "lucide-react";

export default function HeroMetricsBar({
  irr,
  totalProfit,
  averageAnnualEquityBuilt,
  forecastOutcomes,
  summaryText,
  showGhostMode,
  onToggleGhostMode,
  baselineSnapshotName,
}) {
  const [showTooltip, setShowTooltip] = useState(null);

  // Helper to determine value styling
  // IRR: red only if negative
  // Cash Flow & Total Profit: red if negative
  const getIRRClassName = (value) => {
    const baseClass = "text-2xl font-bold tabular-nums";
    return value < 0 
      ? `${baseClass} text-red-600 dark:text-red-500` 
      : `${baseClass} text-slate-900 dark:text-slate-100`;
  };

  const getCashFlowClassName = (value) => {
    const baseClass = "text-2xl font-bold tabular-nums";
    return value < 0 
      ? `${baseClass} text-red-600 dark:text-red-500` 
      : `${baseClass} text-slate-900 dark:text-slate-100`;
  };

  const getProfitClassName = (value) => {
    const baseClass = "text-2xl font-bold tabular-nums";
    return value < 0 
      ? `${baseClass} text-red-600 dark:text-red-500` 
      : `${baseClass} text-slate-900 dark:text-slate-100`;
  };

  // Equity built is always positive, so no conditional needed
  const equityClassName = "text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100";

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-8 py-4">
      <div className="flex items-start justify-between">
        {/* Left: Primary Metrics + Summary Text */}
        <div className="flex-1">
          <div className="flex items-center gap-12">
            {/* IRR */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
                  IRR
                </div>
                <div className="relative inline-block">
                  <HelpCircle
                    className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-help hover:text-gray-600 dark:hover:text-gray-400"
                    onMouseEnter={() => setShowTooltip('irr')}
                    onMouseLeave={() => setShowTooltip(null)}
                  />
                  {showTooltip === 'irr' && (
                    <div className="absolute left-5 top-0 z-50 w-64 p-2.5 bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 text-xs rounded-md shadow-xl">
                      IRR shows your annualized return percentage over the holding period. It accounts for when money comes in and goes out, giving you a single number to compare investments. A 7% IRR means your investment effectively grows at 7% per year.
                      <div className="absolute left-0 top-2 -ml-1.5 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900 dark:border-r-gray-800"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className={getIRRClassName(irr)}>
                {formatPercentage(irr)}
              </div>
            </div>

            {/* Total Profit */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
                  TOTAL PROFIT
                </div>
                <div className="relative inline-block">
                  <HelpCircle
                    className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-help hover:text-gray-600 dark:hover:text-gray-400"
                    onMouseEnter={() => setShowTooltip('profit')}
                    onMouseLeave={() => setShowTooltip(null)}
                  />
                  {showTooltip === 'profit' && (
                    <div className="absolute left-5 top-0 z-50 w-64 p-2.5 bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 text-xs rounded-md shadow-xl">
                      Total Profit shows how much money you'll make if you sell the property at the end of the analysis period. It includes all the cash flow you received over the years plus the profit from selling (property value minus remaining mortgage and selling costs), minus your initial investment.
                      <div className="absolute left-0 top-2 -ml-1.5 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900 dark:border-r-gray-800"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className={getProfitClassName(totalProfit)}>
                {formatCurrency(totalProfit)}
              </div>
            </div>

            {/* Avg Annual Equity Built */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
                  AVG ANNUAL EQUITY BUILT
                </div>
                <div className="relative inline-block">
                  <HelpCircle
                    className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-help hover:text-gray-600 dark:hover:text-gray-400"
                    onMouseEnter={() => setShowTooltip('equity')}
                    onMouseLeave={() => setShowTooltip(null)}
                  />
                  {showTooltip === 'equity' && (
                    <div className="absolute left-5 top-0 z-50 w-64 p-2.5 bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 text-xs rounded-md shadow-xl">
                      Average Annual Equity Built shows how much equity you gain each year on average from both property appreciation and mortgage principal paydown. This represents the portion of your wealth building that comes from equity growth, separate from cash flow.
                      <div className="absolute left-0 top-2 -ml-1.5 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900 dark:border-r-gray-800"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className={equityClassName}>
                {formatCurrency(averageAnnualEquityBuilt)}
              </div>
            </div>
          </div>

          {/* Summary Text */}
          {summaryText && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic">
              {summaryText}
            </p>
          )}
        </div>

        {/* Right: Forecast Outcomes Cluster */}
        {forecastOutcomes && (
          <>
            {/* Vertical Divider */}
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-6" />
            
            <div className="flex items-center gap-6 bg-[#205A3E]/5 dark:bg-[#205A3E]/10 px-6 py-3 rounded-lg">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500 mb-1">
                  YEAR 1 CASH FLOW
                </div>
                <div className={getCashFlowClassName(forecastOutcomes.year1CashFlow)}>
                  {formatCurrency(forecastOutcomes.year1CashFlow)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500 mb-1">
                  YEAR 10 CASH FLOW
                </div>
                <div className={getCashFlowClassName(forecastOutcomes.year10CashFlow)}>
                  {formatCurrency(forecastOutcomes.year10CashFlow)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500 mb-1">
                  10-YEAR TOTAL
                </div>
                <div className={getCashFlowClassName(forecastOutcomes.tenYearTotal)}>
                  {formatCurrency(forecastOutcomes.tenYearTotal)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Baseline indicator (if active) */}
        {showGhostMode && baselineSnapshotName && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 ml-6">
            <span>Baseline: {baselineSnapshotName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
