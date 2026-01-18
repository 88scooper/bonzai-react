"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, formatPercentage } from '@/utils/formatting';
import { generateForecast, formatForecastForChart } from '@/lib/sensitivity-analysis';
import { Check, TrendingUp, TrendingDown, Download, FileImage, FileText, FileSpreadsheet, ChevronDown, LineChart as LineChartIcon } from 'lucide-react';
import ChartSkeleton from '@/components/analytics/ChartSkeleton';
import { exportChartAsPNG, exportChartAsPDF, exportChartAsCSV, generateFilename } from '@/utils/chartExport';
import { useToast } from '@/context/ToastContext';

const EquityForecast = ({ property, assumptions }) => {
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

  // Custom legend with click handlers
  const renderCustomLegend = () => {
    const allMetrics = [
      { key: 'totalEquity', name: 'Total Equity', color: '#3b82f6' },
      { key: 'propertyValue', name: 'Property Value', color: '#10b981' },
      { key: 'mortgageBalance', name: 'Mortgage Balance', color: '#ef4444' },
      { key: 'equityFromAppreciation', name: 'Equity from Appreciation', color: '#8b5cf6' },
      { key: 'equityFromPaydown', name: 'Equity from Paydown', color: '#f59e0b' },
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

  // Format Y-axis tick
  const formatYAxisTick = (value, isRightAxis = false) => {
    if (isRightAxis && Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}k`;
  };

  // Metric cards configuration
  const metricCards = [
    {
      key: 'totalEquity',
      label: 'Total Equity',
      color: 'blue',
      year1Value: forecastData[0]?.totalEquity || 0,
      year10Value: forecastData[forecastData.length - 1]?.totalEquity || 0,
    },
    {
      key: 'propertyValue',
      label: 'Property Value',
      color: 'green',
      year1Value: forecastData[0]?.propertyValue || 0,
      year10Value: forecastData[forecastData.length - 1]?.propertyValue || 0,
    },
    {
      key: 'mortgageBalance',
      label: 'Mortgage Balance',
      color: 'red',
      year1Value: forecastData[0]?.mortgageBalance || 0,
      year10Value: forecastData[forecastData.length - 1]?.mortgageBalance || 0,
    },
  ];

  if (isCalculating) {
    return <ChartSkeleton />;
  }

  if (!property) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-black/10 dark:border-white/10 shadow-sm p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Select a property to view equity forecast
        </p>
      </div>
    );
  }

  if (forecastData.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-black/10 dark:border-white/10 shadow-sm p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Unable to generate forecast. Please check property data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-black/10 dark:border-white/10 shadow-sm p-6" ref={chartRef}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
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
                    setYears(value);
                  }
                }}
                className="w-16 px-2 py-1 text-sm border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
              <button
                onClick={() => handleExport('png')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileImage className="w-4 h-4" />
                Export as PNG
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileText className="w-4 h-4" />
                Export as PDF
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export as CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metric Toggle Cards */}
      <div className="flex flex-wrap gap-3 mb-6">
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
      <div className="w-full h-96 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={forecastData}
            margin={{ top: 5, right: showRightAxis ? 30 : 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="year"
              className="text-gray-600 dark:text-gray-400"
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
            />
            {showLeftAxis && (
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => formatYAxisTick(value, false)}
                label={{ value: 'Equity/Value ($)', angle: -90, position: 'insideLeft' }}
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
            {visibleMetrics.totalEquity && (
              <Line
                type="monotone"
                dataKey="totalEquity"
                name="Total Equity"
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
            {visibleMetrics.propertyValue && (
              <Line
                type="monotone"
                dataKey="propertyValue"
                name="Property Value"
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
            {visibleMetrics.equityFromAppreciation && (
              <Line
                type="monotone"
                dataKey="equityFromAppreciation"
                name="Equity from Appreciation"
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
            {visibleMetrics.equityFromPaydown && (
              <Line
                type="monotone"
                dataKey="equityFromPaydown"
                name="Equity from Paydown"
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

      {/* Key Metrics Summary */}
      <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
              Year 1 Equity
            </p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
              {formatCurrency(forecastData[0]?.totalEquity || 0)}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
              Year {years} Equity
            </p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
              {formatCurrency(forecastData[forecastData.length - 1]?.totalEquity || 0)}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
              Equity Growth
            </p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
              {formatCurrency((forecastData[forecastData.length - 1]?.totalEquity || 0) - (forecastData[0]?.totalEquity || 0))}
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

export default EquityForecast;

