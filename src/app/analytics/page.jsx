"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import { useProperties } from "@/context/PropertyContext";
import { Eye, EyeOff } from "lucide-react";
import ModelingSandboxSidebar from "@/components/analytics/ModelingSandboxSidebar";
import HeroMetricsBar from "@/components/analytics/HeroMetricsBar";
import BaselineForecast from "@/components/calculators/BaselineForecast";
import EquityForecast from "@/components/calculators/EquityForecast";
import SaveSnapshotModal from "@/components/analytics/SaveSnapshotModal";
import { CASH_FLOW_DEFAULT_ASSUMPTIONS, EQUITY_DEFAULT_ASSUMPTIONS, generateForecast, formatForecastForChart } from "@/lib/sensitivity-analysis";
import { calculateIRR } from "@/utils/financialCalculations";
import { calculateTotalProfit, calculateAverageAnnualEquityBuilt } from "@/utils/profitCalculations";
import { formatCurrency } from "@/utils/formatting";
import { useToast } from "@/context/ToastContext";
// Custom debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function AnalysisPage() {
  const [mounted, setMounted] = useState(false);
  const [analysisMode, setAnalysisMode] = useState('cash-flow');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [cashFlowAssumptions, setCashFlowAssumptions] = useState(CASH_FLOW_DEFAULT_ASSUMPTIONS);
  const [equityAssumptions, setEquityAssumptions] = useState(EQUITY_DEFAULT_ASSUMPTIONS);
  const [holdingPeriod, setHoldingPeriod] = useState(10);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [pinnedSnapshotId, setPinnedSnapshotId] = useState(null);
  const [showGhostMode, setShowGhostMode] = useState(false);
  
  const properties = useProperties();
  const { addToast } = useToast();

  // Debounce assumptions changes (300ms)
  const debouncedCashFlowAssumptions = useDebounce(cashFlowAssumptions, 300);
  const debouncedEquityAssumptions = useDebounce(equityAssumptions, 300);
  const debouncedHoldingPeriod = useDebounce(holdingPeriod, 300);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    // Load snapshots from localStorage
    const savedSnapshots = localStorage.getItem('analytics-snapshots');
    if (savedSnapshots) {
      try {
        setSnapshots(JSON.parse(savedSnapshots));
      } catch (e) {
        console.error('Error loading snapshots:', e);
      }
    }
    const savedPinned = localStorage.getItem('analytics-pinned-snapshot');
    if (savedPinned) {
      setPinnedSnapshotId(savedPinned);
    }
  }, []);

  // Set default property selection
  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [selectedPropertyId, properties]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Get current assumptions based on mode
  const assumptions = analysisMode === 'cash-flow' ? cashFlowAssumptions : equityAssumptions;
  const debouncedAssumptions = analysisMode === 'cash-flow' ? debouncedCashFlowAssumptions : debouncedEquityAssumptions;
  const setAssumptions = analysisMode === 'cash-flow' ? setCashFlowAssumptions : setEquityAssumptions;

  // Calculate metrics
  const { irr, totalProfit, averageAnnualEquityBuilt, baselineForecastData, forecastOutcomes, summaryText } = useMemo(() => {
    if (!selectedProperty) {
      return { 
        irr: 0, 
        totalProfit: 0, 
        averageAnnualEquityBuilt: 0, 
        baselineForecastData: null,
        forecastOutcomes: null,
        summaryText: null
      };
    }

    try {
      // Generate current forecast
      const currentForecast = generateForecast(
        selectedProperty,
        debouncedAssumptions,
        debouncedHoldingPeriod,
        analysisMode
      );

      // Calculate IRR
      const exitCapRate = analysisMode === 'equity' ? equityAssumptions.exitCapRate : null;
      const calculatedIRR = calculateIRR(
        selectedProperty,
        debouncedHoldingPeriod,
        exitCapRate,
        5.0 // 5% selling costs
      );

      // Calculate Total Profit
      const calculatedTotalProfit = calculateTotalProfit(
        selectedProperty,
        currentForecast,
        debouncedHoldingPeriod,
        analysisMode,
        debouncedAssumptions,
        5.0 // 5% selling costs
      );

      // Calculate Average Annual Equity Built
      const calculatedAverageAnnualEquityBuilt = calculateAverageAnnualEquityBuilt(
        selectedProperty,
        currentForecast,
        debouncedHoldingPeriod,
        analysisMode,
        debouncedAssumptions
      );

      // Calculate Forecast Outcomes (Year 1, Year 10, 10-Year Total) and Summary Text
      let forecastOutcomesData = null;
      let calculatedSummaryText = null;
      
      if (analysisMode === 'cash-flow') {
        const formattedForecast = formatForecastForChart(currentForecast, 'cash-flow');
        if (formattedForecast && formattedForecast.length > 0) {
          const year1 = formattedForecast[0];
          const year10 = formattedForecast[formattedForecast.length - 1];
          const year1CashFlow = year1.netCashFlow || 0;
          
          forecastOutcomesData = {
            year1CashFlow: year1CashFlow,
            year10CashFlow: year10.netCashFlow || 0,
            tenYearTotal: year10.cumulativeCashFlow || 0,
          };

          // Calculate summary text
          if (year1CashFlow < 0) {
            const monthlyOutOfPocket = Math.abs(year1CashFlow / 12);
            calculatedSummaryText = `This scenario requires monthly out-of-pocket contributions of approximately ${formatCurrency(monthlyOutOfPocket)}.`;
          } else {
            const monthlyCashFlow = year1CashFlow / 12;
            calculatedSummaryText = `This property generates positive cash flow of approximately ${formatCurrency(monthlyCashFlow)} per month.`;
          }
        }
      }

      // Get baseline forecast data for comparison
      let baselineData = null;
      if (showGhostMode) {
        if (pinnedSnapshotId) {
          const pinnedSnapshot = snapshots.find(s => s.id === pinnedSnapshotId);
          if (pinnedSnapshot && pinnedSnapshot.forecastData) {
            baselineData = pinnedSnapshot.forecastData;
          }
        } else {
          // Use default assumptions
          const defaultAssumptions = analysisMode === 'cash-flow' 
            ? CASH_FLOW_DEFAULT_ASSUMPTIONS 
            : EQUITY_DEFAULT_ASSUMPTIONS;
          const baselineForecast = generateForecast(
            selectedProperty,
            defaultAssumptions,
            debouncedHoldingPeriod,
            analysisMode
          );
          baselineData = formatForecastForChart(baselineForecast, analysisMode);
        }
      }

      return {
        irr: calculatedIRR,
        totalProfit: calculatedTotalProfit,
        averageAnnualEquityBuilt: calculatedAverageAnnualEquityBuilt,
        baselineForecastData: baselineData,
        forecastOutcomes: forecastOutcomesData,
        summaryText: calculatedSummaryText,
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return { 
        irr: 0, 
        totalProfit: 0, 
        averageAnnualEquityBuilt: 0, 
        baselineForecastData: null,
        forecastOutcomes: null,
        summaryText: null
      };
    }
  }, [selectedProperty, debouncedAssumptions, debouncedHoldingPeriod, analysisMode, showGhostMode, pinnedSnapshotId, snapshots, equityAssumptions]);

  // Handle mode change - persist assumptions
  const handleModeChange = (mode) => {
    if (mode === analysisMode) return;
    setAnalysisMode(mode);
    // Note: Assumptions persist per mode, so no need to reset here
    // The sidebar will handle applying presets to the new mode's assumptions
  };

  // Handle save snapshot
  const handleSaveSnapshot = (name) => {
    if (!selectedProperty) return;

    try {
      // Generate forecast data
      const forecast = generateForecast(
        selectedProperty,
        assumptions,
        holdingPeriod,
        analysisMode
      );
      const forecastData = formatForecastForChart(forecast, analysisMode);

      const snapshot = {
        id: `snapshot-${Date.now()}`,
        name,
        timestamp: new Date().toISOString(),
        propertyId: selectedPropertyId,
        analysisMode,
        assumptions: { ...assumptions },
        holdingPeriod,
        forecastData,
      };

      const newSnapshots = [...snapshots, snapshot];
      setSnapshots(newSnapshots);
      localStorage.setItem('analytics-snapshots', JSON.stringify(newSnapshots));
      addToast("Snapshot saved successfully.");
    } catch (error) {
      console.error('Error saving snapshot:', error);
      addToast("Failed to save snapshot.", { type: 'error' });
    }
  };

  // Handle reset to defaults
  const handleResetDefaults = () => {
    if (analysisMode === 'cash-flow') {
      setCashFlowAssumptions(CASH_FLOW_DEFAULT_ASSUMPTIONS);
    } else {
      setEquityAssumptions(EQUITY_DEFAULT_ASSUMPTIONS);
    }
    addToast("Reset to default assumptions.");
  };

  // Handle pin snapshot
  const handlePinSnapshot = (snapshotId) => {
    if (pinnedSnapshotId === snapshotId) {
      setPinnedSnapshotId(null);
      localStorage.removeItem('analytics-pinned-snapshot');
    } else {
      setPinnedSnapshotId(snapshotId);
      localStorage.setItem('analytics-pinned-snapshot', snapshotId);
    }
  };

  // Handle delete snapshot
  const handleDeleteSnapshot = (snapshotId) => {
    const newSnapshots = snapshots.filter(s => s.id !== snapshotId);
    setSnapshots(newSnapshots);
    localStorage.setItem('analytics-snapshots', JSON.stringify(newSnapshots));
    
    // If deleted snapshot was pinned, unpin it
    if (pinnedSnapshotId === snapshotId) {
      setPinnedSnapshotId(null);
      localStorage.removeItem('analytics-pinned-snapshot');
    }
    
    addToast("Snapshot deleted.");
  };

  // Generate default snapshot name
  const generateDefaultSnapshotName = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
    return `Scenario - ${dateStr} ${timeStr}`;
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <RequireAuth>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E]"></div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <Layout>
        <div className="w-full bg-[#F9FAFB] dark:bg-gray-950 min-h-[calc(100vh-80px)]">
          {/* Full-width header spanning both sidebar and main stage */}
          <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-8 py-6">
              <div className="flex-1">
                <h1 className="text-hero-4xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Analysis
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Use the sidebar to adjust assumptions like rent growth, changes in expenses, and vacancy. This page models how different market scenarios impact over adjustable timelines.
                </p>
              </div>
              {/* Right-aligned actions */}
              <div className="flex items-center gap-3">
                {selectedProperty && (
                  <>
                    {pinnedSnapshotId && showGhostMode && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Baseline: {snapshots.find(s => s.id === pinnedSnapshotId)?.name || 'Default'}
                      </span>
                    )}
                    <button
                      onClick={() => setShowGhostMode(!showGhostMode)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        showGhostMode
                          ? 'bg-[#205A3E] text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {showGhostMode ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Hide Baseline
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Show Baseline
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar + Main Stage Container */}
          <div className="flex h-[calc(100vh-80px-88px)]">
            {/* Sidebar - Fixed 320px */}
            <ModelingSandboxSidebar
              properties={properties}
              selectedPropertyId={selectedPropertyId}
              onPropertySelect={setSelectedPropertyId}
              analysisMode={analysisMode}
              onModeChange={handleModeChange}
              assumptions={assumptions}
              onAssumptionsChange={setAssumptions}
              holdingPeriod={holdingPeriod}
              onHoldingPeriodChange={setHoldingPeriod}
              onSaveSnapshot={() => setShowSaveModal(true)}
              onResetDefaults={handleResetDefaults}
              pinnedSnapshotId={pinnedSnapshotId}
              snapshots={snapshots}
              onPinSnapshot={handlePinSnapshot}
              onDeleteSnapshot={handleDeleteSnapshot}
            />

            {/* Main Stage - Flex-1 */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Hero Metrics Bar */}
              <HeroMetricsBar
                irr={irr}
                totalProfit={totalProfit}
                averageAnnualEquityBuilt={averageAnnualEquityBuilt}
                forecastOutcomes={forecastOutcomes}
                summaryText={summaryText}
                showGhostMode={showGhostMode}
                onToggleGhostMode={() => setShowGhostMode(!showGhostMode)}
                baselineSnapshotName={pinnedSnapshotId ? snapshots.find(s => s.id === pinnedSnapshotId)?.name : 'Default'}
              />

              {/* Charts Container */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                {selectedProperty ? (
                  <>
                    {/* Baseline Forecast Chart */}
                    {analysisMode === 'cash-flow' && (
                      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
                        <BaselineForecast
                          property={selectedProperty}
                          assumptions={debouncedAssumptions}
                          years={debouncedHoldingPeriod}
                          baselineData={baselineForecastData}
                          showBaseline={showGhostMode}
                        />
                      </div>
                    )}

                    {/* Equity Forecast Chart */}
                    {analysisMode === 'equity' && (
                      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
                        <EquityForecast
                          property={selectedProperty}
                          assumptions={debouncedAssumptions}
                          years={debouncedHoldingPeriod}
                          baselineData={baselineForecastData}
                          showBaseline={showGhostMode}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
                        Select a property to begin modeling
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Snapshot Modal */}
        <SaveSnapshotModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSaveSnapshot}
          defaultName={generateDefaultSnapshotName()}
        />
      </Layout>
    </RequireAuth>
  );
}
