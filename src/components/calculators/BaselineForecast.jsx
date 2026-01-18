"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/utils/formatting';
import { generateForecast, formatForecastForChart } from '@/lib/sensitivity-analysis';
import { Check, TrendingUp, TrendingDown, Download, FileImage, FileText, FileSpreadsheet, ChevronDown, LineChart as LineChartIcon } from 'lucide-react';
import ChartSkeleton from '@/components/analytics/ChartSkeleton';
import { exportChartAsPNG, exportChartAsPDF, exportChartAsCSV, generateFilename } from '@/utils/chartExport';
import { useToast } from '@/context/ToastContext';

const BaselineForecast = ({ property, assumptions }) => {
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
  const [years, setYears] = useState(10);
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

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Year {label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom legend with click handlers - show all metrics regardless of visibility
  const renderCustomLegend = () => {
    const allMetrics = [
      { key: 'netCashFlow', name: 'Net Cash Flow', color: '#10b981' },
      { key: 'operatingIncome', name: 'Operating Income', color: '#3b82f6' },
      { key: 'operatingExpenses', name: 'Operating Expenses', color: '#ef4444' },
      { key: 'noi', name: 'NOI', color: '#8b5cf6' },
      { key: 'debtService', name: 'Debt Service', color: '#f59e0b' },
      { key: 'mortgageBalance', name: 'Mortgage Balance', color: '#6b7280' },
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
      <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6">
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
      <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6">
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

  // Metric cards configuration
  const metricCards = [
    {
      key: 'netCashFlow',
      label: 'Net Cash Flow',
      color: 'green',
      year1Value: forecastData[0]?.netCashFlow || 0,
      year10Value: forecastData[forecastData.length - 1]?.netCashFlow || 0,
    },
    {
      key: 'operatingIncome',
      label: 'Operating Income',
      color: 'blue',
      year1Value: forecastData[0]?.operatingIncome || 0,
      year10Value: forecastData[forecastData.length - 1]?.operatingIncome || 0,
    },
    {
      key: 'operatingExpenses',
      label: 'Operating Expenses',
      color: 'red',
      year1Value: forecastData[0]?.operatingExpenses || 0,
      year10Value: forecastData[forecastData.length - 1]?.operatingExpenses || 0,
    },
  ];

  // Format Y-axis tick
  const formatYAxisTick = (value, isRightAxis = false) => {
    if (isRightAxis && Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}k`;
  };

  return (
    <div ref={chartRef} className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
        {metricCards.map((card) => {
          const isActive = visibleMetrics[card.key];
          const colorClasses = {
            green: {
              bg: isActive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800/50',
              border: isActive ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700',
              text: 'text-green-900 dark:text-green-300',
              accent: 'text-green-600 dark:text-green-400',
            },
            red: {
              bg: isActive ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800/50',
              border: isActive ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700',
              text: 'text-red-900 dark:text-red-300',
              accent: 'text-red-600 dark:text-red-400',
            },
            blue: {
              bg: isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800/50',
              border: isActive ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700',
              text: 'text-blue-900 dark:text-blue-300',
              accent: 'text-blue-600 dark:text-blue-400',
            },
          };
          const colors = colorClasses[card.color];

          return (
            <button
              key={card.key}
              onClick={() => toggleMetric(card.key)}
              className={`rounded-md border p-2.5 text-left transition-all hover:bg-opacity-80 ${
                colors.bg
              } ${colors.border} ${isActive ? 'ring-1 ring-offset-1' : ''}`}
              style={isActive ? { ringColor: colors.accent } : {}}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${colors.accent}`}>{card.label}</span>
                {isActive && <Check className={`w-3 h-3 ${colors.accent}`} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={forecastData}
            margin={{ top: 5, right: showRightAxis ? 30 : 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis 
              dataKey="year" 
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
              className="text-gray-600 dark:text-gray-400"
            />
            {showLeftAxis && (
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => formatYAxisTick(value, false)}
                label={{ value: 'Cash Flow ($)', angle: -90, position: 'insideLeft' }}
                className="text-gray-600 dark:text-gray-400"
              />
            )}
            {showRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => formatYAxisTick(value, true)}
                label={{ value: 'Mortgage Balance ($)', angle: 90, position: 'insideRight' }}
                className="text-gray-600 dark:text-gray-400"
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderCustomLegend} wrapperStyle={{ paddingTop: '20px' }} />
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
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
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
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
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
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4 }}
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
                stroke="#6b7280"
                strokeWidth={2}
                dot={{ fill: '#6b7280', r: 4 }}
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

      {/* Key Metrics Summary */}
      <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
              Year 1 Cash Flow
            </p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
              {formatCurrency(forecastData[0]?.netCashFlow || 0)}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
              Year {years} Cash Flow
            </p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
              {formatCurrency(forecastData[forecastData.length - 1]?.netCashFlow || 0)}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
              {years}-Year Total
            </p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
              {formatCurrency(forecastData[forecastData.length - 1]?.cumulativeCashFlow || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Contextual Insights */}
      {insights.length > 0 && (
        <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
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

