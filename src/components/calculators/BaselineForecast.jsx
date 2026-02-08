"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { formatCurrency } from '@/utils/formatting';
import { generateForecast, formatForecastForChart } from '@/lib/sensitivity-analysis';
import { Check, TrendingUp, TrendingDown, Download, FileImage, FileText, FileSpreadsheet, ChevronDown, LineChart as LineChartIcon } from 'lucide-react';
import ChartSkeleton from '@/components/analytics/ChartSkeleton';
import { exportChartAsPNG, exportChartAsPDF, exportChartAsCSV, generateFilename } from '@/utils/chartExport';
import { useToast } from '@/context/ToastContext';

const BaselineForecast = ({ property, assumptions, years = 10, baselineData = null, showBaseline = false }) => {
  // State for toggleable metrics
  const [visibleMetrics, setVisibleMetrics] = useState({
    netCashFlow: true,        // Always visible by default
    operatingIncome: false,   // Toggleable
    operatingExpenses: false, // Toggleable
    noi: false,              // Toggleable
    debtService: false,      // Toggleable
    mortgageBalance: false,  // Optional context
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [forecastData, setForecastData] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const chartRef = useRef(null);
  const exportMenuRef = useRef(null);
  const { addToast } = useToast();

  // Generate forecast data with loading state
  useEffect(() => {
    if (!property) {
      setForecastData([]);
      return;
    }

    setIsCalculating(true);
    // Simulate calculation delay for better UX
    const timer = setTimeout(() => {
      try {
        const forecast = generateForecast(property, assumptions, years, 'cash-flow');
        const formatted = formatForecastForChart(forecast, 'cash-flow');
        setForecastData(formatted);
      } catch (error) {
        console.error('Error generating forecast:', error);
        setForecastData([]);
      } finally {
        setIsCalculating(false);
      }
    }, 100); // Small delay to show loading state

    return () => clearTimeout(timer);
  }, [property, assumptions, years]);

  // Toggle metric visibility
  const toggleMetric = (metricKey) => {
    setVisibleMetrics((prev) => {
      const newState = { ...prev, [metricKey]: !prev[metricKey] };
      // Ensure at least one metric is always visible
      const hasVisible = Object.values(newState).some((v) => v);
      if (!hasVisible) {
        return prev; // Don't allow all to be hidden
      }
      return newState;
    });
  };

  // Determine which Y-axes to show
  const showLeftAxis = visibleMetrics.netCashFlow || visibleMetrics.operatingIncome || 
                       visibleMetrics.operatingExpenses || visibleMetrics.noi || visibleMetrics.debtService;
  const showRightAxis = visibleMetrics.mortgageBalance;
  const useDualAxis = showLeftAxis && showRightAxis;

  // Custom tooltip for chart with tabular-nums - shows both current and baseline
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const baselineEntry = baselineData && showBaseline 
        ? baselineData.find(d => d.year === parseInt(label))
        : null;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-2 tabular-nums">Year {label}</p>
          {payload.map((entry, index) => {
            const baselineValue = baselineEntry?.[entry.dataKey];
            const hasBaseline = baselineValue !== undefined && baselineValue !== null;
            
            return (
              <div key={index} className="mb-1">
                <p className="text-sm tabular-nums" style={{ color: entry.color }}>
                  {entry.name}: {formatCurrency(entry.value)}
                </p>
                {hasBaseline && showBaseline && (
                  <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400 ml-2">
                    Baseline: {formatCurrency(baselineValue)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Custom legend with click handlers - show all metrics regardless of visibility
  const renderCustomLegend = () => {
    const allMetrics = [
      { key: 'netCashFlow', name: 'Net Cash Flow', color: '#10b981' }, // Lighter Green
      { key: 'operatingIncome', name: 'Operating Income', color: '#94A3B8' }, // Light Slate for baseline
      { key: 'operatingExpenses', name: 'Operating Expenses', color: '#ef4444' }, // Red for costs
      { key: 'noi', name: 'NOI', color: '#94A3B8' }, // Light Slate
      { key: 'debtService', name: 'Debt Service', color: '#ef4444' }, // Red for debt
      { key: 'mortgageBalance', name: 'Mortgage Balance', color: '#ef4444' }, // Red for debt
    ];

    return (
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        {allMetrics.map((metric) => {
          const isVisible = visibleMetrics[metric.key];
          return (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                isVisible
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'bg-transparent text-gray-400 dark:text-gray-500 opacity-50'
              } hover:bg-gray-200 dark:hover:bg-gray-600`}
            >
              <div
                className="w-4 h-0.5"
                style={{ backgroundColor: isVisible ? metric.color : '#9ca3af' }}
              />
              <span>{metric.name}</span>
              {isVisible && <Check className="w-4 h-4" />}
            </button>
          );
        })}
      </div>
    );
  };

  // Calculate insights
  const calculateInsights = () => {
    if (!forecastData || forecastData.length === 0) return [];

    const insights = [];
    const year1 = forecastData[0];
    const lastYear = forecastData[forecastData.length - 1];

    if (visibleMetrics.netCashFlow && year1 && lastYear) {
      const cumulativeCashFlow = lastYear.cumulativeCashFlow || 0;
      insights.push({
        icon: TrendingUp,
        text: `Cumulative cash flow over ${years} years: ${formatCurrency(cumulativeCashFlow)}`,
        color: 'text-green-600 dark:text-green-400',
      });

      // Calculate cash flow growth
      if (forecastData.length > 1) {
        const firstCashFlow = year1.netCashFlow || 0;
        const lastCashFlow = lastYear.netCashFlow || 0;
        if (firstCashFlow !== 0) {
          const cashFlowGrowth = ((lastCashFlow - firstCashFlow) / Math.abs(firstCashFlow)) * 100;
          const avgGrowth = cashFlowGrowth / (years - 1);
          insights.push({
            icon: TrendingUp,
            text: `Cash flow improves by ${formatCurrency(lastCashFlow - firstCashFlow)} (${avgGrowth.toFixed(1)}% per year on average)`,
            color: 'text-green-600 dark:text-green-400',
      });
        }
      }
    }

    if (visibleMetrics.operatingIncome && year1 && lastYear) {
      const firstIncome = year1.operatingIncome || 0;
      const lastIncome = lastYear.operatingIncome || 0;
      if (firstIncome > 0) {
        const incomeGrowth = ((lastIncome - firstIncome) / firstIncome) * 100;
      insights.push({
        icon: TrendingUp,
          text: `Operating income grows by ${incomeGrowth.toFixed(1)}% over ${years} years`,
        color: 'text-blue-600 dark:text-blue-400',
      });
    }
    }

    if (visibleMetrics.operatingExpenses && year1 && lastYear) {
      const firstExpenses = year1.operatingExpenses || 0;
      const lastExpenses = lastYear.operatingExpenses || 0;
      if (firstExpenses > 0) {
        const expenseGrowth = ((lastExpenses - firstExpenses) / firstExpenses) * 100;
      insights.push({
          icon: TrendingDown,
          text: `Operating expenses increase by ${expenseGrowth.toFixed(1)}% over ${years} years`,
          color: 'text-red-600 dark:text-red-400',
      });
      }
    }

    return insights;
  };

  const insights = calculateInsights();

  // Handle export
  const handleExport = async (format) => {
    if (!property || !chartRef.current) return;

    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const propertyName = property.nickname || property.name || 'property';
      const chartContainer = chartRef.current.closest('.rounded-lg');

      switch (format) {
        case 'png': {
          const filename = generateFilename(propertyName, 'baseline_forecast', 'png');
          await exportChartAsPNG(chartContainer, filename);
          addToast('Chart exported as PNG successfully');
          break;
        }
        case 'pdf': {
          const filename = generateFilename(propertyName, 'baseline_forecast', 'pdf');
          await exportChartAsPDF(chartContainer, forecastData, property, assumptions, filename);
          addToast('Chart exported as PDF successfully');
          break;
        }
        case 'csv': {
          const filename = generateFilename(propertyName, 'baseline_forecast', 'csv');
          exportChartAsCSV(forecastData, filename);
          addToast('Chart data exported as CSV successfully');
          break;
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export chart. Please try again.', { type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);


  if (!property) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-900 p-6">
        <div className="flex items-center gap-2 mb-1">
          <LineChartIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Baseline Forecast
        </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
          Select a property to view the baseline forecast.
        </p>
      </div>
    );
  }

  if (isCalculating || forecastData.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-900 p-6">
        <div className="flex items-center gap-3 mb-1">
          <LineChartIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Baseline Forecast
        </h2>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Years:
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={years}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 1 && value <= 30) {
                  setYears(value);
                }
              }}
              className="w-16 px-2 py-1 text-sm border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Most likely projection based on default assumptions. This chart shows your expected financial position over the next {years} {years === 1 ? 'year' : 'years'}.
        </p>
        <ChartSkeleton />
      </div>
    );
  }

  // Custom Y-axis tick formatter for Cash Flow axis
  const formatCashFlowTick = (value) => {
    if (value === 0) return '$0k';
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (absValue >= 1000000) {
      return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
    }
    return `${sign}$${(absValue / 1000).toFixed(0)}k`;
  };

  // Custom Y-axis tick formatter for Mortgage Balance axis
  const formatMortgageBalanceTick = (value) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}k`;
  };

  return (
    <div ref={chartRef} className="w-full">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <LineChartIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Baseline Forecast
          </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Most likely projection based on default assumptions. This chart shows your expected financial position over the next {years} {years === 1 ? 'year' : 'years'}.
          </p>
        </div>
        
        {/* Export Button */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-gray-800 shadow-lg z-50">
              <button
                onClick={() => handleExport('png')}
                disabled={isExporting}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <FileImage className="w-4 h-4" />
                Export as PNG
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                Export as PDF
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 rounded-b-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export as CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pill-shaped Toggle Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => toggleMetric('netCashFlow')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            visibleMetrics.netCashFlow
              ? 'bg-[#205A3E] text-white border-[#205A3E]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <div 
            className="w-3 h-3 rounded-full bg-[#10b981]"
          />
          {visibleMetrics.netCashFlow && <Check className="w-4 h-4" />}
          <span>Net Cash Flow</span>
        </button>
        <button
          onClick={() => toggleMetric('operatingIncome')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            visibleMetrics.operatingIncome
              ? 'bg-[#205A3E] text-white border-[#205A3E]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <div 
            className="w-3 h-3 rounded-full bg-[#94A3B8]"
          />
          {visibleMetrics.operatingIncome && <Check className="w-4 h-4" />}
          <span>Operating Income</span>
        </button>
        <button
          onClick={() => toggleMetric('operatingExpenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            visibleMetrics.operatingExpenses
              ? 'bg-[#205A3E] text-white border-[#205A3E]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <div 
            className="w-3 h-3 rounded-full bg-[#ef4444]"
          />
          {visibleMetrics.operatingExpenses && <Check className="w-4 h-4" />}
          <span>Operating Expenses</span>
        </button>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={forecastData}
            margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
          >
            {/* Grid - only horizontal lines with subtle color */}
            <CartesianGrid 
              strokeDasharray="1 3" 
              stroke="#f1f5f9" 
              horizontal={true} 
              vertical={false}
              className="dark:stroke-gray-800"
            />
            <XAxis 
              dataKey="year" 
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
              className="text-gray-600 dark:text-gray-400 tabular-nums"
              tick={{ fontSize: 10, fill: '#94a3b8', className: 'tabular-nums' }}
            />
            {showLeftAxis && (
              <YAxis
                yAxisId="left"
                width={80}
                tickFormatter={formatCashFlowTick}
                label={{ 
                  value: 'Cash Flow ($)', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 0,
                  style: { textAnchor: 'middle' }
                }}
                className="text-gray-600 dark:text-gray-400 tabular-nums"
                tick={{ fontSize: 10, fill: '#94a3b8', className: 'tabular-nums' }}
              />
            )}
            {showRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                width={80}
                tickFormatter={formatMortgageBalanceTick}
                label={{ 
                  value: 'Mortgage Balance ($)', 
                  angle: -90, 
                  position: 'insideRight',
                  offset: 20,
                  style: { textAnchor: 'middle' }
                }}
                className="text-gray-600 dark:text-gray-400 tabular-nums"
                tick={{ fontSize: 10, fill: '#94a3b8', className: 'tabular-nums' }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderCustomLegend} wrapperStyle={{ paddingTop: '20px' }} />
            {/* Baseline comparison line */}
            {showBaseline && baselineData && visibleMetrics.netCashFlow && (
              <Line
                type="monotone"
                dataKey="netCashFlow"
                data={baselineData}
                name="Baseline"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                opacity={0.4}
                yAxisId="left"
                isAnimationActive={false}
              />
            )}
            {visibleMetrics.netCashFlow && (
              <Line
                type="monotone"
                dataKey="netCashFlow"
                name="Net Cash Flow"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                yAxisId="left"
                isAnimationActive={true}
                animationBegin={300}
                animationDuration={1400}
                animationEasing="ease-in-out"
              />
            )}
            {visibleMetrics.operatingIncome && (
              <Line
                type="monotone"
                dataKey="operatingIncome"
                name="Operating Income"
                stroke="#94A3B8"
                strokeWidth={2}
                dot={{ fill: '#94A3B8', r: 4 }}
                activeDot={{ r: 6 }}
                yAxisId="left"
                isAnimationActive={true}
                animationBegin={300}
                animationDuration={1400}
                animationEasing="ease-in-out"
              />
            )}
            {visibleMetrics.operatingExpenses && (
              <Line
                type="monotone"
                dataKey="operatingExpenses"
                name="Operating Expenses"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', r: 4 }}
                activeDot={{ r: 6 }}
                yAxisId="left"
                isAnimationActive={true}
                animationBegin={300}
                animationDuration={1400}
                animationEasing="ease-in-out"
              />
            )}
            {visibleMetrics.noi && (
              <Line
                type="monotone"
                dataKey="noi"
                name="NOI"
                stroke="#94A3B8"
                strokeWidth={2}
                dot={{ fill: '#94A3B8', r: 4 }}
                activeDot={{ r: 6 }}
                yAxisId="left"
                isAnimationActive={true}
                animationBegin={300}
                animationDuration={1400}
                animationEasing="ease-in-out"
              />
            )}
            {visibleMetrics.debtService && (
              <Line
                type="monotone"
                dataKey="debtService"
                name="Debt Service"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', r: 4 }}
                activeDot={{ r: 6 }}
                yAxisId="left"
                isAnimationActive={true}
                animationBegin={300}
                animationDuration={1400}
                animationEasing="ease-in-out"
              />
            )}
            {visibleMetrics.mortgageBalance && (
              <Line
                type="monotone"
                dataKey="mortgageBalance"
                name="Mortgage Balance"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', r: 4 }}
                activeDot={{ r: 6 }}
                yAxisId={useDualAxis ? "right" : "left"}
                isAnimationActive={true}
                animationBegin={300}
                animationDuration={1400}
                animationEasing="ease-in-out"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Contextual Insights */}
      {insights.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Key Insights
          </h3>
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                {insight.icon && (
                  <insight.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${insight.color}`} />
                )}
                <span>{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BaselineForecast;

