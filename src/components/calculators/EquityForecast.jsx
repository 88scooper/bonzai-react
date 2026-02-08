"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { formatCurrency, formatPercentage } from '@/utils/formatting';
import { generateForecast, formatForecastForChart } from '@/lib/sensitivity-analysis';
import { Check, TrendingUp, TrendingDown, Download, FileImage, FileText, FileSpreadsheet, ChevronDown, LineChart as LineChartIcon } from 'lucide-react';
import ChartSkeleton from '@/components/analytics/ChartSkeleton';
import { exportChartAsPNG, exportChartAsPDF, exportChartAsCSV, generateFilename } from '@/utils/chartExport';
import { useToast } from '@/context/ToastContext';

const EquityForecast = ({ property, assumptions, years = 10, baselineData = null, showBaseline = false }) => {
  // State for toggleable metrics
  const [visibleMetrics, setVisibleMetrics] = useState({
    totalEquity: true,
    propertyValue: false,
    mortgageBalance: false,
    equityFromAppreciation: false,
    equityFromPaydown: false,
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
    const timer = setTimeout(() => {
      try {
        const forecast = generateForecast(property, assumptions, years, 'equity');
        const formatted = formatForecastForChart(forecast, 'equity');
        setForecastData(formatted);
      } catch (error) {
        console.error('Error generating forecast:', error);
        setForecastData([]);
      } finally {
        setIsCalculating(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [property, assumptions, years]);

  // Toggle metric visibility
  const toggleMetric = (metricKey) => {
    setVisibleMetrics((prev) => {
      const newState = { ...prev, [metricKey]: !prev[metricKey] };
      const hasVisible = Object.values(newState).some((v) => v);
      if (!hasVisible) {
        return prev;
      }
      return newState;
    });
  };

  // Determine which Y-axes to show
  const showLeftAxis = visibleMetrics.totalEquity || visibleMetrics.propertyValue || 
                       visibleMetrics.equityFromAppreciation || visibleMetrics.equityFromPaydown;
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

  // Custom legend with click handlers
  const renderCustomLegend = () => {
    const allMetrics = [
      { key: 'totalEquity', name: 'Total Equity', color: '#205A3E' }, // Bonsai Green
      { key: 'propertyValue', name: 'Property Value', color: '#94A3B8' }, // Light Slate for baseline
      { key: 'mortgageBalance', name: 'Mortgage Balance', color: '#ef4444' }, // Red for debt
      { key: 'equityFromAppreciation', name: 'Equity from Appreciation', color: '#94A3B8' }, // Light Slate
      { key: 'equityFromPaydown', name: 'Equity from Paydown', color: '#94A3B8' }, // Light Slate
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

    if (visibleMetrics.totalEquity && year1 && lastYear) {
      const equityGrowth = lastYear.totalEquity - year1.totalEquity;
      insights.push({
        icon: TrendingUp,
        text: `Equity grows by ${formatCurrency(equityGrowth)} over ${years} years`,
        color: 'text-blue-600 dark:text-blue-400',
      });

      // Calculate equity growth percentage
      if (year1.totalEquity > 0) {
        const equityGrowthPercent = (equityGrowth / year1.totalEquity) * 100;
        insights.push({
          icon: TrendingUp,
          text: `Equity increases by ${equityGrowthPercent.toFixed(1)}% over ${years} years`,
          color: 'text-blue-600 dark:text-blue-400',
        });
      }
    }

    if (visibleMetrics.propertyValue && year1 && lastYear) {
      const valueGrowth = lastYear.propertyValue - year1.propertyValue;
      if (year1.propertyValue > 0) {
        const valueGrowthPercent = (valueGrowth / year1.propertyValue) * 100;
        insights.push({
          icon: TrendingUp,
          text: `Property value reaches ${formatCurrency(lastYear.propertyValue)} by year ${years} (${valueGrowthPercent.toFixed(1)}% growth)`,
          color: 'text-green-600 dark:text-green-400',
        });
      }
    }

    if (visibleMetrics.mortgageBalance && year1 && lastYear) {
      const debtReduction = year1.mortgageBalance - lastYear.mortgageBalance;
      if (year1.mortgageBalance > 0) {
        const debtReductionPercent = (debtReduction / year1.mortgageBalance) * 100;
        insights.push({
          icon: TrendingDown,
          text: `Mortgage balance reduces by ${formatCurrency(debtReduction)} (${debtReductionPercent.toFixed(1)}%) over ${years} years`,
          color: 'text-red-600 dark:text-red-400',
        });
      }
    }

    // Equity sources breakdown
    if (year1 && lastYear && lastYear.equityFromAppreciation && lastYear.equityFromPaydown) {
      const totalEquitySources = lastYear.equityFromAppreciation + lastYear.equityFromPaydown;
      if (totalEquitySources > 0) {
        const appreciationPercent = (lastYear.equityFromAppreciation / totalEquitySources) * 100;
        const paydownPercent = (lastYear.equityFromPaydown / totalEquitySources) * 100;
        insights.push({
          icon: null,
          text: `${appreciationPercent.toFixed(1)}% of equity comes from appreciation, ${paydownPercent.toFixed(1)}% from principal paydown`,
          color: 'text-gray-600 dark:text-gray-400',
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
          const filename = generateFilename(propertyName, 'equity_forecast', 'png');
          await exportChartAsPNG(chartContainer, filename);
          addToast('Chart exported as PNG successfully');
          break;
        }
        case 'pdf': {
          const filename = generateFilename(propertyName, 'equity_forecast', 'pdf');
          await exportChartAsPDF(chartContainer, filename);
          addToast('Chart exported as PDF successfully');
          break;
        }
        case 'csv': {
          const filename = generateFilename(propertyName, 'equity_forecast', 'csv');
          await exportChartAsCSV(forecastData, filename);
          addToast('Chart exported as CSV successfully');
          break;
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export chart', 'error');
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

  // Custom Y-axis tick formatter for Equity/Value axis
  const formatEquityTick = (value) => {
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

  if (!property) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-900 p-6">
        <div className="flex items-center gap-2 mb-1">
          <LineChartIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Equity Forecast
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
          Select a property to view the equity forecast.
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
            Equity Forecast
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
                  // Note: years prop is read-only, parent component controls it
                }
              }}
              className="w-16 px-2 py-1 text-sm border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Projection of equity growth based on property appreciation and mortgage paydown over the next {years} {years === 1 ? 'year' : 'years'}.
        </p>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full" ref={chartRef}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <LineChartIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Equity Forecast
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Projection of equity growth based on property appreciation and mortgage paydown over the next {years} {years === 1 ? 'year' : 'years'}.
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
          onClick={() => toggleMetric('totalEquity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            visibleMetrics.totalEquity
              ? 'bg-[#205A3E] text-white border-[#205A3E]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {visibleMetrics.totalEquity && <Check className="w-4 h-4" />}
          <span>Total Equity</span>
        </button>
        <button
          onClick={() => toggleMetric('propertyValue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            visibleMetrics.propertyValue
              ? 'bg-[#205A3E] text-white border-[#205A3E]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {visibleMetrics.propertyValue && <Check className="w-4 h-4" />}
          <span>Property Value</span>
        </button>
        <button
          onClick={() => toggleMetric('mortgageBalance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            visibleMetrics.mortgageBalance
              ? 'bg-[#205A3E] text-white border-[#205A3E]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {visibleMetrics.mortgageBalance && <Check className="w-4 h-4" />}
          <span>Mortgage Balance</span>
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
                tickFormatter={formatEquityTick}
                label={{ 
                  value: 'Equity/Value ($)', 
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
            {showBaseline && baselineData && visibleMetrics.totalEquity && (
              <Line
                type="monotone"
                dataKey="totalEquity"
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
            {visibleMetrics.totalEquity && (
              <Line
                type="monotone"
                dataKey="totalEquity"
                name="Total Equity"
                stroke="#205A3E"
                strokeWidth={2}
                dot={{ fill: '#205A3E', r: 4 }}
                activeDot={{ r: 6 }}
                yAxisId="left"
                isAnimationActive={true}
                animationBegin={300}
                animationDuration={1400}
                animationEasing="ease-in-out"
              />
            )}
            {visibleMetrics.propertyValue && (
              <Line
                type="monotone"
                dataKey="propertyValue"
                name="Property Value"
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
            {visibleMetrics.equityFromAppreciation && (
              <Line
                type="monotone"
                dataKey="equityFromAppreciation"
                name="Equity from Appreciation"
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
            {visibleMetrics.equityFromPaydown && (
              <Line
                type="monotone"
                dataKey="equityFromPaydown"
                name="Equity from Paydown"
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

export default EquityForecast;

