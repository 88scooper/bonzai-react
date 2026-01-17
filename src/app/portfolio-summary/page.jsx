"use client";

// Note: Route segment config moved to layout.jsx for Next.js 16 compatibility

import Layout from "@/components/Layout.jsx";
import { RequireAuth, useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import AnnualAssumptionsModal from "@/components/AnnualAssumptionsModal";
import { Settings, GripVertical, Building2, PiggyBank, FileSpreadsheet, BarChart3, PieChart as PieChartIcon, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProperties, usePortfolioMetrics, usePropertyContext } from "@/context/PropertyContext";
import { formatCurrency, formatPercentage } from "@/utils/formatting";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';


const highlightedMetricIds = ['portfolioValue', 'equity', 'mortgageDebt'];

// Color palette for pie charts - high contrast colors for better visibility
const COLORS = [
  '#205A3E', // primary emerald green
  '#E16262', // red
  '#3B82F6', // blue
  '#F59E0B', // amber/orange
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#10B981', // bright emerald
];

const metricPresets = {
  essentials: {
    label: "Essential View",
    description: "Focus on equity, debt, and cash performance",
    visibleIds: [
      'portfolioValue',
      'equity',
      'mortgageDebt',
      'monthlyCashFlow',
      'netOperatingIncome',
      'overallCapRate'
    ],
  },
  cashFlow: {
    label: "Cash Flow Focus",
    description: "Track income, expenses, and NOI together",
    visibleIds: [
      'portfolioValue',
      'equity',
      'mortgageDebt',
      'annualRevenue',
      'annualExpenses',
      'monthlyCashFlow',
      'netOperatingIncome',
      'blendedCashOnCash'
    ],
  },
  taxPrep: {
    label: "Tax Season",
    description: "See deductible costs and goals at a glance",
    visibleIds: [
      'portfolioValue',
      'equity',
      'mortgageDebt',
      'annualDeductibleExpenses',
      'annualExpenses',
      'financialGoals',
      'portfolioLTV',
      'blendedCashOnCash'
    ],
  },
};

// Sortable Metric Item Component
function SortableMetricItem({ metric, onToggleVisibility }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: metric.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      <input
        type="checkbox"
        checked={metric.isVisible}
        onChange={() => onToggleVisibility(metric.id)}
        className="w-4 h-4 text-[#205A3E] bg-gray-100 border-gray-300 rounded focus:ring-[#205A3E] focus:ring-2"
      />
      <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">{metric.name}</span>
    </div>
  );
}

const isValidDateValue = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const formatDateDisplay = (value, options, fallback) => {
  if (!value) {
    return fallback ?? "N/A";
  }

  if (!isValidDateValue(value)) {
    return fallback ?? (typeof value === "string" ? value : "N/A");
  }

  return new Date(value).toLocaleDateString("en-CA", options);
};

/**
 * Calculate actual-to-date values for current year + forecast for remainder
 * @param {Object} property - Property object with expenseHistory
 * @param {Date} today - Current date (defaults to now)
 * @returns {Object} Actual income/expenses to date, forecast for remainder, and combined annual values
 */
function calculateActualPlusForecast(property, today = new Date()) {
  if (!property) {
    return {
      actual: { income: 0, operatingExpenses: 0, mortgagePayments: 0, cashFlow: 0 },
      forecast: { income: 0, operatingExpenses: 0, mortgagePayments: 0, cashFlow: 0 },
      annual: { income: 0, operatingExpenses: 0, mortgagePayments: 0, cashFlow: 0 },
      monthsElapsed: 0,
      monthsRemaining: 12
    };
  }
  const currentYear = today.getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);
  
  // Calculate months elapsed (Jan = 1, Feb = 2, etc.)
  const monthsElapsed = Math.max(1, today.getMonth() + 1);
  const monthsRemaining = Math.max(0, 12 - monthsElapsed);
  
  // Calculate actual data from Jan 1 to today
  let actualIncome = 0;
  let actualOperatingExpenses = 0;
  
  // Sum actual expenses from expenseHistory
  if (property.expenseHistory && Array.isArray(property.expenseHistory)) {
    property.expenseHistory.forEach(expense => {
      const expenseDate = new Date(expense.date);
      if (expenseDate >= yearStart && expenseDate <= today) {
        // Separate income (rent payments) from expenses
        if (expense.category === 'Rent' || expense.category === 'Income' || expense.description?.toLowerCase().includes('rent')) {
          actualIncome += expense.amount || 0;
        } else {
          actualOperatingExpenses += expense.amount || 0;
        }
      }
    });
  }
  
  // Calculate actual rent income (if no expenseHistory income, estimate from monthly rent)
  const monthlyRent = property.rent?.monthlyRent || 0;
  if (actualIncome === 0 && monthlyRent > 0) {
    actualIncome = monthlyRent * monthsElapsed;
  }
  
  // Calculate forecast for remainder of year
  const forecastIncome = monthlyRent * monthsRemaining;
  
  // Calculate monthly operating expenses average
  const monthlyOperatingExpenses =
    (property.monthlyExpenses?.propertyTax || 0) +
    (property.monthlyExpenses?.condoFees || 0) +
    (property.monthlyExpenses?.insurance || 0) +
    (property.monthlyExpenses?.maintenance || 0) +
    (property.monthlyExpenses?.professionalFees || 0) +
    (property.monthlyExpenses?.utilities || 0);
  
  // If we have actual expenses, calculate average monthly rate; otherwise use monthly estimate
  const actualMonthlyAvg = monthsElapsed > 0 && actualOperatingExpenses > 0
    ? actualOperatingExpenses / monthsElapsed
    : monthlyOperatingExpenses;
  const forecastOperatingExpenses = actualMonthlyAvg * monthsRemaining;
  
  // Forecast mortgage payments (same monthly amount for remainder)
  const monthlyMortgagePayment = property.monthlyExpenses?.mortgagePayment || 0;
  const forecastMortgagePayments = monthlyMortgagePayment * monthsRemaining;
  
  // Calculate actual mortgage payments to date
  const actualMortgagePayments = monthlyMortgagePayment * monthsElapsed;
  
  // Combined annual values
  const annualIncome = actualIncome + forecastIncome;
  const annualOperatingExpenses = actualOperatingExpenses + forecastOperatingExpenses;
  const annualMortgagePayments = actualMortgagePayments + forecastMortgagePayments;
  const annualCashFlow = annualIncome - annualOperatingExpenses - annualMortgagePayments;
  
  return {
    actual: {
      income: actualIncome,
      operatingExpenses: actualOperatingExpenses,
      mortgagePayments: actualMortgagePayments,
      cashFlow: actualIncome - actualOperatingExpenses - actualMortgagePayments
    },
    forecast: {
      income: forecastIncome,
      operatingExpenses: forecastOperatingExpenses,
      mortgagePayments: forecastMortgagePayments,
      cashFlow: forecastIncome - forecastOperatingExpenses - forecastMortgagePayments
    },
    annual: {
      income: annualIncome,
      operatingExpenses: annualOperatingExpenses,
      mortgagePayments: annualMortgagePayments,
      cashFlow: annualCashFlow
    },
    monthsElapsed,
    monthsRemaining
  };
}

