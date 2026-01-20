"use client";

import { useState, useEffect } from "react";
import { Target, BarChart3, Lightbulb, TrendingUp, DollarSign } from "lucide-react";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import { useProperties, usePortfolioMetrics } from "@/context/PropertyContext";
import ScenarioAnalysisDashboard from "@/components/scenarios/ScenarioAnalysisDashboard";
import AssumptionsPanel from "@/components/calculators/AssumptionsPanel";
import EquityAssumptionsPanel from "@/components/calculators/EquityAssumptionsPanel";
import BaselineForecast from "@/components/calculators/BaselineForecast";
import EquityForecast from "@/components/calculators/EquityForecast";
import SensitivityDashboard from "@/components/calculators/SensitivityDashboard";
import YoYAnalysis from "@/components/calculators/YoYAnalysis";
import SaveScenarioModal from "@/components/calculators/SaveScenarioModal";
import SavedScenariosPanel from "@/components/calculators/SavedScenariosPanel";
import SettingsSidebar from "@/components/calculators/SettingsSidebar";
import { DEFAULT_ASSUMPTIONS, CASH_FLOW_DEFAULT_ASSUMPTIONS, EQUITY_DEFAULT_ASSUMPTIONS } from "@/lib/sensitivity-analysis";
import { formatCurrency, formatPercentage } from "@/utils/formatting";
import { useToast } from "@/context/ToastContext";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function AnalyticsPage() {
  const [analysisMode, setAnalysisMode] = useState('cash-flow'); // 'cash-flow' | 'equity'
  const [activeTab, setActiveTab] = useState('sensitivity');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [cashFlowAssumptions, setCashFlowAssumptions] = useState(CASH_FLOW_DEFAULT_ASSUMPTIONS);
  const [equityAssumptions, setEquityAssumptions] = useState(EQUITY_DEFAULT_ASSUMPTIONS);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenariosKey, setScenariosKey] = useState(0); // Key to force refresh of SavedScenariosPanel
  const [mounted, setMounted] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const properties = useProperties();
  const portfolioMetrics = usePortfolioMetrics();
  const { addToast } = useToast();

  // Get current assumptions based on mode
  const assumptions = analysisMode === 'cash-flow' ? cashFlowAssumptions : equityAssumptions;
  const setAssumptions = analysisMode === 'cash-flow' ? setCashFlowAssumptions : setEquityAssumptions;

  // Handle mode switching
  const handleModeChange = (mode) => {
    if (mode === analysisMode) return;
    
    setAnalysisMode(mode);
    // Reset assumptions to defaults when switching modes
    if (mode === 'cash-flow') {
      setCashFlowAssumptions(CASH_FLOW_DEFAULT_ASSUMPTIONS);
    } else {
      setEquityAssumptions(EQUITY_DEFAULT_ASSUMPTIONS);
    }
    // Clear any selected scenarios
    setScenariosKey(prev => prev + 1);
  };

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set default property selection
  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [selectedPropertyId, properties]);

  // Get selected property
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Handle save scenario success
  const handleSaveSuccess = () => {
    setScenariosKey(prev => prev + 1); // Increment key to refresh SavedScenariosPanel
    addToast("Scenario saved to your library.");
  };

  // Handle load scenario
  const handleLoadScenario = (loadedAssumptions) => {
    setAssumptions(loadedAssumptions);
  };

  const tabs = [
    { id: 'sensitivity', label: 'Sensitivity Analysis', icon: Target },
    { id: 'scenarios', label: 'Scenario Analysis', icon: BarChart3 },
    { id: 'insights', label: 'Insights', icon: Lightbulb }
  ];

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <RequireAuth>
        <Layout>
          <div className="space-y-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E]"></div>
            </div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <Layout>
        {/* Main container with sidebar layout */}
        <div className="flex relative" style={{ minHeight: 'calc(100vh - 200px)', background: '#F9FAFB' }}>
          {/* Main content area with right padding for sidebar */}
          <div className="flex-1 pr-[300px]">
            <div className="space-y-6 p-6">
              <header className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Analytics</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {analysisMode === 'cash-flow' 
                  ? "Forecast your property's cash flow over time. Adjust rent, expenses, and vacancy assumptions to see how they impact your monthly and annual cash flow."
                  : "Project your property's equity growth over time. Model how appreciation, interest rates, and principal paydown affect your total equity."
                }
              </p>
              </div>
              
              {/* Analysis Mode Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleModeChange('cash-flow')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    analysisMode === 'cash-flow'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Cash Flow Analysis
                </button>
                <button
                  onClick={() => handleModeChange('equity')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    analysisMode === 'equity'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Equity Analysis
                </button>
              </div>
            </header>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'sensitivity' && (
              <div className="space-y-6">
                {/* Property Selection - wrapped in standardized card */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <PropertySelectCard
                    properties={properties}
                    selectedPropertyId={selectedPropertyId}
                    onSelect={setSelectedPropertyId}
                  />
                </div>

                {/* Main Analysis Section */}
                {selectedProperty && (
                  <div className="space-y-6">
                    {/* Assumptions Panel - Presets & Modes only - wrapped in standardized card */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                      {analysisMode === 'cash-flow' ? (
                        <AssumptionsPanel
                          assumptions={assumptions}
                          onAssumptionsChange={setAssumptions}
                          onSaveClick={() => setShowSaveModal(true)}
                          showInputs={false}
                        />
                      ) : (
                        <EquityAssumptionsPanel
                          assumptions={assumptions}
                          onAssumptionsChange={setAssumptions}
                          onSaveClick={() => setShowSaveModal(true)}
                          showInputs={false}
                        />
                      )}
                    </div>

                    {/* Forecast Chart - already has its own card wrapper */}
                    {analysisMode === 'cash-flow' ? (
                      <BaselineForecast 
                        property={selectedProperty}
                        assumptions={assumptions}
                      />
                    ) : (
                      <EquityForecast 
                        property={selectedProperty}
                        assumptions={assumptions}
                      />
                    )}

                    {/* Comparison Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Scenario Comparison
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            See how your adjusted assumptions compare to the baseline
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Saved Scenarios Dropdown */}
                        <SavedScenariosPanel 
                          key={scenariosKey}
                          propertyId={selectedPropertyId}
                          onLoadScenario={handleLoadScenario}
                          currentAssumptions={assumptions}
                          analysisType={analysisMode}
                        />

                        {/* Main Comparison Content */}
                        {analysisMode === 'cash-flow' && (
                          <>
                            <SensitivityDashboard 
                              property={selectedProperty}
                              assumptions={assumptions}
                            />
                            <YoYAnalysis 
                              property={selectedProperty}
                              assumptions={assumptions}
                              baselineAssumptions={CASH_FLOW_DEFAULT_ASSUMPTIONS}
                            />
                          </>
                        )}
                        {analysisMode === 'equity' && (
                          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                              <p>Equity metrics dashboard coming soon</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Scenario Modal */}
                {showSaveModal && selectedProperty && (
                  <SaveScenarioModal
                    isOpen={showSaveModal}
                    onClose={() => setShowSaveModal(false)}
                    assumptions={assumptions}
                    property={selectedProperty}
                    onSaveSuccess={handleSaveSuccess}
                  />
                )}
              </div>
            )}
            
            {activeTab === 'scenarios' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <ScenarioAnalysisDashboard />
              </div>
            )}
            
            {activeTab === 'insights' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4">Portfolio Insights</h2>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        Top Performing Property
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {properties.length > 0 ? 
                          `${properties.reduce((best, current) => current.monthlyCashFlow > best.monthlyCashFlow ? current : best).nickname} has the highest monthly cash flow at ${formatCurrency(properties.reduce((best, current) => current.monthlyCashFlow > best.monthlyCashFlow ? current : best).monthlyCashFlow)}.`
                          : 'No properties available for analysis.'
                        }
                      </p>
                    </div>
                    
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        Portfolio Diversification
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Your portfolio consists of {properties.length} properties with an average cap rate of {properties.length > 0 ? formatPercentage(properties.reduce((sum, p) => sum + p.capRate, 0) / properties.length) : formatPercentage(0)}. 
                        Consider diversifying across different property types or locations for risk reduction.
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        Risk Assessment
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Monitor vacancy rates and market conditions. Consider setting aside 5-10% of annual rent as a vacancy allowance. 
                        Your current portfolio generates {formatCurrency(properties.reduce((sum, p) => sum + p.annualCashFlow, 0))} in annual cash flow.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
            </div>
          </div>

          {/* Settings Sidebar */}
          {selectedProperty && activeTab === 'sensitivity' && (
            <SettingsSidebar
              assumptions={assumptions}
              onAssumptionsChange={setAssumptions}
            />
          )}
        </div>
      </Layout>
    </RequireAuth>
  );
}

function PropertySelectCard({ properties = [], selectedPropertyId, onSelect }) {
  const hasProperties = properties.length > 0;

  // Helper function to get image path
  const getPropertyImage = (property) => {
    // Check if property has imageUrl
    if (property.imageUrl) {
      return property.imageUrl;
    }
    // Fallback: try to construct path from nickname
    const imageName = property.nickname.replace(/\s+/g, ' ');
    // Try common image patterns
    const possiblePaths = [
      `/images/${property.nickname}.png`,
      `/images/${imageName}.png`,
      `/images/${property.nickname}.jpg`,
    ];
    // Return first possible path (will show placeholder if not found)
    return possiblePaths[0];
  };

  if (!hasProperties) {
    return (
      <div className="rounded-lg border border-dashed border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        Add a property first to run analytics
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
        Property:
      </label>
      <div className="flex items-center gap-2 flex-1 overflow-x-auto pb-2">
        {properties.map((property) => {
          const isSelected = property.id === selectedPropertyId;
          const imagePath = getPropertyImage(property);
          
          return (
            <button
              key={property.id}
              onClick={() => onSelect(property.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all flex-shrink-0 ${
                isSelected
                  ? 'border-black/20 dark:border-white/20 bg-white dark:bg-neutral-900 shadow-sm'
                  : 'border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                {imagePath ? (
                  <img
                    src={imagePath}
                    alt={property.nickname}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide image and show placeholder on error
                      e.target.style.display = 'none';
                      const placeholder = e.target.parentElement.querySelector('.image-placeholder');
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`image-placeholder absolute inset-0 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-xs font-medium ${imagePath ? 'hidden' : 'flex'}`}>
                  {property.nickname.charAt(0)}
                </div>
              </div>
              <div className="text-left min-w-0">
                <div className={`text-sm font-medium truncate ${
                  isSelected 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {property.nickname}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                  {property.address.split(',')[0]}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