// Client component that contains all the page logic
// This is wrapped in Suspense in the default export to handle any potential useSearchParams usage
function PortfolioSummaryContent() {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const { user } = useAuth();
  const { currentAccount } = useAccount();

  // Check for demo mode on client side only to avoid hydration mismatch
  // Only use sessionStorage to avoid any URL search param issues during static generation
  // NOTE: We explicitly avoid using useSearchParams() here to prevent build errors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // If user is authenticated, don't show demo mode
      // Also check if current account is marked as demo
      if (user && currentAccount) {
        // Real authenticated user - check if account is demo account
        const isDemo = currentAccount.isDemo === true;
        setIsDemoMode(isDemo);
      } else if (!user) {
        // Not authenticated - check sessionStorage
        const demo = sessionStorage.getItem('demoMode') === 'true';
        setIsDemoMode(demo);
      } else {
        // User is authenticated but account not loaded yet
        setIsDemoMode(false);
      }
    }
  }, [user, currentAccount]);

  // Get data from PropertyContext
  const { calculationsComplete } = usePropertyContext();
  const properties = useProperties();
  const portfolioMetrics = usePortfolioMetrics();
  
  // Timeout fallback - force show content after 1.5 seconds to prevent infinite loading
  const [forceShow, setForceShow] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setForceShow(true);
    }, 1500);
    return () => clearTimeout(timeout);
  }, []);
  
  // State for settings dropdown visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  const [activePreset, setActivePreset] = useState(null);

  // Check if onboarding step 4 should be shown as modal
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  
  // Check if onboarding is incomplete
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);
  const [incompleteOnboardingStep, setIncompleteOnboardingStep] = useState(null);

  // Annual assumptions review modal
  const [showAnnualAssumptionsModal, setShowAnnualAssumptionsModal] = useState(false);

  // Default metrics configuration - Reordered according to new layout
  const defaultMetrics = [
    { id: 'portfolioValue', name: 'Total Estimated Portfolio Value', isVisible: true },
    { id: 'equity', name: 'Forecasted Annual Equity', isVisible: true },
    { id: 'mortgageDebt', name: 'Annual Debt Service', isVisible: true },
    { id: 'netOperatingIncome', name: 'Annual Net Operating Income', isVisible: true },
    { id: 'overallCapRate', name: 'Overall Cap Rate', isVisible: true },
    { id: 'blendedCashOnCash', name: 'Blended Cash on Cash', isVisible: true },
    { id: 'avgRentPerSqFt', name: 'Average Rent Per Square Foot', isVisible: true },
    { id: 'totalProperties', name: 'Total Properties & Units', isVisible: true },
    { id: 'financialGoals', name: 'Financial Goals', isVisible: true },
  ];

  // State for metrics (array of objects to preserve order and visibility)
  const [metrics, setMetrics] = useState(defaultMetrics);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Check for onboarding step 4 on mount
  useEffect(() => {
    // Don't show onboarding modal in demo mode
    if (isDemoMode) {
      setShowOnboardingModal(false);
      return;
    }
    
    // Check if onboarding is in progress and we should show step 4
    const onboardingInProgress = typeof window !== 'undefined' && 
      sessionStorage.getItem('onboarding_in_progress') === 'true';
    const shouldShowStep4 = typeof window !== 'undefined' && 
      sessionStorage.getItem('onboarding_step_4') === 'true';
    
    if (onboardingInProgress && shouldShowStep4) {
      setShowOnboardingModal(true);
    }
  }, [isDemoMode]);

  // Check if onboarding is incomplete and show prompt
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Don't show onboarding prompt in demo mode
    if (isDemoMode) {
      setShowOnboardingPrompt(false);
      return;
    }
    
    // Check if there's a saved onboarding step (user partially completed onboarding)
    const savedStep = sessionStorage.getItem('onboarding_current_step');
    const onboardingInProgress = sessionStorage.getItem('onboarding_in_progress') === 'true';
    
    // Check if user has no properties at all
    const hasNoProperties = !properties || properties.length === 0;
    
    // Check if all properties have complete financial data
    const hasIncompleteProperties = properties && properties.length > 0 && properties.some(property => {
      // Check if property is missing mortgage, tenant, or expenses
      const hasMortgage = property.mortgage && property.mortgage.lender && property.mortgage.originalAmount > 0;
      // Check for tenant - support both old format (tenant.name) and new format (tenantNames array)
      const hasTenant = property.tenant && (
        (property.tenant.name && property.tenant.rent > 0) ||
        (property.tenant.tenantNames && Array.isArray(property.tenant.tenantNames) && property.tenant.tenantNames.length > 0 && property.tenant.rent > 0)
      );
      const hasExpenses = property.monthlyExpenses && (
        property.monthlyExpenses.propertyTax > 0 ||
        property.monthlyExpenses.condoFees > 0 ||
        property.monthlyExpenses.insurance > 0 ||
        property.monthlyExpenses.maintenance > 0 ||
        property.monthlyExpenses.professionalFees > 0 ||
        property.monthlyExpenses.utilities > 0 ||
        property.monthlyExpenses.other > 0
      );
      
      // Property is incomplete if it's missing any of these
      return !hasMortgage || !hasTenant || !hasExpenses;
    });
    
    // Show prompt if:
    // 1. There's a saved step (user was in the middle of onboarding), OR
    // 2. User has no properties at all, OR
    // 3. There are properties but they don't have complete financial data
    if (!showOnboardingModal) {
      if (savedStep) {
        const step = parseInt(savedStep, 10);
        // Show prompt if step is between 1 and 4 (incomplete onboarding)
        if (step >= 1 && step <= 4) {
          // Always show if there's a saved step (user was in onboarding)
          setIncompleteOnboardingStep(step);
          setShowOnboardingPrompt(true);
        } else if (hasNoProperties || hasIncompleteProperties) {
          // Even if step is invalid, show if properties are missing or incomplete
          setIncompleteOnboardingStep(hasNoProperties ? 2 : 5);
          setShowOnboardingPrompt(true);
        } else {
          setShowOnboardingPrompt(false);
        }
      } else if (hasNoProperties) {
        // No saved step and no properties - show prompt to start onboarding
        setIncompleteOnboardingStep(2);
        setShowOnboardingPrompt(true);
      } else if (hasIncompleteProperties) {
        // No saved step but properties are incomplete - show prompt to complete financial data
        setIncompleteOnboardingStep(5);
        setShowOnboardingPrompt(true);
      } else {
        // No saved step and all properties complete - hide prompt
        setShowOnboardingPrompt(false);
      }
    }
  }, [showOnboardingModal, properties, isDemoMode]);

  // Check if annual assumptions review is needed
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Don't show if onboarding modal is showing
    if (showOnboardingModal) return;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0 = January, 11 = December
    
    // Only show in January (month 0)
    if (currentMonth !== 0) return;
    
    // Check if user has already reviewed assumptions for this year
    const reviewedYears = JSON.parse(localStorage.getItem('annualAssumptionsReviewedYears') || '[]');
    const hasReviewedThisYear = reviewedYears.includes(currentYear);
    
    // Show modal if it's January and user hasn't reviewed yet
    if (!hasReviewedThisYear) {
      setShowAnnualAssumptionsModal(true);
    }
  }, [showOnboardingModal]);

  // Initialize metrics from localStorage or use default
  useEffect(() => {
    // Force reset to new default order for now
    console.log('Forcing reset to new default metrics order');
    setMetrics(defaultMetrics);
    localStorage.setItem('portfolio-dashboard-layout', JSON.stringify(defaultMetrics));
  }, []);

  // Save metrics to localStorage whenever metrics change
  useEffect(() => {
    if (metrics.length > 0) {
      localStorage.setItem('portfolio-dashboard-layout', JSON.stringify(metrics));
    }
  }, [metrics]);

  // Handle metric visibility toggle
  const toggleMetricVisibility = (metricId) => {
    setMetrics(prev => prev.map(metric => 
      metric.id === metricId 
        ? { ...metric, isVisible: !metric.isVisible }
        : metric
    ));
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setMetrics((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handlePresetSelect = (presetKey) => {
    const preset = metricPresets[presetKey];
    if (!preset) return;

    setMetrics((prev) => {
      const presetOrder = preset.visibleIds;
      const updated = prev
        .map((metric) => ({
          ...metric,
          isVisible: presetOrder.includes(metric.id),
        }))
        .sort((a, b) => {
          const aIndex = presetOrder.indexOf(a.id);
          const bIndex = presetOrder.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) {
            return 0;
          }
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      return updated;
    });

    setActivePreset(presetKey);
    setIsSettingsOpen(false);
  };

  // Data is now coming from PropertyContext
  
  // Calculate total monthly expenses
  const totalMonthlyOperatingExpenses = portfolioMetrics.totalMonthlyOperatingExpenses || 0;
  const totalMonthlyDebtService = portfolioMetrics.totalMonthlyDebtService || 0;
  const totalMonthlyExpenses = portfolioMetrics.totalMonthlyExpenses || (totalMonthlyOperatingExpenses + totalMonthlyDebtService);
  // Calculate annual values using calculateActualPlusForecast for consistency
  // This ensures all calculations use the same method (actual + forecast)
  const totalAnnualDebtService = (properties || []).reduce((sum, property) => {
    const { annual } = calculateActualPlusForecast(property);
    return sum + annual.mortgagePayments;
  }, 0);
  
  const totalAnnualOperatingExpenses = (properties || []).reduce((sum, property) => {
    const { annual } = calculateActualPlusForecast(property);
    return sum + annual.operatingExpenses;
  }, 0);
  
  const totalRevenue = (properties || []).reduce((sum, property) => {
    const { annual } = calculateActualPlusForecast(property);
    return sum + annual.income;
  }, 0);

  // Calculate additional metrics
  const totalMortgageDebt = portfolioMetrics.totalMortgageBalance || 0;

  // Calculate annual cash flow from displayed values for consistency
  // This ensures cash flow matches: Revenue - Operating Expenses - Debt Service
  const annualCashFlow = totalRevenue - totalAnnualOperatingExpenses - totalAnnualDebtService;
    const netOperatingIncome = portfolioMetrics.netOperatingIncome || 0;
  const monthlyCashFlowValue = portfolioMetrics.totalMonthlyCashFlow || 0;

  // Calculate portfolio totals from actual data
  const totalPortfolioValue = portfolioMetrics.totalValue || 0;
  const totalEquity = portfolioMetrics.totalEquity || 0;
  
  // Calculate total purchase prices and appreciation
  const totalPurchasePrices = (properties || []).reduce((sum, property) => {
    const price = Number(property?.purchasePrice) || 0;
    return sum + (isNaN(price) ? 0 : price);
  }, 0);
  const appreciationPercentage = totalPurchasePrices > 0 && !isNaN(totalPortfolioValue) && !isNaN(totalPurchasePrices)
    ? Math.floor(((Number(totalPortfolioValue) - totalPurchasePrices) / totalPurchasePrices) * 100)
    : 0;
  const totalAppreciation = totalPortfolioValue - totalPurchasePrices;
  
  // Calculate equity and debt as percentages of total portfolio value
  const equityPercentage = totalPortfolioValue > 0 && !isNaN(totalEquity) && !isNaN(totalPortfolioValue)
    ? Math.round((totalEquity / totalPortfolioValue) * 100)
    : 0;
  const debtPercentage = totalPortfolioValue > 0 && !isNaN(totalMortgageDebt) && !isNaN(totalPortfolioValue)
    ? Math.round((totalMortgageDebt / totalPortfolioValue) * 100)
    : 0;
  const totalProperties = portfolioMetrics.totalProperties || 0;
  const totalUnits = (properties || []).reduce((sum, property) => sum + (property.units || 0), 0);
  const totalSquareFeet = (properties || []).reduce((sum, property) => sum + (property.size || property.squareFootage || 0), 0);
  const averageRentPerSqFt = totalSquareFeet > 0 ? (portfolioMetrics.totalMonthlyRent || 0) / totalSquareFeet : 0;
  const averageOccupancyRate = portfolioMetrics.averageOccupancy || 0;
  const averageCapRate = portfolioMetrics.averageCapRate || 0;

  const occupiedPropertiesCount = (properties || []).filter((property) => Boolean(property?.tenant?.name)).length;
  const occupancyRate = (properties || []).length > 0 ? occupiedPropertiesCount / (properties || []).length : 0;

  const expenseAggregates = (properties || []).reduce(
    (acc, property) => {
      const monthlyExpenses = property.monthlyExpenses || {};

      acc.propertyTax += (monthlyExpenses.propertyTax || 0) * 12;
      acc.insurance += (monthlyExpenses.insurance || 0) * 12;
      acc.maintenance += (monthlyExpenses.maintenance || 0) * 12;
      acc.utilities += (monthlyExpenses.utilities || 0) * 12;
      acc.condoFees += (monthlyExpenses.condoFees || 0) * 12;
      acc.professionalFees += (monthlyExpenses.professionalFees || 0) * 12;
      acc.mortgagePayment += (monthlyExpenses.mortgagePayment || 0) * 12;

      return acc;
    },
    {
      propertyTax: 0,
      insurance: 0,
      maintenance: 0,
      utilities: 0,
      condoFees: 0,
      professionalFees: 0,
      mortgagePayment: 0,
    }
  );

  const expenseCategoryList = [
    { id: 'propertyTax', label: 'Property Tax', value: expenseAggregates.propertyTax },
    { id: 'insurance', label: 'Insurance', value: expenseAggregates.insurance },
    { id: 'maintenance', label: 'Maintenance', value: expenseAggregates.maintenance },
    { id: 'utilities', label: 'Utilities', value: expenseAggregates.utilities },
    { id: 'condoFees', label: 'Condo Fees', value: expenseAggregates.condoFees },
    { id: 'professionalFees', label: 'Professional Fees', value: expenseAggregates.professionalFees },
    { id: 'mortgagePayment', label: 'Mortgage Payment - Principal & Interest', value: expenseAggregates.mortgagePayment },
  ]
    .filter((category) => category.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const totalTrackedExpenses = expenseCategoryList.reduce((sum, category) => sum + category.value, 0);

  // Calculate deductible expense aggregates (operating expenses + mortgage interest, but NOT mortgage principal)
  const deductibleExpenseAggregates = (properties || []).reduce(
    (acc, property) => {
      const monthlyExpenses = property.monthlyExpenses || {};
      
      // Operating expenses (all deductible)
      acc.propertyTax += (monthlyExpenses.propertyTax || 0) * 12;
      acc.insurance += (monthlyExpenses.insurance || 0) * 12;
      acc.maintenance += (monthlyExpenses.maintenance || 0) * 12;
      acc.utilities += (monthlyExpenses.utilities || 0) * 12;
      acc.condoFees += (monthlyExpenses.condoFees || 0) * 12;
      acc.professionalFees += (monthlyExpenses.professionalFees || 0) * 12;
      
      // Mortgage interest (deductible, but not principal)
      const monthlyInterest = monthlyExpenses.mortgageInterest || 0;
      acc.mortgageInterest += monthlyInterest * 12;

      return acc;
    },
    {
      propertyTax: 0,
      insurance: 0,
      maintenance: 0,
      utilities: 0,
      condoFees: 0,
      professionalFees: 0,
      mortgageInterest: 0,
    }
  );

  // Build deductible expense category list
  // Ensure mortgage interest is always included if it has a value
  const allDeductibleCategories = [
    { id: 'propertyTax', label: 'Property Tax', value: deductibleExpenseAggregates.propertyTax },
    { id: 'insurance', label: 'Insurance', value: deductibleExpenseAggregates.insurance },
    { id: 'maintenance', label: 'Maintenance', value: deductibleExpenseAggregates.maintenance },
    { id: 'utilities', label: 'Utilities', value: deductibleExpenseAggregates.utilities },
    { id: 'condoFees', label: 'Condo Fees', value: deductibleExpenseAggregates.condoFees },
    { id: 'professionalFees', label: 'Professional Fees', value: deductibleExpenseAggregates.professionalFees },
    { id: 'mortgageInterest', label: 'Mortgage Payment - Interest', value: deductibleExpenseAggregates.mortgageInterest },
  ]
    .filter((category) => category.value > 0);
  
  // Sort by value, but ensure mortgage interest is included
  const sorted = allDeductibleCategories.sort((a, b) => b.value - a.value);
  const mortgageInterestCategory = sorted.find(cat => cat.id === 'mortgageInterest');
  const otherCategories = sorted.filter(cat => cat.id !== 'mortgageInterest');
  
  // Show top 5 other categories + mortgage interest (if it has value)
  const deductibleExpenseCategoryList = mortgageInterestCategory && mortgageInterestCategory.value > 0
    ? [...otherCategories.slice(0, 4), mortgageInterestCategory].sort((a, b) => b.value - a.value)
    : otherCategories.slice(0, 5);

  const totalTrackedDeductibleExpenses = deductibleExpenseCategoryList.reduce((sum, category) => sum + category.value, 0);

  // Calculate new KPIs
  // 1. Overall Cap Rate = Total Annual NOI / Total Estimated Portfolio Value
  // Calculate NOI from actual + forecast for each property
  const totalAnnualNOI = (properties || []).reduce((sum, property) => {
    const { annual } = calculateActualPlusForecast(property);
    return sum + (annual.income - annual.operatingExpenses);
  }, 0);
  const overallCapRate = totalPortfolioValue > 0 ? (totalAnnualNOI / totalPortfolioValue) * 100 : 0;

  // 2. Portfolio LTV = Total Mortgage Debt / Total Estimated Portfolio Value
  const portfolioLTV = totalPortfolioValue > 0 ? (totalMortgageDebt / totalPortfolioValue) * 100 : 0;

  // 3. Blended Cash on Cash Return = Total Annual Cash Flow Before Tax / Total Initial Cash Invested
  const totalAnnualCashFlowBeforeTax = annualCashFlow; // Use the calculated value above
  const totalInitialCashInvested = (properties || []).reduce((sum, property) => {
    const hasTotalInvestment = typeof property.totalInvestment === "number" && !Number.isNaN(property.totalInvestment);
    const fallbackDownPayment = Math.max(
      0,
      (property.purchasePrice || 0) - (property.mortgage?.originalAmount || 0)
    );

    return sum + (hasTotalInvestment ? property.totalInvestment : fallbackDownPayment);
  }, 0);
  const blendedCashOnCashReturn = totalInitialCashInvested > 0 ? (totalAnnualCashFlowBeforeTax / totalInitialCashInvested) * 100 : 0;

  // 4. Anticipated Annual Equity Built = Sum of annual principal payments + annual appreciation
  // This uses actual principal payments to date + forecasted for remainder of year
  const annualEquityBuilt = (properties || []).reduce((sum, property) => {
    let propertyEquityBuilt = 0;
    
    // Add annual principal payments
    if (property.mortgage && property.monthlyExpenses?.mortgagePrincipal) {
      const monthlyPrincipal = property.monthlyExpenses.mortgagePrincipal;
      const annualPrincipal = monthlyPrincipal * 12;
      propertyEquityBuilt += annualPrincipal;
    }
    
    // Add annual appreciation (estimated based on historical appreciation)
    const purchasePrice = property.purchasePrice || 0;
    const currentValue = property.currentMarketValue || property.currentValue || purchasePrice;
    if (currentValue > purchasePrice && purchasePrice > 0) {
      const totalAppreciation = currentValue - purchasePrice;
      
      // Calculate years held
      let yearsHeld = 1;
      try {
        if (property.purchaseDate) {
          const currentYear = new Date().getFullYear();
          const purchaseYear = new Date(property.purchaseDate).getFullYear();
          yearsHeld = Math.max(1, currentYear - purchaseYear);
        }
      } catch (error) {
        yearsHeld = 1;
      }
      
      // Estimate annual appreciation based on historical appreciation
      const annualAppreciation = yearsHeld > 0 ? totalAppreciation / yearsHeld : 0;
      propertyEquityBuilt += annualAppreciation;
    }
    
    return sum + propertyEquityBuilt;
  }, 0);

  // Calculate previous year's equity built for YoY comparison
  // Estimate based on same calculation but for previous year
  const previousYearEquityBuilt = (properties || []).reduce((sum, property) => {
    let propertyEquityBuilt = 0;
    
    // Estimate previous year's principal payments (slightly less as mortgage amortizes)
    // Use 95% of current principal as estimate for previous year
    if (property.mortgage && property.monthlyExpenses?.mortgagePrincipal) {
      const monthlyPrincipal = property.monthlyExpenses.mortgagePrincipal;
      const annualPrincipal = monthlyPrincipal * 12 * 0.95; // Slightly less last year
      propertyEquityBuilt += annualPrincipal;
    }
    
    // Previous year's appreciation (same annual rate, but one year less total appreciation)
    const purchasePrice = property.purchasePrice || 0;
    const currentValue = property.currentMarketValue || property.currentValue || purchasePrice;
    if (currentValue > purchasePrice && purchasePrice > 0) {
      const totalAppreciation = currentValue - purchasePrice;
      
      let yearsHeld = 1;
      try {
        if (property.purchaseDate) {
          const currentYear = new Date().getFullYear();
          const purchaseYear = new Date(property.purchaseDate).getFullYear();
          yearsHeld = Math.max(1, currentYear - purchaseYear);
        }
      } catch (error) {
        yearsHeld = 1;
      }
      
      // Annual appreciation rate (same as current year)
      const annualAppreciation = yearsHeld > 0 ? totalAppreciation / yearsHeld : 0;
      propertyEquityBuilt += annualAppreciation;
    }
    
    return sum + propertyEquityBuilt;
  }, 0);

  // Calculate YoY increase
  const yoyEquityIncrease = previousYearEquityBuilt > 0 
    ? ((annualEquityBuilt - previousYearEquityBuilt) / previousYearEquityBuilt) * 100 
    : 0;

  const capRateTone = overallCapRate >= 5
    ? 'positive'
    : overallCapRate >= 3.5
      ? 'neutral'
      : 'warning';
  const capRateMessage = overallCapRate >= 5
    ? 'Healthy versus GTA benchmark (5–7%).'
    : overallCapRate >= 3.5
      ? 'Slightly below target; review rent and operating costs.'
      : 'Cap rate under 3.5%; prioritize NOI improvements.';

  const ltvTone = portfolioLTV <= 75
    ? 'positive'
    : portfolioLTV <= 85
      ? 'neutral'
      : 'warning';
  const ltvMessage = portfolioLTV <= 75
    ? 'Comfortable cushion under the common 80% lender threshold.'
    : portfolioLTV <= 85
      ? 'Above the ideal 80%; plan to deleverage or grow equity.'
      : 'LTV nearing risk threshold; consider paying down debt.';

  const cashFlowTone = annualCashFlow >= 0 ? 'positive' : 'warning';
  const cashFlowMessage = annualCashFlow >= 0
    ? 'Portfolio is generating positive annual cash flow.'
    : 'Negative cash flow; address vacancy or expense spikes.';

  const cashOnCashTone = blendedCashOnCashReturn >= 8
    ? 'positive'
    : blendedCashOnCashReturn >= 5
      ? 'neutral'
      : 'warning';
  const cashOnCashMessage = blendedCashOnCashReturn >= 8
    ? 'In line with strong cash-on-cash targets (8–12%).'
    : blendedCashOnCashReturn >= 5
      ? 'Slightly below optimal range; evaluate rents or financing.'
      : 'Under 5%; revisit acquisition assumptions or expenses.';

  const highlightedMetrics = metrics.filter(
    (metric) => metric.isVisible && highlightedMetricIds.includes(metric.id)
  );
  const standardMetrics = metrics.filter(
    (metric) => metric.isVisible && !highlightedMetricIds.includes(metric.id)
  );
  const visibleMetricCount = metrics.filter((metric) => metric.isVisible).length;

  // Show loading state until calculations are complete to prevent hydration mismatch
  // Show content if calculations are complete OR if we have properties OR if timeout elapsed
  const shouldShowContent = calculationsComplete || forceShow || (properties && Array.isArray(properties));
  
  if (!shouldShowContent) {
    return (
      <RequireAuth>
        <Layout>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E]"></div>
                <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Loading portfolio data...</span>
              </div>
            </div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <Layout>
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-800 dark:text-emerald-200 font-medium">📊 Demo Mode - Read Only</span>
                <span className="text-sm text-emerald-700 dark:text-emerald-300">You're viewing a read-only demo portfolio. Sign up to create your own portfolio!</span>
              </div>
              <a 
                href="/" 
                className="text-sm text-emerald-700 dark:text-emerald-300 hover:underline font-medium"
              >
                Get Started →
              </a>
            </div>
          </div>
        )}
        {/* Onboarding Wizard Modal Overlay */}
        {showOnboardingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <OnboardingWizard 
                modal={true}
                onComplete={() => {
                  setShowOnboardingModal(false);
                  setShowOnboardingPrompt(false);
                  if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('onboarding_in_progress');
                    sessionStorage.removeItem('onboarding_current_step');
                  }
                }} 
              />
            </div>
          </div>
        )}

        {/* Annual Assumptions Review Modal */}
        <AnnualAssumptionsModal
          isOpen={showAnnualAssumptionsModal}
          onClose={() => setShowAnnualAssumptionsModal(false)}
          currentYear={new Date().getFullYear()}
        />
        
        {/* Onboarding Incomplete Prompt */}
        {showOnboardingPrompt && !showOnboardingModal && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Complete Your Onboarding
                  </h3>
                  {incompleteOnboardingStep && (
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                      {(() => {
                        // Weight Step 5 more heavily
                        // Steps 1-4: 10% each (40% total)
                        // Step 5: 60% (weighted heavier, shows 70% when on step 5)
                        if (incompleteOnboardingStep <= 4) {
                          return Math.round((incompleteOnboardingStep - 1) * 10);
                        } else {
                          // Step 5 is weighted heavier - show 70% when on step 5
                          return 70;
                        }
                      })()}% Complete
                    </span>
                  )}
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  You've partially completed the onboarding process. Would you like to continue where you left off?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowOnboardingModal(true);
                      setShowOnboardingPrompt(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Resume Onboarding
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="portfolio-summary-scale">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Portfolio Summary</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Overview of your real estate investment performance and key metrics for {new Date().getFullYear()}.
                  Values shown combine actual data from January 1 to today plus forecast for the remainder of the year.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Settings Button */}
              <div className="relative" ref={settingsRef}>
                <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Customize portfolio"
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              {/* Customization Dropdown */}
              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-black/10 dark:border-white/10 py-4 z-50">
                  <div className="px-4 pb-3 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Customize Metrics</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Select which metrics to display on your portfolio
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setMetrics(defaultMetrics);
                          setActivePreset(null);
                        }}
                        className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        Reset to Default
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Quick views
                    </h4>
                    <div className="mt-3 space-y-2">
                      {Object.entries(metricPresets).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => handlePresetSelect(key)}
                          className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                            activePreset === key
                              ? 'border-[#205A3E] bg-[#205A3E]/10 text-[#205A3E] dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span className="block font-medium">{preset.label}</span>
                          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                            {preset.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="px-4 py-3 max-h-96 overflow-y-auto">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={metrics.map(metric => metric.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
                          {metrics.map((metric) => (
                            <SortableMetricItem
                              key={metric.id}
                              metric={metric}
                              onToggleVisibility={toggleMetricVisibility}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {highlightedMetrics.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {highlightedMetrics.map((metric) => {
                switch (metric.id) {
                  case 'portfolioValue':
                    return (
                      <TopMetricCard
                        key={metric.id}
                        title="Total Estimated Portfolio Value"
                        value={new Intl.NumberFormat('en-CA', {
                          style: 'currency',
                          currency: 'CAD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(Math.floor(totalPortfolioValue || 0))}
                        icon={Building2}
                        accent="emerald"
                        supporting={
                          <>
                            <div className="whitespace-nowrap overflow-hidden">
                              {new Intl.NumberFormat('en-CA', {
                                style: 'currency',
                                currency: 'CAD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(Math.floor(totalEquity))} equity ({equityPercentage}%) • {new Intl.NumberFormat('en-CA', {
                                style: 'currency',
                                currency: 'CAD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(Math.floor(totalMortgageDebt))} debt ({debtPercentage}%)
                            </div>
                            <div className="mt-1 text-xs opacity-90">
                              Portfolio LTV: {Math.floor(portfolioLTV)}%
                            </div>
                            <div className="mt-1 text-xs opacity-90">
                              Estimated Appreciation: {new Intl.NumberFormat('en-CA', {
                                style: 'currency',
                                currency: 'CAD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(Math.floor(totalAppreciation))} ({appreciationPercentage}%)
                            </div>
                          </>
                        }
                        supportingSize="dynamic"
                        iconTooltip="The estimated current market value of all properties in your portfolio, based on current market valuations. Values are rounded down to the nearest dollar. LTV (Loan-to-Value) shows the percentage of your portfolio that is financed."
                      />
                    );
                  case 'equity': {
                    return (
                      <TopMetricCard
                        key={metric.id}
                        title="Forecasted Annual Equity"
                        value={new Intl.NumberFormat('en-CA', {
                          style: 'currency',
                          currency: 'CAD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(Math.floor(annualEquityBuilt))}
                        icon={PiggyBank}
                        accent="teal"
                        iconBadge="$"
                        iconBadgePosition="top-center"
                        supporting={
                          <>
                            <div className="whitespace-nowrap overflow-hidden">
                              Current total equity: {new Intl.NumberFormat('en-CA', {
                                style: 'currency',
                                currency: 'CAD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(Math.floor(totalEquity))}, Year Over Year: {yoyEquityIncrease >= 0 ? '+' : ''}{yoyEquityIncrease.toFixed(1)}% increase
                            </div>
                            <div className="mt-1 text-xs opacity-90">
                              Includes principal payments + estimated appreciation
                            </div>
                          </>
                        }
                        supportingSize="dynamic"
                        iconTooltip="The projected equity you will earn this calendar year through principal payments and estimated property appreciation. This forecast helps you understand how your portfolio equity is growing over time."
                      />
                    );
                  }
                  case 'mortgageDebt':
                    return (
                      <TopMetricCard
                        key={metric.id}
                        title="Annual Debt Service"
                        value={new Intl.NumberFormat('en-CA', {
                          style: 'currency',
                          currency: 'CAD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(Math.floor(totalAnnualDebtService))}
                        icon={FileSpreadsheet}
                        accent="amber"
                        supporting={
                          <>
                            <div className="whitespace-nowrap overflow-hidden">
                              Monthly debt service: {new Intl.NumberFormat('en-CA', {
                                style: 'currency',
                                currency: 'CAD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(Math.floor(totalMonthlyDebtService))}
                            </div>
                            <div className="mt-1 text-xs opacity-90">
                              Principal + interest payments
                            </div>
                          </>
                        }
                        supportingSize="dynamic"
                        iconTooltip="Your total monthly mortgage payments (principal and interest) across all properties. This represents your monthly debt obligations and helps you understand cash flow requirements."
                      />
                    );
                  default:
                    return null;
                }
              })}
            </div>
          )}

          <IncomeWaterfallCard
            totalRevenue={totalRevenue}
            operatingExpenses={totalAnnualOperatingExpenses}
            debtService={totalAnnualDebtService}
            netCashFlow={annualCashFlow}
          />
          <div className="mt-6 grid gap-6 grid-cols-1 md:grid-cols-3">
            <AnnualRentalIncomeCard
              properties={properties}
              totalMonthlyRent={portfolioMetrics.totalMonthlyRent || 0}
            />
            <AnnualExpensesCard
              totalAnnualOperatingExpenses={totalAnnualOperatingExpenses}
              totalAnnualDebtService={totalAnnualDebtService}
              properties={properties}
              expenseCategoryList={expenseCategoryList}
              totalTrackedExpenses={totalTrackedExpenses}
            />
            <AnnualDeductibleExpensesCard
              totalAnnualDeductibleExpenses={portfolioMetrics?.totalAnnualDeductibleExpenses || 0}
              properties={properties}
              deductibleExpenseCategoryList={deductibleExpenseCategoryList}
              totalTrackedDeductibleExpenses={totalTrackedDeductibleExpenses}
            />
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {visibleMetricCount === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Settings className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Metrics Selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
                  Please select key performance metrics to display on your dashboard. 
                  Use the settings button above to customize your view.
                </p>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2 bg-[#205A3E] text-white rounded-md hover:bg-[#1a4a32] transition-colors"
                >
                  Customize Dashboard
                </button>
              </div>
            ) : (
              standardMetrics.map(metric => {
                switch (metric.id) {
                  case 'portfolioValue':
                    return (
                      <MetricCard
                        key={metric.id}
                        title="Total Estimated Portfolio Value"
                        value={formatCurrency(totalPortfolioValue || 0)}
                        showInfoIcon={true}
                        tooltipText="The estimated current market value of all properties in your portfolio. LTV (Loan-to-Value) shows the percentage of your portfolio that is financed."
                        subtitle={`${formatCurrency(totalEquity)} equity (${equityPercentage}%) • ${formatCurrency(totalMortgageDebt)} debt (${debtPercentage}%) • LTV: ${Math.floor(portfolioLTV)}%`}
                      />
                    );
                  case 'equity': {
                    return (
                      <MetricCard
                        key={metric.id}
                        title="Forecasted Annual Equity"
                        value={formatCurrency(annualEquityBuilt)}
                        showInfoIcon={true}
                        tooltipText="The projected equity you will earn this calendar year through principal payments and estimated property appreciation. This forecast helps you understand how your portfolio equity is growing over time."
                        subtitle={`Current total equity: ${formatCurrency(totalEquity)} • YoY: ${yoyEquityIncrease >= 0 ? '+' : ''}${yoyEquityIncrease.toFixed(1)}% • Includes principal payments + estimated appreciation`}
                      />
                    );
                  }
                  case 'totalProperties':
                    return (
                      <MetricCard
                        key={metric.id}
                        title="Total Properties & Units"
                        showInfoIcon={true}
                        tooltipText="The total number of investment properties and rental units currently in your portfolio."
                        isMultiMetric={true}
                        multiMetrics={[
                          { label: "Properties", value: totalProperties.toString() },
                          { label: "Units", value: totalUnits.toString() }
                        ]}
                        statusMessage={`Occupancy: ${formatPercentage(occupancyRate)} of properties filled`}
                        statusTone={occupancyRate >= 0.9 ? 'positive' : occupancyRate >= 0.75 ? 'neutral' : 'warning'}
                      />
                    );
                  case 'occupancyRate':
                    return (
                      <MetricCard
                        key={metric.id}
                        title="Average Occupancy Rate"
                        value={formatPercentage(averageOccupancyRate)}
                        showInfoIcon={true}
                        tooltipText="The average percentage of occupied units across all properties in your portfolio."
                      />
                    );
                  case 'avgRentPerSqFt':
                    return (
                      <MetricCard
                        key={metric.id}
                        title="Average Rent Per Square Foot"
                        value={new Intl.NumberFormat('en-CA', {
                          style: 'currency',
                          currency: 'CAD',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(averageRentPerSqFt)}
                        showInfoIcon={true}
                        tooltipText="The average monthly rental income per square foot across all properties in your portfolio. This helps compare rental efficiency between properties of different sizes."
                      />
                    );
                  case 'financialGoals':
                    return (
                      <MetricCard
                        key={metric.id}
                        title={`Financial Goals ${new Date().getFullYear()}`}
                        showInfoIcon={true}
                        tooltipText="This card tracks your progress towards the financial goals set for the current year."
                        isMultiMetric={true}
                        multiMetrics={[
                          { label: "Portfolio Value", value: formatCurrency(totalPortfolioValue * 1.1) },
                          { label: "Cash Flow", value: formatCurrency(annualCashFlow * 1.2) }
                        ]}
                        statusMessage="Stay within 10% of your annual goals to remain on track."
                        statusTone="neutral"
                      />
                    );
                  case 'mortgageDebt':
                    return (
                      <MetricCard
                        key={metric.id}
                        title="Annual Debt Service"
                        value={formatCurrency(totalAnnualDebtService)}
                        isExpense={true}
                        showInfoIcon={true}
                        tooltipText="Your total monthly mortgage payments (principal and interest) across all properties. This represents your monthly debt obligations and helps you understand cash flow requirements."
                        statusMessage={`Monthly: ${formatCurrency(totalMonthlyDebtService)} • Principal + interest payments`}
                        statusTone="neutral"
                      />
                    );
                  case 'netOperatingIncome':
                    return (
                      <MetricCard
                        key={metric.id}
                        title="Net Operating Income (NOI)"
                        value={formatCurrency(netOperatingIncome)}
                        showInfoIcon={true}
                        tooltipText="Calculates the property's profitability by subtracting operating expenses from total revenue."
                        statusMessage={netOperatingIncome > 0 ? 'NOI is positive, indicating strong operations.' : 'Negative NOI; inspect operating costs closely.'}
                        statusTone={netOperatingIncome > 0 ? 'positive' : 'warning'}
                      />
                    );
                  case 'overallCapRate':
                    return (
                      <MetricCard
                        key={metric.id}
                        title="Overall Cap Rate"
                        value={
                          typeof overallCapRate === 'number' && isFinite(overallCapRate)
                            ? `${overallCapRate.toFixed(2)}%`
                            : 'N/A'
                        }
                        showInfoIcon={true}
                        tooltipText="The portfolio's capitalization rate calculated as total annual NOI divided by total estimated portfolio value. A 'strong' cap rate for a rental property in the Toronto area is typically considered to be in the 5% to 7% range for suburban and high-demand areas, while downtown core properties often have lower cap rates of 3.75% to 4.25% due to higher property values and demand."
                        statusMessage={capRateMessage}
                        statusTone={capRateTone}
                      />
                    );
                  case 'blendedCashOnCash':
                    return (
                      <MetricCard
                        key={metric.id}
                        title="Blended Cash on Cash"
                        value={formatPercentage(blendedCashOnCashReturn)}
                        showInfoIcon={true}
                        tooltipText="The blended cash-on-cash return across your portfolio, calculated as total annual cash flow before tax divided by total initial cash invested. A good cash-on-cash return in real estate is generally considered to be between 8% and 12%."
                        statusMessage={cashOnCashMessage}
                        statusTone={cashOnCashTone}
                      />
                    );
                  default:
                    return null;
                }
              })
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Center Column: Tenants & Rent */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Tenants & Rent</h2>
              
              {/* Current Tenants */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-neutral-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Current Tenants</h3>
                {properties.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add a property to start tracking occupancy, leases, and rent collection.
                  </p>
                ) : (
                  <>
                    <div className="mb-5">
                      <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                        <span>{occupiedPropertiesCount} of {properties.length} properties occupied</span>
                        <span>{formatPercentage(occupancyRate)}</span>
                      </div>
                    </div>

                <div className="space-y-4">
                      {properties.map((property) => {
                        const isOccupied = Boolean(property.tenant?.name);
                        const leaseStart = property.tenant?.leaseStartDate;
                        const leaseEnd = property.tenant?.leaseEndDate;
                        const monthlyRent = property.rent?.monthlyRent || 0;

                        let leaseSummary = "No lease details on file";
                        let leaseTone = "text-xs text-gray-500 dark:text-gray-400";

                        if (leaseStart) {
                          leaseSummary = `Lease: ${formatDateDisplay(leaseStart)} - ${formatDateDisplay(
                            leaseEnd,
                            undefined,
                            leaseEnd || "No end date"
                          )}`;
                        }

                        if (leaseEnd && isValidDateValue(leaseEnd)) {
                          const endDate = new Date(leaseEnd);
                          const daysToEnd = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          if (daysToEnd < 0) {
                            leaseTone = "text-xs text-red-600 dark:text-red-400";
                            leaseSummary = `Lease expired ${Math.abs(daysToEnd)} days ago (${formatDateDisplay(leaseEnd)})`;
                          } else if (daysToEnd <= 45) {
                            leaseTone = "text-xs text-amber-600 dark:text-amber-400";
                            leaseSummary = `Lease ends in ${daysToEnd} days (${formatDateDisplay(leaseEnd)})`;
                          } else {
                            leaseTone = "text-xs text-gray-500 dark:text-gray-400";
                            leaseSummary = `Lease ends ${formatDateDisplay(leaseEnd)}`;
                          }
                        }

                        return (
                          <div
                            key={property.id}
                            className={`rounded-lg border p-4 transition-colors ${
                              isOccupied
                                ? 'border-gray-200 bg-gray-50/80 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-gray-600'
                                : 'border-red-200 bg-red-50/60 hover:border-red-300 dark:border-red-800 dark:bg-red-900/20 dark:hover:border-red-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    isOccupied ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-red-400'
                                  }`}
                                  aria-hidden="true"
                                />
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                  {property.nickname || property.name}
                                </h4>
                              </div>
                              <span
                                className={`text-xs font-semibold uppercase tracking-wide ${
                                  isOccupied ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {isOccupied ? 'Occupied' : 'Vacant'}
                        </span>
                      </div>
                            <div className="mt-3 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {isOccupied ? property.tenant?.name : 'No tenant assigned'}
                          </p>
                                <p className={leaseTone}>
                                  {leaseSummary}
                          </p>
                        </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(monthlyRent)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">per month</p>
                      </div>
                    </div>
                </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* Right Column: Schedule */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Schedule</h2>
              
              {/* Key Upcoming Dates */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6 bg-white dark:bg-neutral-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Key Upcoming Dates (30 days)</h3>
                
                <ScheduleEvents properties={properties} />
              </div>
            </div>

          </div>
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}


// Wrapper component to ensure Suspense is at the top level
function PortfolioSummaryWrapper() {
  return (
    <Suspense fallback={
      <RequireAuth>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E] mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading portfolio...</p>
            </div>
          </div>
        </Layout>
      </RequireAuth>
    }>
      <PortfolioSummaryContent />
    </Suspense>
  );
}

export default function PortfolioSummaryPage() {
  return <PortfolioSummaryWrapper />;
}
function TopMetricCard({
  title,
  value,
  icon: Icon,
  accent = 'emerald',
  supporting,
  supportingSize = 'small',
  iconBadge,
  iconBadgePosition = 'bottom-right',
  iconTooltip,
}) {
  const iconRef = useRef(null);
  const tooltipRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const updateTooltipPosition = useCallback(() => {
    if (!iconRef.current || !tooltipRef.current || !isHovered) return;
    
    const iconRect = iconRef.current.getBoundingClientRect();
    
    // Temporarily show tooltip to measure it
    tooltipRef.current.style.visibility = 'hidden';
    tooltipRef.current.style.display = 'block';
    tooltipRef.current.style.opacity = '1';
    tooltipRef.current.style.position = 'fixed';
    tooltipRef.current.style.top = '0';
    tooltipRef.current.style.left = '0';
    
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const tooltipHeight = tooltipRect.height;
    const tooltipWidth = tooltipRect.width;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 8;
    
    // Calculate available space around THIS specific icon
    const spaceAbove = iconRect.top;
    const spaceBelow = viewportHeight - iconRect.bottom;
    const spaceRight = viewportWidth - iconRect.right;
    const spaceLeft = iconRect.left;
    
    let top, left;

    // Prefer above, centered on icon
    if (spaceAbove >= tooltipHeight + gap) {
      top = iconRect.top - tooltipHeight - gap;
      left = iconRect.left + (iconRect.width / 2) - (tooltipWidth / 2);
    } 
    // Then below, centered on icon
    else if (spaceBelow >= tooltipHeight + gap) {
      top = iconRect.bottom + gap;
      left = iconRect.left + (iconRect.width / 2) - (tooltipWidth / 2);
    } 
    // Then right of icon
    else if (spaceRight >= tooltipWidth + gap) {
      top = iconRect.top + (iconRect.height / 2) - (tooltipHeight / 2);
      left = iconRect.right + gap;
    } 
    // Finally left of icon
    else {
      top = iconRect.top + (iconRect.height / 2) - (tooltipHeight / 2);
      left = iconRect.left - tooltipWidth - gap;
    }

    // Keep within viewport bounds
    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16));

    // Apply position
    tooltipRef.current.style.position = 'fixed';
    tooltipRef.current.style.top = `${top}px`;
    tooltipRef.current.style.left = `${left}px`;
    tooltipRef.current.style.zIndex = '9999';
    tooltipRef.current.style.visibility = 'visible';
    tooltipRef.current.style.display = 'block';
    tooltipRef.current.style.opacity = '1';
  }, [isHovered]);

  useEffect(() => {
    if (isHovered) {
      // Use requestAnimationFrame to ensure DOM is ready
      const rafId = requestAnimationFrame(() => {
        updateTooltipPosition();
      });
      
      const scrollHandler = () => updateTooltipPosition();
      const resizeHandler = () => updateTooltipPosition();
      
      window.addEventListener('scroll', scrollHandler, true);
      window.addEventListener('resize', resizeHandler);
      
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('scroll', scrollHandler, true);
        window.removeEventListener('resize', resizeHandler);
      };
    }
  }, [isHovered, updateTooltipPosition]);

  const accentConfig = {
    emerald: {
      border: 'border-[#205A3E]/30 dark:border-[#1C4F39]/40',
      gradient: 'from-[#D9E5DC] via-[#F4F8F5] to-transparent dark:from-[#1A2F25] dark:via-[#101B15] dark:to-transparent',
      icon: 'text-[#205A3E] dark:text-[#66B894] bg-white/90 dark:bg-[#1D3A2C]/70',
    },
    teal: {
      border: 'border-[#1A4A5A]/25 dark:border-[#123640]/40',
      gradient: 'from-[#D8E6EA] via-[#F5F9FA] to-transparent dark:from-[#11252B] dark:via-[#0B181D] dark:to-transparent',
      icon: 'text-[#1A4A5A] dark:text-[#7AC0CF] bg-white/90 dark:bg-[#132E36]/70',
    },
    amber: {
      border: 'border-[#B57A33]/25 dark:border-[#8C5D24]/35',
      gradient: 'from-[#F3E6D4] via-[#FBF6EE] to-transparent dark:from-[#2A2014] dark:via-[#1B140C] dark:to-transparent',
      icon: 'text-[#B57A33] dark:text-[#E9C08A] bg-white/90 dark:bg-[#2D2115]/70',
    },
  };

  const config = accentConfig[accent] || accentConfig.emerald;

  return (
    <div className={`relative rounded-2xl border ${config.border} bg-gradient-to-br ${config.gradient} p-5`}>
      <div className="flex items-start justify-between gap-3.5">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        {Icon && (
          <div 
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div ref={iconRef} className={`relative rounded-full p-2.5 ${config.icon} cursor-help flex-shrink-0 flex items-center justify-center`}>
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {iconBadge && (
                <span
                  className={`absolute flex h-4 w-4 items-center justify-center rounded-full bg-[#205A3E] text-[10px] font-semibold text-white shadow-sm dark:bg-[#2F7E57] ${
                    iconBadgePosition === 'top-center'
                      ? '-top-1 left-1/2 -translate-x-1/2'
                      : '-bottom-1 -right-1'
                  }`}
                >
                  {iconBadge}
                </span>
              )}
            </div>
            {iconTooltip && (
              <div
                ref={tooltipRef}
                className="p-3 bg-[#205A3E] text-white text-xs leading-relaxed rounded-lg transition-opacity duration-200 pointer-events-none whitespace-normal w-72 max-w-[calc(100vw-2rem)] shadow-2xl"
                style={{ 
                  position: 'fixed',
                  opacity: isHovered ? 1 : 0, 
                  visibility: isHovered ? 'visible' : 'hidden',
                  pointerEvents: 'none',
                  zIndex: isHovered ? 9999 : -1,
                  top: isHovered ? undefined : '-9999px',
                  left: isHovered ? undefined : '-9999px'
                }}
              >
                {iconTooltip}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-5 text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      {supporting && (
        <>
          <div className={`mt-4 border-t-[3px] ${
            accent === 'emerald' 
              ? 'border-[#205A3E]/30 dark:border-[#66B894]/30' 
              : accent === 'teal'
              ? 'border-[#1A4A5A]/30 dark:border-[#7AC0CF]/30'
              : accent === 'amber'
              ? 'border-[#B57A33]/30 dark:border-[#E9C08A]/30'
              : 'border-gray-300 dark:border-gray-600'
          }`} />
          {supportingSize === 'dynamic' ? (
            <div className="mt-3 w-full min-w-0">
              <div 
                className={`font-bold break-words ${
                  accent === 'emerald' 
                    ? 'text-[#205A3E] dark:text-[#66B894]' 
                    : accent === 'teal'
                    ? 'text-[#1A4A5A] dark:text-[#7AC0CF]'
                    : accent === 'amber'
                    ? 'text-[#B57A33] dark:text-[#E9C08A]'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
                style={{ 
                  fontSize: 'clamp(0.625rem, 1.2vw, 1rem)',
                  lineHeight: '1.3'
                }}
              >
                {supporting}
              </div>
            </div>
          ) : (
            <p className={`mt-3 ${supportingSize === 'large' ? 'text-2xl font-bold' : 'text-sm'} ${
              accent === 'emerald' 
                ? 'text-[#205A3E] dark:text-[#66B894]' 
                : accent === 'teal'
                ? 'text-[#1A4A5A] dark:text-[#7AC0CF]'
                : accent === 'amber'
                ? 'text-[#B57A33] dark:text-[#E9C08A]'
                : 'text-gray-900 dark:text-gray-100'
            }`}>
              {supporting}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function IncomeWaterfallCard({ totalRevenue, operatingExpenses, debtService, netCashFlow }) {
  const totalOutflows = operatingExpenses + debtService;
  const netPositive = netCashFlow >= 0;
  const margin = totalRevenue > 0 ? netCashFlow / totalRevenue : 0;
  const percentFormatter = new Intl.NumberFormat('en-CA', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const marginLabel = Number.isFinite(margin) ? percentFormatter.format(margin) : 'N/A';
  const expenseShare = totalRevenue > 0 ? totalOutflows / totalRevenue : null;

  const scale = totalRevenue > 0
    ? totalRevenue
    : Math.max(totalOutflows, Math.abs(netCashFlow), 1);

  // Calculate percentages for Operating Expenses and Debt Service
  const operatingExpensesPercent = totalRevenue > 0 
    ? Math.round((operatingExpenses / totalRevenue) * 100)
    : 0;
  const debtServicePercent = totalRevenue > 0
    ? Math.round((debtService / totalRevenue) * 100)
    : 0;

  const steps = [
    { label: 'Total Revenue', value: totalRevenue, type: 'base' },
    { label: 'Total Expenses', value: totalOutflows, type: 'subtract', isAggregate: true },
    { label: `Operating Expenses (${operatingExpensesPercent}%)`, value: operatingExpenses, type: 'subtract', isSub: true },
    { label: `Debt Service (${debtServicePercent}%)`, value: debtService, type: 'subtract', isSub: true },
  ];

  const barWidth = (value) => {
    if (scale <= 0) return 0;
    return Math.min(100, (Math.abs(value) / scale) * 100);
  };

  return (
    <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Income & Expenses (Forecasted)
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Annualized snapshot of how rent covers operating costs and debt service.
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            netPositive
              ? 'bg-[#D9E5DC] text-[#205A3E] dark:bg-[#1D3A2C] dark:text-[#66B894]'
              : 'bg-[#F7D9D9] text-[#9F3838] dark:bg-[#2B1111] dark:text-[#F2A5A5]'
          }`}
        >
          {marginLabel === 'N/A' ? 'No revenue' : `${marginLabel} margin`}
        </div>
      </div>

      <div
        className={`mt-6 flex items-start justify-between rounded-md border px-4 py-3 text-lg ${
          netPositive
            ? 'border-[#C7D9CB] bg-[#EFF4F0] text-[#205A3E] dark:border-[#244632] dark:bg-[#15251D] dark:text-[#7AC0A1]'
            : 'border-[#E1B8B8] bg-[#FDF3F3] text-[#9F3838] dark:border-[#4C1F1F] dark:bg-[#1F1111] dark:text-[#F2A5A5]'
        }`}
      >
        <div>
          <p className="text-[1.375rem] font-semibold">Annual Net Cash Flow (Forecasted)</p>
          <p className="text-base opacity-80">After operating expenses and debt service</p>
        </div>
        <div className="text-right">
          <p className="text-[1.375rem] font-bold">{formatCurrency(netCashFlow)}</p>
          {expenseShare !== null && Number.isFinite(expenseShare) && (
            <p className="text-base font-medium opacity-80">
              {percentFormatter.format(expenseShare)} of revenue consumed
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {steps.map((step, index) => (
          <div key={step.label} className={`relative ${step.isSub ? 'pl-8' : 'pl-3'}`}>
            {index > 0 && !step.isSub && (
              <span
                className="absolute left-0 top-0 h-full border-l border-dashed border-gray-300 dark:border-gray-700"
                aria-hidden="true"
              />
            )}
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
              <span>
                {step.label}
              </span>
              <span className="text-gray-900 dark:text-gray-100">
                {step.type === 'subtract' ? `-${formatCurrency(step.value)}` : formatCurrency(step.value)}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full ${
                  step.type === 'base'
                    ? 'bg-[#205A3E] dark:bg-[#2F7E57]'
                    : step.isAggregate
                      ? 'bg-[#E16262] dark:bg-[#A12424]'
                      : 'bg-[#9CA3AF] dark:bg-[#E2E8F0]'
                }`}
                style={{ width: `${barWidth(step.value)}%` }}
                role="presentation"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnualRentalIncomeCard({ properties = [], totalMonthlyRent = 0 }) {
  const hasProperties = properties.length > 0;
  const [chartType, setChartType] = useState('pie'); // 'pie' or 'bar'

  // Prepare data for pie chart
  const pieChartData = properties
    .map((property) => {
      const propertyName = property.nickname || property.name || 'Unnamed Property';
      const monthlyRent = property?.rent?.monthlyRent || 0;
      const annualRent = monthlyRent * 12;
      return {
        name: propertyName,
        value: annualRent,
      };
    })
    .filter((item) => item.value > 0);

  // Prepare data for horizontal bar chart (same data, different format)
  const barChartData = pieChartData;


  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = totalMonthlyRent * 12 > 0 
        ? ((data.value / (totalMonthlyRent * 12)) * 100).toFixed(1)
        : 0;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(data.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Annual Rental Income</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('pie')}
            className={`p-1.5 rounded-md transition-colors ${
              chartType === 'pie'
                ? 'bg-[#205A3E] text-white dark:bg-[#2F7E57]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
            aria-label="Switch to pie chart"
            title="Pie Chart"
          >
            <PieChartIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-md transition-colors ${
              chartType === 'bar'
                ? 'bg-[#205A3E] text-white dark:bg-[#2F7E57]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
            aria-label="Switch to bar chart"
            title="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {hasProperties ? (
              <div className="space-y-3">
          {properties.map((property) => {
            const propertyName = property.nickname || property.name;
            const monthlyRent = property?.rent?.monthlyRent || 0;

            return (
              <div
                key={property.id}
                className="flex justify-between items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
              >
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {propertyName || 'Unnamed Property'}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(monthlyRent * 12)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(monthlyRent)}/mo
                      </p>
                    </div>
                  </div>
            );
          })}
          <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Total Annual Income</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalMonthlyRent * 12)}
                    </span>
                  </div>
                  
                  {/* Chart Section */}
                  {barChartData.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Income Distribution by Property
                      </h4>
                      {chartType === 'pie' ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                                if (percent < 0.05) return '';
                                const RADIAN = Math.PI / 180;
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                  <text
                                    x={x}
                                    y={y}
                                    fill="white"
                                    textAnchor={x > cx ? 'start' : 'end'}
                                    dominantBaseline="central"
                                    fontSize="14"
                                    fontWeight="600"
                                    style={{
                                      textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5)',
                                    }}
                                  >
                                    {`${(percent * 100).toFixed(0)}%`}
                                  </text>
                                );
                              }}
                              outerRadius={70}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36}
                              formatter={(value, entry) => (
                                <span style={{ color: entry.color, fontSize: '12px' }}>
                                  {value}
                                </span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="space-y-3">
                          {barChartData.map((item, index) => {
                            const width = totalMonthlyRent * 12 > 0
                              ? Math.min((item.value / (totalMonthlyRent * 12)) * 100, 100)
                              : 0;
                            const percentage = totalMonthlyRent * 12 > 0
                              ? ((item.value / (totalMonthlyRent * 12)) * 100).toFixed(0)
                              : 0;
                            return (
                              <div key={item.name}>
                                <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                                  <span>{item.name} ({percentage}%)</span>
                                  <span>{formatCurrency(item.value)}</span>
                                </div>
                                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ 
                                      width: `${width}%`,
                                      backgroundColor: COLORS[index % COLORS.length]
                                    }}
                                    role="presentation"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
      ) : (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          Add a property to see projected rent by address.
            </div>
      )}
    </div>
  );
}

function AnnualExpensesCard({
  totalAnnualOperatingExpenses,
  totalAnnualDebtService,
  properties = [],
  expenseCategoryList = [],
  totalTrackedExpenses = 0,
}) {
  const hasProperties = properties.length > 0;
  const totalAnnualExpenses = totalAnnualOperatingExpenses + totalAnnualDebtService;
  const [chartType, setChartType] = useState('bar'); // 'pie' or 'bar'

  // Prepare data for pie chart
  const pieChartData = expenseCategoryList.map((category) => ({
    name: category.label,
    value: category.value,
  }));

  return (
    <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Annual Expenses
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('pie')}
            className={`p-1.5 rounded-md transition-colors ${
              chartType === 'pie'
                ? 'bg-[#205A3E] text-white dark:bg-[#2F7E57]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
            aria-label="Switch to pie chart"
            title="Pie Chart"
          >
            <PieChartIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-md transition-colors ${
              chartType === 'bar'
                ? 'bg-[#205A3E] text-white dark:bg-[#2F7E57]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
            aria-label="Switch to bar chart"
            title="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {hasProperties ? (
          properties.map((property) => {
            const monthlyExpenses = property.monthlyExpenses || {};
            const monthlyTotal = monthlyExpenses?.total || 0;
            const propertyExpenseValue = monthlyTotal * 12;

            return (
              <div
                key={property.id}
                className="flex justify-between items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
              >
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {property.nickname || property.name}
                  </h4>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(propertyExpenseValue)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(monthlyTotal)}/mo
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            Add property expenses to see where cash flow is going.
          </div>
        )}

        {hasProperties && (
          <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                Total Annual Expenses
              </span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalAnnualExpenses)}
              </span>
            </div>
          </div>
        )}

        {expenseCategoryList.length > 0 && (
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Largest Expense Categories
            </h4>
            {chartType === 'pie' ? (
              <div className="mt-4">
                <div className="relative overflow-visible" style={{ width: '100%', height: '240px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        label={({ percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                          if (percent < 0.03) return null;
                          const RADIAN = Math.PI / 180;
                          // Position label outside the chart
                          const labelRadius = outerRadius + 30;
                          const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
                          const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
                          
                          // Determine quadrant for proper positioning
                          const isRightSide = x > cx;
                          
                          // Calculate text width
                          const percentText = `${(percent * 100).toFixed(0)}%`;
                          const textWidth = percentText.length * 9 + 8;
                          const textHeight = 20;
                          
                          // Adjust positioning based on quadrant
                          let rectX, textX, textAnchor;
                          if (isRightSide) {
                            rectX = x;
                            textX = x + 6;
                            textAnchor = 'start';
                          } else {
                            rectX = x - textWidth;
                            textX = x - 6;
                            textAnchor = 'end';
                          }
                          
                          return (
                            <g>
                              {/* Background for better readability */}
                              <rect
                                x={rectX}
                                y={y - textHeight / 2}
                                width={textWidth}
                                height={textHeight}
                                fill="white"
                                fillOpacity={0.95}
                                className="dark:fill-gray-900 dark:fill-opacity-95"
                                rx={4}
                                stroke="#e5e7eb"
                                strokeWidth={0.5}
                              />
                              <text
                                x={textX}
                                y={y}
                                fill="#111827"
                                textAnchor={textAnchor}
                                dominantBaseline="central"
                                fontSize={13}
                                fontWeight="700"
                                className="pointer-events-none dark:fill-gray-100"
                              >
                                {percentText}
                              </text>
                            </g>
                          );
                        }}
                        labelLine={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          if (percent < 0.03) return null;
                          const RADIAN = Math.PI / 180;
                          // Start point: outer edge of segment
                          const x1 = cx + outerRadius * Math.cos(-midAngle * RADIAN);
                          const y1 = cy + outerRadius * Math.sin(-midAngle * RADIAN);
                          // End point: where label starts
                          const x2 = cx + (outerRadius + 30) * Math.cos(-midAngle * RADIAN);
                          const y2 = cy + (outerRadius + 30) * Math.sin(-midAngle * RADIAN);
                          
                          return (
                            <g>
                              {/* Black dot at connection point */}
                              <circle
                                cx={x1}
                                cy={y1}
                                r={3.5}
                                fill="#1f2937"
                                stroke="white"
                                strokeWidth={1}
                                className="dark:fill-gray-100 dark:stroke-gray-800"
                              />
                              {/* Line connecting dot to label */}
                              <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="#1f2937"
                                strokeWidth={2}
                                strokeLinecap="round"
                                className="dark:stroke-gray-100"
                              />
                            </g>
                          );
                        }}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                      {pieChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const percentage = totalTrackedExpenses > 0
                            ? ((data.value / totalTrackedExpenses) * 100).toFixed(1)
                            : 0;
                          return (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                              <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatCurrency(data.value)} ({percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry) => (
                        <span style={{ color: entry.color, fontSize: '12px' }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {expenseCategoryList.map((category) => {
                  const width =
                    totalTrackedExpenses > 0
                      ? Math.min((category.value / totalTrackedExpenses) * 100, 100)
                      : 0;
                  const percentage = totalTrackedExpenses > 0
                    ? ((category.value / totalTrackedExpenses) * 100).toFixed(0)
                    : 0;
                  return (
                    <div key={category.id}>
                      <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                        <span>{category.label} ({percentage}%)</span>
                        <span>{formatCurrency(category.value)}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-[#E16262] dark:bg-[#A12424]"
                          style={{ width: `${width}%` }}
                          role="presentation"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AnnualDeductibleExpensesCard({
  totalAnnualDeductibleExpenses,
  properties = [],
  deductibleExpenseCategoryList = [],
  totalTrackedDeductibleExpenses = 0,
}) {
  const hasProperties = properties.length > 0;
  const [chartType, setChartType] = useState('bar'); // 'pie' or 'bar'

  // Prepare data for pie chart
  const pieChartData = deductibleExpenseCategoryList.map((category) => ({
    name: category.label,
    value: category.value,
  }));

  return (
    <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Annual Deductible Expenses
          </h3>
          <div className="relative group">
            <div className="flex h-4 w-4 items-center justify-center rounded-full border border-[#205A3E] bg-white dark:border-[#4ade80] dark:bg-gray-100 cursor-help">
              <span className="text-[10px] font-bold text-[#205A3E] dark:text-[#4ade80]">
                i
              </span>
            </div>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 w-64 -translate-x-1/2 whitespace-normal rounded-lg bg-[#205A3E] p-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
              Deductible costs can offset rental income for tax purposes. Typical write-offs
              include mortgage interest, property tax, insurance, utilities, and maintenance.
              <div className="absolute top-full left-1/2 -ml-1 h-2 w-2 rotate-45 bg-[#205A3E]" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('pie')}
            className={`p-1.5 rounded-md transition-colors ${
              chartType === 'pie'
                ? 'bg-[#205A3E] text-white dark:bg-[#2F7E57]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
            aria-label="Switch to pie chart"
            title="Pie Chart"
          >
            <PieChartIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-md transition-colors ${
              chartType === 'bar'
                ? 'bg-[#205A3E] text-white dark:bg-[#2F7E57]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
            aria-label="Switch to bar chart"
            title="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {hasProperties ? (
          properties.map((property) => {
            const monthlyExpenses = property.monthlyExpenses || {};
            const propertyDeductibleValue = (() => {
              try {
                const annualOperatingExpenses = 
                  (monthlyExpenses.propertyTax || 0) * 12 +
                  (monthlyExpenses.condoFees || 0) * 12 +
                  (monthlyExpenses.insurance || 0) * 12 +
                  (monthlyExpenses.maintenance || 0) * 12 +
                  (monthlyExpenses.professionalFees || 0) * 12 +
                  (monthlyExpenses.utilities || 0) * 12;
                
                const estimatedAnnualInterest =
                  (property?.mortgage?.originalAmount || 0) *
                  (property?.mortgage?.interestRate || 0);
                
                return annualOperatingExpenses + estimatedAnnualInterest;
              } catch (error) {
                const monthlyTotal = monthlyExpenses?.total || 0;
                const amortizationYears = property?.mortgage?.amortizationYears || 1;
                const originalAmount = property?.mortgage?.originalAmount || 0;
                const estimatedAnnualPrincipal =
                  amortizationYears > 0 ? originalAmount / amortizationYears : 0;
                return monthlyTotal * 12 - estimatedAnnualPrincipal;
              }
            })();

            return (
              <div
                key={property.id}
                className="flex justify-between items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
              >
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {property.nickname || property.name}
                  </h4>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(propertyDeductibleValue)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(propertyDeductibleValue / 12)}/mo
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            Add property expenses to see deductible costs.
          </div>
        )}

        {hasProperties && (
          <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                Total Annual Deductible Expenses
              </span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalAnnualDeductibleExpenses)}
              </span>
            </div>
          </div>
        )}

        {deductibleExpenseCategoryList.length > 0 && (
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Largest Expense Categories
            </h4>
            {chartType === 'pie' ? (
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                        if (percent < 0.05) return '';
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            fontSize="14"
                            fontWeight="600"
                            style={{
                              textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5)',
                            }}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const percentage = totalTrackedDeductibleExpenses > 0
                            ? ((data.value / totalTrackedDeductibleExpenses) * 100).toFixed(1)
                            : 0;
                          return (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                              <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatCurrency(data.value)} ({percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry) => (
                        <span style={{ color: entry.color, fontSize: '12px' }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {deductibleExpenseCategoryList.map((category) => {
                  const width =
                    totalTrackedDeductibleExpenses > 0
                      ? Math.min((category.value / totalTrackedDeductibleExpenses) * 100, 100)
                      : 0;
                  const percentage = totalTrackedDeductibleExpenses > 0
                    ? ((category.value / totalTrackedDeductibleExpenses) * 100).toFixed(0)
                    : 0;
                  return (
                    <div key={category.id}>
                      <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                        <span>{category.label} ({percentage}%)</span>
                        <span>{formatCurrency(category.value)}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-[#E16262] dark:bg-[#A12424]"
                          style={{ width: `${width}%` }}
                          role="presentation"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  trend,
  trendPositive,
  isExpense,
  showInfoIcon,
  tooltipText,
  isMultiMetric,
  multiMetrics,
  customColor,
  subtitle,
  statusMessage,
  statusTone = 'neutral',
}) {
  const getValueColor = () => {
    if (customColor) {
      return customColor;
    }
    if (isExpense) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-900 dark:text-gray-100';
  };

  const statusToneConfig = {
    positive: {
      text: 'text-emerald-700 dark:text-emerald-300',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-100 dark:border-emerald-800/60',
    },
    neutral: {
      text: 'text-gray-600 dark:text-gray-300',
      bg: 'bg-gray-50 dark:bg-gray-900/40',
      border: 'border-gray-100 dark:border-gray-700',
    },
    warning: {
      text: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800/60',
    },
  };

  const statusStyles = statusToneConfig[statusTone] || statusToneConfig.neutral;

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 p-6 hover:bg-black/5 dark:hover:bg-white/5 transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
            {showInfoIcon && (
              <div className="relative group">
                <div className="w-4 h-4 rounded-full bg-white dark:bg-gray-100 border-2 border-[#205A3E] dark:border-[#4ade80] flex items-center justify-center cursor-help">
                  <span className="text-[#205A3E] dark:text-[#4ade80] text-xs font-bold">i</span>
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-[#205A3E] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal z-10 w-64 shadow-lg">
                  {tooltipText}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#205A3E]"></div>
                </div>
              </div>
            )}
          </div>
          
          {isMultiMetric ? (
            <div className="space-y-2">
              {multiMetrics.map((metric, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{metric.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-3xl font-bold ${getValueColor()}`}>{value}</p>
          )}

          {subtitle && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 break-words">
              {subtitle}
            </p>
          )}

          {statusMessage && (
            <div
              className={`mt-4 rounded-md border px-3 py-2 text-xs leading-5 ${statusStyles.bg} ${statusStyles.border} ${statusStyles.text}`}
            >
              {statusMessage}
            </div>
          )}
        </div>
        
        {!isMultiMetric && trend && (
          <div className={`text-sm font-medium ${trendPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleEvents({ properties = [] }) {
  const [dateRange, setDateRange] = useState(30);
  const currentYear = new Date().getFullYear();
  
  const upcomingEvents = properties.flatMap(property => {
    const events = [
      { propertyName: property.nickname || property.name, eventType: "Mortgage Payment", date: property.mortgage?.nextPayment },
      { propertyName: property.nickname || property.name, eventType: "Insurance Renewal", date: `${currentYear}-02-15` }, // Estimated
      { propertyName: property.nickname || property.name, eventType: "Property Tax", date: `${currentYear}-03-01` }, // Estimated
      { propertyName: property.nickname || property.name, eventType: "Maintenance", date: `${currentYear}-01-20` }, // Estimated
    ];
    
    if (property.tenant?.name && property.tenant?.leaseEndDate) {
      events.push({
        propertyName: property.nickname || property.name,
        eventType: "Lease Renewal",
        date: property.tenant.leaseEndDate
      });
    }
    
    return events;
  });

  const today = new Date();
  const endDate = new Date(today.getTime() + dateRange * 24 * 60 * 60 * 1000);

  const upcomingWithinRange = upcomingEvents
    .filter(event => isValidDateValue(event.date))
    .map(event => ({
      ...event,
      eventDate: new Date(event.date),
    }))
    .filter(event => event.eventDate >= today && event.eventDate <= endDate)
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  const formatEventDate = (date) => {
    if (!isValidDateValue(date)) {
      return typeof date === "string" ? date : "Date TBD";
    }

    const eventDate = new Date(date);
    const isToday = eventDate.toDateString() === today.toDateString();
    const isTomorrow = eventDate.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) {
      return 'Today';
    } else if (isTomorrow) {
      return 'Tomorrow';
    } else {
      return eventDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getUrgencyMeta = (eventDate) => {
    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        dot: 'border-red-500 bg-red-100 dark:bg-red-900/40',
        card: 'border-red-100 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
        label: 'Past due',
      };
    }

    if (diffDays <= 7) {
      return {
        dot: 'border-amber-500 bg-amber-100 dark:bg-amber-900/40',
        card: 'border-amber-100 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        label: 'This week',
      };
    }

    if (diffDays <= 30) {
      return {
        dot: 'border-blue-500 bg-blue-100 dark:bg-blue-900/40',
        card: 'border-blue-100 bg-blue-50 dark:border-blue-800/60 dark:bg-blue-900/20',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        label: `In ${diffDays} days`,
      };
    }

    return {
      dot: 'border-gray-300 bg-gray-100 dark:bg-gray-800',
      card: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30',
      badge: '',
      label: '',
    };
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upcoming mortgage, tax, maintenance, and lease milestones.
        </p>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(Number(e.target.value))}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#205A3E]"
        >
          <option value={30}>Next 30 days</option>
          <option value={60}>Next 60 days</option>
          <option value={90}>Next 90 days</option>
        </select>
      </div>

      {upcomingWithinRange.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          No key events in the next {dateRange} days. You’re in the clear.
        </div>
      ) : (
        <div className="relative mt-6 pl-6">
          <span className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
          <div className="space-y-6">
            {upcomingWithinRange.map((event, index) => {
              const urgency = getUrgencyMeta(event.eventDate);
              return (
                <div key={`${event.propertyName}-${event.eventType}-${index}`} className="relative">
                  <span
                    className={`absolute -left-3 mt-1 h-3 w-3 rounded-full border-2 ${urgency.dot}`}
                    aria-hidden="true"
                  />
                  <div className={`rounded-lg border px-4 py-3 transition-colors ${urgency.card}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {event.eventType}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {event.propertyName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {formatEventDate(event.eventDate)}
                        </p>
                        {urgency.label && (
                          <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${urgency.badge}`}>
                            {urgency.label}
                    </span>
                        )}
                  </div>
                </div>
            </div>
          </div>
              );
            })}
      </div>
        </div>
      )}
    </div>
  );
}
