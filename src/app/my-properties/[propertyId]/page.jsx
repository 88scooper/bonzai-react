"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import Button from "@/components/Button";
import { useProperty } from "@/context/PropertyContext";
import { formatCurrency, formatPercentage, formatNumber } from "@/utils/formatting";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import AnnualExpenseChart from '@/components/charts/AnnualExpenseChart';
import { useToast } from "@/context/ToastContext";
import { X, ChevronDown, ChevronUp, FileText, DollarSign, TrendingUp, Home, Users, BarChart3, PieChart as PieChartIcon, Calendar } from "lucide-react";
import YoYAnalysis from "@/components/calculators/YoYAnalysis";
import { DEFAULT_ASSUMPTIONS } from "@/lib/sensitivity-analysis";
import { getPropertyNotes, savePropertyNotes } from "@/lib/property-notes-storage";
import { 
  calculateAnnualOperatingExpenses, 
  calculateNOI, 
  calculateCapRate, 
  calculateAnnualCashFlow, 
  calculateCashOnCashReturn,
  calculateAnnualDebtService,
  calculateDSCR,
  calculateIRR
} from "@/utils/financialCalculations";
import { getMonthlyMortgagePayment, getMonthlyMortgageInterest, getMonthlyMortgagePrincipal } from "@/utils/mortgageCalculator";

export default function PropertyDetailPage() {
  // Use useParams hook for client components - more reliable than use(params)
  const params = useParams();
  // Handle both string and array cases for Next.js 15
  const propertyId = Array.isArray(params?.propertyId) ? params.propertyId[0] : params?.propertyId;
  const [isHydrated, setIsHydrated] = useState(false);
  const { addToast } = useToast();
  
  // Early return if propertyId is not available
  if (!propertyId) {
    return (
      <RequireAuth>
        <Layout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold">Loading...</h1>
          </div>
        </Layout>
      </RequireAuth>
    );
  }
  
  // Modal state management
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  
  // Get property data using propertyId from PropertyContext
  const property = useProperty(propertyId);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [expenseView, setExpenseView] = useState('annual'); // 'monthly' or 'annual'
  const [hoveredSegment, setHoveredSegment] = useState(null); // For hover interactions
  
  // Historical Performance chart controls
  const [historicalStartYear, setHistoricalStartYear] = useState(null);
  const [historicalYears, setHistoricalYears] = useState(5);
  
  // Toggle state for Historical Performance chart
  const [visibleMetrics, setVisibleMetrics] = useState({
    income: true,
    expenses: true,
    cashFlow: true
  });
  
  const toggleMetric = (metric) => {
    setVisibleMetrics(prev => {
      const newState = { ...prev, [metric]: !prev[metric] };
      // Ensure at least one metric is always visible
      const hasVisibleMetric = Object.values(newState).some(v => v);
      if (!hasVisibleMetric) {
        return prev; // Don't allow hiding all metrics
      }
      return newState;
    });
  };
  
  // State for collapsible sections
  const [openSections, setOpenSections] = useState({
    generalNotes: false,
    propertyFinancials: true,
    historicalPerformance: true,
    currentTenants: true,
    annualExpenseHistory: true
  });

  // State for general notes
  const [notes, setNotes] = useState('');
  const [notesChanged, setNotesChanged] = useState(false);

  // Load notes when property is available
  useEffect(() => {
    if (propertyId && isHydrated) {
      const savedNotes = getPropertyNotes(propertyId);
      setNotes(savedNotes);
    }
  }, [propertyId, isHydrated]);

  // Auto-save notes with debounce
  useEffect(() => {
    if (!propertyId || !isHydrated || !notesChanged) return;

    const timeoutId = setTimeout(() => {
      savePropertyNotes(propertyId, notes);
      setNotesChanged(false);
    }, 1000); // Save 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [notes, propertyId, isHydrated, notesChanged]);

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    setNotesChanged(true);
  };
  
  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Prepare expense data for pie chart with mortgage breakdown
  const expenseChartData = useMemo(() => {
    if (!isHydrated) return [];
    if (!property?.monthlyExpenses) {
      console.log('No monthlyExpenses found on property:', property);
      return [];
    }
    
    // Diverse color palette for better visualization
    const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
    
    const entries = [];
    let colorIndex = 0;
    
    // Track which expense keys exist in monthlyExpenses for debugging
    const availableExpenseKeys = Object.keys(property.monthlyExpenses).filter(
      key => key !== 'total' && 
             key !== 'mortgagePayment' && 
             key !== 'mortgageInterest' && 
             key !== 'mortgagePrincipal' &&
             !key.toLowerCase().includes('mortgage')
    );
    console.log('Available expense categories in monthlyExpenses:', availableExpenseKeys);
    
    // Add regular expenses (excluding mortgage payment if it exists)
    Object.entries(property.monthlyExpenses).forEach(([key, value]) => {
      // Filter out 'total' and all mortgage-related entries (we'll add mortgage breakdown separately)
      if (key === 'total' || 
          key === 'mortgagePayment' || 
          key === 'mortgageInterest' || 
          key === 'mortgagePrincipal' ||
          key.toLowerCase().includes('mortgage')) return;
      
        const numValue = typeof value === 'number' ? value : 0;
      if (numValue > 0) {
        entries.push({
          key,
        name: key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase()),
          value: expenseView === 'annual' ? numValue * 12 : numValue,
          color: colors[colorIndex % colors.length]
        });
        colorIndex++;
      } else if (numValue === 0) {
        // Log zero-value expenses that exist but aren't shown
        console.log(`Expense category "${key}" exists but has value 0, so it's not displayed`);
      }
    });
    
    // Add mortgage breakdown as separate line items
    if (property.mortgage) {
      try {
        const monthlyInterest = getMonthlyMortgageInterest(property.mortgage);
        const monthlyPrincipal = getMonthlyMortgagePrincipal(property.mortgage);
        const monthlyPayment = getMonthlyMortgagePayment(property.mortgage);
        
        const annualInterest = monthlyInterest * 12;
        const annualPrincipal = monthlyPrincipal * 12;
        const annualPayment = monthlyPayment * 12;
        
        // Add Mortgage Interest
        if (annualInterest > 0) {
          entries.push({
            key: 'mortgageInterest',
            name: 'Mortgage Interest',
            value: expenseView === 'annual' ? annualInterest : monthlyInterest,
            color: colors[colorIndex % colors.length]
          });
          colorIndex++;
        }
        
        // Add Mortgage Principal
        if (annualPrincipal > 0) {
          entries.push({
            key: 'mortgagePrincipal',
            name: 'Mortgage Principal',
            value: expenseView === 'annual' ? annualPrincipal : monthlyPrincipal,
            color: colors[colorIndex % colors.length]
          });
          colorIndex++;
        }
        
        // Note: Mortgage Payment (total) is intentionally excluded as it's redundant
        // since it's just the sum of Mortgage Interest + Mortgage Principal
      } catch (error) {
        console.warn('Error calculating mortgage breakdown:', error);
      }
    }
    
    // Sort by value (descending) for better chart visualization
    entries.sort((a, b) => b.value - a.value);
    
    return entries;
  }, [property?.monthlyExpenses, property?.mortgage, expenseView, isHydrated, property]);

  // Generate historical income and cost data from actual property data
  const historicalData = useMemo(() => {
    if (!property || !isHydrated) return [];
    
    const data = [];
    
    // Define historical data for each property based on available CSV data
    const historicalDataMap = {
      'first-st-1': [
        { year: '2021', income: 31200, expenses: 32368, cashFlow: -1168 }, // 2600 * 12
        { year: '2022', income: 31944, expenses: 35721, cashFlow: -3777 }, // 2662 * 12
        { year: '2023', income: 31920, expenses: 33305, cashFlow: -1385 }, // 2660 * 12
        { year: '2024', income: 32688, expenses: 33799, cashFlow: -1111 }, // 2724 * 12
        { year: '2025', income: 33468, expenses: 33799, cashFlow: -331 } // 2789 * 12 (projected)
      ],
      'second-dr-1': [
        { year: '2021', income: 31200, expenses: 39389, cashFlow: -8189 },
        { year: '2022', income: 31944, expenses: 42905, cashFlow: -10961 },
        { year: '2023', income: 32100, expenses: 40393, cashFlow: -8293 },
        { year: '2024', income: 32868, expenses: 40923, cashFlow: -8055 }
      ]
    };
    
    // Get historical data for this property
    const propertyHistory = historicalDataMap[property.id] || [];
    
    // If no historical data available, create a simple current year entry
    if (propertyHistory.length === 0) {
      const currentYear = new Date().getFullYear().toString();
      const currentIncome = property.rent?.annualRent || 0;
      const currentExpenses = property.monthlyExpenses?.total ? property.monthlyExpenses.total * 12 : 0;
      const currentCashFlow = currentIncome - currentExpenses;
      
      data.push({
        year: currentYear,
        income: currentIncome,
        expenses: currentExpenses,
        cashFlow: currentCashFlow
      });
    } else {
      // Use actual historical data
      data.push(...propertyHistory);
    }
    
    // Filter data based on start year and number of years
    let filteredData = [...data];
    
    // Sort by year to ensure proper ordering
    filteredData.sort((a, b) => parseInt(a.year) - parseInt(b.year));
    
    // If start year is set, filter from that year
    if (historicalStartYear) {
      filteredData = filteredData.filter(item => parseInt(item.year) >= historicalStartYear);
    }
    
    // Limit to number of years (take the first N years from the filtered data)
    if (historicalYears > 0 && filteredData.length > historicalYears) {
      filteredData = filteredData.slice(0, historicalYears);
    }
    
    return filteredData;
  }, [property, isHydrated, historicalStartYear, historicalYears]);
  
  // Calculate available year range for the inputs
  const availableYears = useMemo(() => {
    if (!property || !isHydrated) return { min: null, max: null, all: [] };
    
    const historicalDataMap = {
      'first-st-1': ['2021', '2022', '2023', '2024', '2025'],
      'second-dr-1': ['2021', '2022', '2023', '2024']
    };
    
    const propertyHistory = historicalDataMap[property.id] || [];
    if (propertyHistory.length === 0) {
      const currentYear = new Date().getFullYear().toString();
      return { min: parseInt(currentYear), max: parseInt(currentYear), all: [parseInt(currentYear)] };
    }
    
    const years = propertyHistory.map(y => parseInt(y));
    return {
      min: Math.min(...years),
      max: Math.max(...years),
      all: years.sort((a, b) => a - b)
    };
  }, [property, isHydrated]);
  
  // Initialize start year to the earliest available year if not set
  useEffect(() => {
    if (historicalStartYear === null && availableYears.min !== null) {
      setHistoricalStartYear(availableYears.min);
    }
  }, [historicalStartYear, availableYears.min]);

  // Calculate Year Over Year changes for expenses
  const expenseYoYData = useMemo(() => {
    if (!property?.monthlyExpenses || !historicalData || historicalData.length < 2) {
      return {};
    }
    
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    // Get current and previous year expense data
    const currentYearData = historicalData.find(d => d.year === currentYear.toString());
    const lastYearData = historicalData.find(d => d.year === lastYear.toString());
    
    if (!currentYearData || !lastYearData) return {};
    
    // Calculate YoY change for each expense category
    const yoYData = {};
    expenseChartData.forEach(entry => {
      // For now, return null as we don't have historical breakdown by category
      // This would need to be calculated from actual historical expense records
      yoYData[entry.key] = null;
    });
    
    return yoYData;
  }, [expenseChartData, historicalData, property?.monthlyExpenses]);

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    if (!property) return null;

    // Calculate current mortgage balance based on purchase date
    const calculateMortgageBalance = () => {
      if (!property.mortgage) return 0;
      
      const mortgage = property.mortgage;
      const purchaseDate = new Date(property.purchaseDate);
      const currentDate = new Date();
      const monthsElapsed = Math.max(0, (currentDate.getFullYear() - purchaseDate.getFullYear()) * 12 + 
        (currentDate.getMonth() - purchaseDate.getMonth()));
      
      // Use remainingBalance if available, otherwise calculate
      if (mortgage.remainingBalance !== undefined && mortgage.remainingBalance !== null) {
        return mortgage.remainingBalance;
      }
      
      // Simplified calculation: assume linear amortization
      const originalAmount = mortgage.originalAmount || 0;
      const amortizationYears = mortgage.amortizationYears || 30;
      const totalMonths = amortizationYears * 12;
      const monthlyPayment = getMonthlyMortgagePayment(mortgage);
      
      if (monthlyPayment <= 0) return originalAmount;
      
      // Calculate approximate remaining balance
      const annualRate = mortgage.interestRate || 0;
      const monthlyRate = annualRate / 12;
      
      if (monthlyRate === 0) {
        return Math.max(0, originalAmount - (monthlyPayment * monthsElapsed));
      }
      
      // Standard amortization formula
      const remainingMonths = totalMonths - monthsElapsed;
      if (remainingMonths <= 0) return 0;
      
      return monthlyPayment * (1 - Math.pow(1 + monthlyRate, -remainingMonths)) / monthlyRate;
    };

    const propertyValue = property.currentMarketValue || property.currentValue || 0;
    const mortgageBalance = calculateMortgageBalance();
    const equity = propertyValue - mortgageBalance;
    const annualRevenue = property.rent?.annualRent || (property.rent?.monthlyRent || 0) * 12;
    const annualOperatingExpenses = calculateAnnualOperatingExpenses(property);
    const annualDebtService = calculateAnnualDebtService(property);
    const totalExpenses = annualOperatingExpenses + annualDebtService;
    const netCashFlow = annualRevenue - totalExpenses;
    const noi = calculateNOI(property);
    const capRate = calculateCapRate(property);
    const cashOnCash = calculateCashOnCashReturn(property);
    const dscr = calculateDSCR(property);
    const irr = calculateIRR(property, 5);

    // Calculate portfolio LTV
    const portfolioLTV = propertyValue > 0 ? (mortgageBalance / propertyValue) * 100 : 0;

    // Calculate margin
    const margin = annualRevenue > 0 ? (netCashFlow / annualRevenue) * 100 : 0;

    // Calculate equity percentage
    const equityPercentage = propertyValue > 0 ? (equity / propertyValue) * 100 : 0;

    // Calculate forecasted equity (equity earned this year)
    const currentYear = new Date().getFullYear();
    const purchaseYear = new Date(property.purchaseDate).getFullYear();
    const yearsOwned = currentYear - purchaseYear;
    const previousYearEquity = propertyValue > property.purchasePrice 
      ? propertyValue - (mortgageBalance + (getMonthlyMortgagePayment(property.mortgage) || 0) * 12)
      : 0;
    const forecastedEquity = equity - previousYearEquity;

    return {
      propertyValue,
      mortgageBalance,
      equity,
      equityPercentage,
      forecastedEquity,
      annualRevenue,
      annualOperatingExpenses,
      annualDebtService,
      totalExpenses,
      netCashFlow,
      noi,
      capRate,
      cashOnCash,
      dscr,
      irr,
      portfolioLTV,
      margin
    };
  }, [property]);

  if (!property) {
    return (
      <RequireAuth>
        <Layout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold">Property Not Found</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              The property you're looking for doesn't exist.
            </p>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  if (!financialMetrics) {
    return (
      <RequireAuth>
        <Layout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold">Loading...</h1>
          </div>
        </Layout>
      </RequireAuth>
    );
  }

  // Helper function to get status label for metrics
  const getStatusLabel = (value, thresholds) => {
    if (value >= thresholds.strong) return { label: 'STRONG', color: 'text-green-600 dark:text-green-400' };
    if (value >= thresholds.adequate) return { label: 'ADEQUATE', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'LOW', color: 'text-red-600 dark:text-red-400' };
  };

  const capRateStatus = getStatusLabel(financialMetrics.capRate, { strong: 6, adequate: 4 });
  const cashOnCashStatus = getStatusLabel(financialMetrics.cashOnCash, { strong: 8, adequate: 5 });
  const dscrStatus = getStatusLabel(financialMetrics.dscr, { strong: 1.5, adequate: 1.0 });
  const irrStatus = getStatusLabel(financialMetrics.irr, { strong: 20, adequate: 10 });

  const totalCashInvested = (property.purchasePrice - (property.mortgage?.originalAmount || 0)) + 
    (property.closingCosts || 0) + (property.initialRenovations || 0);
  const pricePerSquareFoot = property.squareFootage > 0 
    ? (property.purchasePrice / property.squareFootage) 
    : 0;
  const appreciation = financialMetrics.propertyValue - property.purchasePrice;
  const downPayment = property.purchasePrice - (property.mortgage?.originalAmount || 0);
  
  // Calculate equity via mortgage principal payments
  let equityViaPrincipalPayments = 0;
  if (property.mortgage) {
    try {
      const monthlyPrincipal = getMonthlyMortgagePrincipal(property.mortgage);
      const purchaseDate = new Date(property.purchaseDate);
      const currentDate = new Date();
      const monthsElapsed = Math.max(0, (currentDate.getFullYear() - purchaseDate.getFullYear()) * 12 + 
        (currentDate.getMonth() - purchaseDate.getMonth()));
      equityViaPrincipalPayments = monthlyPrincipal * monthsElapsed;
    } catch (error) {
      console.warn('Error calculating equity via principal payments:', error);
      equityViaPrincipalPayments = 0;
    }
  }
  
  // Calculate total mortgage interest paid (including remaining scheduled for current year)
  let totalMortgageInterestPaid = 0;
  if (property.mortgage) {
    try {
      const monthlyInterest = getMonthlyMortgageInterest(property.mortgage);
      const mortgageStartDate = new Date(property.mortgage.startDate || property.purchaseDate);
      const currentDate = new Date();
      
      // Calculate months elapsed since mortgage start
      const monthsElapsed = Math.max(0, (currentDate.getFullYear() - mortgageStartDate.getFullYear()) * 12 + 
        (currentDate.getMonth() - mortgageStartDate.getMonth()));
      
      // Interest already paid
      const interestPaidSoFar = monthlyInterest * monthsElapsed;
      
      // Remaining months in current calendar year
      const currentMonth = currentDate.getMonth(); // 0-11
      const remainingMonthsInYear = 12 - currentMonth - 1; // -1 because current month is partially paid
      
      // Remaining scheduled interest for current year
      const remainingInterestForYear = monthlyInterest * remainingMonthsInYear;
      
      // Total = interest paid so far + remaining for current year
      totalMortgageInterestPaid = interestPaidSoFar + remainingInterestForYear;
    } catch (error) {
      console.warn('Error calculating total mortgage interest paid:', error);
      totalMortgageInterestPaid = 0;
    }
  }

  // Calculate total mortgage principal paid (including remaining scheduled for current year)
  let totalMortgagePrincipalPaid = 0;
  if (property.mortgage) {
    try {
      const monthlyPrincipal = getMonthlyMortgagePrincipal(property.mortgage);
      const mortgageStartDate = new Date(property.mortgage.startDate || property.purchaseDate);
      const currentDate = new Date();
      
      // Calculate months elapsed since mortgage start
      const monthsElapsed = Math.max(0, (currentDate.getFullYear() - mortgageStartDate.getFullYear()) * 12 + 
        (currentDate.getMonth() - mortgageStartDate.getMonth()));
      
      // Principal already paid
      const principalPaidSoFar = monthlyPrincipal * monthsElapsed;
      
      // Remaining months in current calendar year
      const currentMonth = currentDate.getMonth(); // 0-11
      const remainingMonthsInYear = 12 - currentMonth - 1; // -1 because current month is partially paid
      
      // Remaining scheduled principal for current year
      const remainingPrincipalForYear = monthlyPrincipal * remainingMonthsInYear;
      
      // Total = principal paid so far + remaining for current year
      totalMortgagePrincipalPaid = principalPaidSoFar + remainingPrincipalForYear;
    } catch (error) {
      console.warn('Error calculating total mortgage principal paid:', error);
      totalMortgagePrincipalPaid = 0;
    }
  }

  return (
    <RequireAuth>
      <Layout>
        <div className="space-y-6">
          {/* Header with Edit buttons */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{property.name || property.nickname}</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-300">{property.address}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowEditPropertyModal(true)}>Edit Property</Button>
              <Button onClick={() => setShowAddExpenseModal(true)}>Add Expense</Button>
            </div>
          </div>

          {/* Property Summary & Purchase Details with Image */}
          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-gray-500" />
              <h2 className="text-xl font-semibold">Property Summary & Purchase Details</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Property Details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Year Built</span>
                  <span className="font-medium text-gray-900 dark:text-white">{property.yearBuilt || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Number of Units</span>
                  <span className="font-medium text-gray-900 dark:text-white">{property.units || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Unit Size</span>
                  <span className="font-medium text-gray-900 dark:text-white text-right">
                    {property.units > 1 && property.squareFootage ? (
                      <div className="space-y-0.5">
                        {Array.from({ length: property.units }, (_, index) => {
                          const unitSize = property.squareFootage / property.units;
                          return (
                            <div key={index} className="text-xs">
                              Unit {index + 1}: {formatNumber(unitSize)} sq ft
                            </div>
                          );
                        })}
                      </div>
                    ) : property.squareFootage && property.units 
                      ? `${formatNumber(property.squareFootage / (property.units || 1))} sq ft`
                      : property.squareFootage 
                        ? `${formatNumber(property.squareFootage)} sq ft`
                        : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Unit Type</span>
                  <span className="font-medium text-gray-900 dark:text-white text-right">
                    {property.units > 1 && property.bedrooms && property.bathrooms && property.bedrooms.length > 0 ? (
                      <div className="space-y-0.5">
                        {property.bedrooms.map((beds, index) => {
                          const baths = property.bathrooms && property.bathrooms[index] !== undefined ? property.bathrooms[index] : (property.bathrooms && property.bathrooms[0] ? property.bathrooms[0] : 0);
                          return (
                            <div key={index} className="text-xs">
                              Unit {index + 1}: {beds} Bed, {baths} Bath
                            </div>
                          );
                        })}
                      </div>
                    ) : property.unitConfig || (property.bedrooms && property.bedrooms[0] !== undefined && property.bathrooms && property.bathrooms[0] !== undefined
                      ? `${property.bedrooms[0]} Bed, ${property.bathrooms[0]} Bath`
                      : property.unitConfig || 'N/A')}
                  </span>
                </div>
                <div className="pt-2 border-t border-black/10 dark:border-white/10"></div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">Total Investment</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totalCashInvested)}</span>
                </div>
              </div>
              
              {/* Column 2: Purchase & Value Details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Purchase Date</span>
                  <span className="font-medium text-gray-900 dark:text-white">{new Date(property.purchaseDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Purchase Price</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(property.purchasePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Purchase Price Per Sq.Ft</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(pricePerSquareFoot)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Down Payment</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(property.purchasePrice - (property.mortgage?.originalAmount || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Original Mortgage</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(property.mortgage?.originalAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Closing Costs</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(property.closingCosts || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Renovations</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(property.initialRenovations || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Forecasted Equity Earned This Year</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(financialMetrics.forecastedEquity)}</span>
                </div>
              </div>
              
              {/* Column 3: Thumbnail Image */}
              <div className="flex items-center justify-center">
                <div className="w-full h-64 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
                  {property.imageUrl ? (
                    <img 
                      src={`${property.imageUrl}?v=3`}
                      alt={property.name || property.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <div className="text-lg font-medium">Property Image</div>
                        <div className="text-sm">Upload functionality coming soon</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* General Notes Section */}
          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md transition-shadow">
            <button
              onClick={() => toggleSection('generalNotes')}
              className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#205A3E]" />
                <h2 className="text-xl font-semibold">General Notes</h2>
              </div>
              {openSections.generalNotes ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
                {openSections.generalNotes && (
                  <div>
                    <textarea
                      value={notes}
                      onChange={handleNotesChange}
                      placeholder="Add your notes about this property..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y min-h-[100px]"
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {notesChanged ? 'Saving...' : 'Notes are automatically saved'}
                    </div>
                  </div>
                )}
          </div>

          {/* Key Financial Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Estimated Property Value */}
            <div className="relative rounded-2xl border border-[#205A3E]/30 dark:border-[#1C4F39]/40 bg-gradient-to-br from-[#D9E5DC] via-[#F4F8F5] to-transparent dark:from-[#1A2F25] dark:via-[#101B15] dark:to-transparent p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Estimated Property Value
                  </h3>
                </div>
                <div className="relative rounded-full p-1.5 text-[#205A3E] dark:text-[#66B894] bg-white/90 dark:bg-[#1D3A2C]/70 cursor-help flex-shrink-0 flex items-center justify-center">
                  <DollarSign className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(financialMetrics.propertyValue)}
              </div>
              <div className="mt-2.5 border-t-[2px] border-[#205A3E]/30 dark:border-[#66B894]/30" />
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {formatCurrency(financialMetrics.equity)} equity ({formatPercentage(financialMetrics.equityPercentage)}) <span className="mx-1.5">●</span> {formatCurrency(financialMetrics.mortgageBalance)} debt
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {(() => {
                    const purchaseYear = new Date(property.purchaseDate).getFullYear();
                    const purchasePrice = property.purchasePrice || 0;
                    const currentValue = financialMetrics.propertyValue || 0;
                    const changePercent = purchasePrice > 0 ? ((currentValue - purchasePrice) / purchasePrice) * 100 : 0;
                    const isIncrease = changePercent >= 0;
                    return `${isIncrease ? '+' : ''}${formatPercentage(Math.abs(changePercent))} ${isIncrease ? 'increase' : 'decrease'} since ${purchaseYear}`;
                  })()}
                </p>
              </div>
            </div>

            {/* Estimated Equity */}
            <div className="relative rounded-2xl border border-[#1A4A5A]/25 dark:border-[#123640]/40 bg-gradient-to-br from-[#D8E6EA] via-[#F5F9FA] to-transparent dark:from-[#11252B] dark:via-[#0B181D] dark:to-transparent p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Estimated Equity
                  </h3>
                </div>
                <div className="relative rounded-full p-1.5 text-[#1A4A5A] dark:text-[#7AC0CF] bg-white/90 dark:bg-[#132E36]/70 cursor-help flex-shrink-0 flex items-center justify-center">
                  <Home className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(financialMetrics.equity)}
              </div>
              <div className="mt-2.5 border-t-[2px] border-[#1A4A5A]/30 dark:border-[#7AC0CF]/30" />
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">- Down Payment</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatCurrency(downPayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">- Property Value Appreciation</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">+{formatCurrency(appreciation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">- Equity via Payments To Mortgage Principal</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatCurrency(equityViaPrincipalPayments)}</span>
                </div>
              </div>
            </div>

            {/* Mortgage Debt */}
            <div className="relative rounded-2xl border border-[#205A3E]/30 dark:border-[#1C4F39]/40 bg-gradient-to-br from-[#D9E5DC] via-[#F4F8F5] to-transparent dark:from-[#1A2F25] dark:via-[#101B15] dark:to-transparent p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Mortgage Debt
                  </h3>
                </div>
                <div className="relative rounded-full p-1.5 text-[#205A3E] dark:text-[#66B894] bg-white/90 dark:bg-[#1D3A2C]/70 cursor-help flex-shrink-0 flex items-center justify-center">
                  <DollarSign className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(financialMetrics.mortgageBalance)}
              </div>
              <div className="mt-2.5 border-t-[2px] border-[#205A3E]/30 dark:border-[#66B894]/30" />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Portfolio LTV (Loan-to-Value): {formatPercentage(financialMetrics.portfolioLTV)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Total Mortgage Interest Paid: <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(totalMortgageInterestPaid)}</span>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Total Mortgage Principal Paid: <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(totalMortgagePrincipalPaid)}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Main Content - Full Width */}
            <div className="space-y-6">
              {/* Income & Expenses Section */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      Income & Expenses
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Annualized snapshot of how rent covers operating costs and debt service.
                    </p>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-semibold flex-shrink-0 ${
                      financialMetrics.netCashFlow >= 0
                        ? 'bg-[#D9E5DC] text-[#205A3E] dark:bg-[#1D3A2C] dark:text-[#66B894]'
                        : 'bg-[#F7D9D9] text-[#9F3838] dark:bg-[#2B1111] dark:text-[#F2A5A5]'
                    }`}
                  >
                    {formatPercentage(financialMetrics.margin)} margin
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Total Revenue */}
                  <div className="relative pl-2">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <span>Total Revenue</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(financialMetrics.annualRevenue)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-[#205A3E] dark:bg-[#2F7E57]"
                        style={{ width: '100%' }}
                        role="presentation"
                      />
                    </div>
                  </div>

                  {/* Total Expenses */}
                  <div className="relative pl-2">
                    <span
                      className="absolute left-0 top-0 h-full border-l border-dashed border-gray-300 dark:border-gray-700"
                      aria-hidden="true"
                    />
                    <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <span>Total Expenses</span>
                      <span className="text-gray-900 dark:text-white">-{formatCurrency(financialMetrics.totalExpenses)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-[#E16262] dark:bg-[#A12424]"
                        style={{ width: `${Math.min(100, (financialMetrics.totalExpenses / financialMetrics.annualRevenue) * 100)}%` }}
                        role="presentation"
                      />
                    </div>
                  </div>

                  {/* Operating Expenses */}
                  <div className="relative pl-8">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      <span>Operating Expenses ({Math.round((financialMetrics.annualOperatingExpenses / financialMetrics.annualRevenue) * 100)}%)</span>
                      <span className="text-gray-900 dark:text-white">-{formatCurrency(financialMetrics.annualOperatingExpenses)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-[#9CA3AF] dark:bg-[#E2E8F0]"
                        style={{ width: `${Math.min(100, (financialMetrics.annualOperatingExpenses / financialMetrics.annualRevenue) * 100)}%` }}
                        role="presentation"
                      />
                    </div>
                  </div>

                  {/* Debt Service */}
                  <div className="relative pl-8">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      <span>Debt Service ({Math.round((financialMetrics.annualDebtService / financialMetrics.annualRevenue) * 100)}%)</span>
                      <span className="text-gray-900 dark:text-white">-{formatCurrency(financialMetrics.annualDebtService)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-[#9CA3AF] dark:bg-[#E2E8F0]"
                        style={{ width: `${Math.min(100, (financialMetrics.annualDebtService / financialMetrics.annualRevenue) * 100)}%` }}
                        role="presentation"
                      />
                    </div>
                  </div>
                </div>

                {/* Net Cash Flow */}
                <div
                  className={`mt-5 flex items-start justify-between rounded-md border px-4 py-3 text-sm ${
                    financialMetrics.netCashFlow >= 0
                      ? 'border-[#C7D9CB] bg-[#EFF4F0] text-[#205A3E] dark:border-[#244632] dark:bg-[#15251D] dark:text-[#7AC0A1]'
                      : 'border-[#E1B8B8] bg-[#FDF3F3] text-[#9F3838] dark:border-[#4C1F1F] dark:bg-[#1F1111] dark:text-[#F2A5A5]'
                  }`}
                >
                  <div>
                    <p className="font-semibold">Net Cash Flow</p>
                    <p className="text-xs opacity-80">After operating expenses and debt service</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold">{formatCurrency(financialMetrics.netCashFlow)}</p>
                    <p className="text-xs font-medium opacity-80">
                      {formatPercentage((financialMetrics.totalExpenses / financialMetrics.annualRevenue) * 100)}% of revenue consumed
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Metrics Section */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* CAP RATE */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">CAP RATE</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {formatPercentage(financialMetrics.capRate)}
                    </div>
                    <div className={`text-xs font-semibold ${capRateStatus.color}`}>
                      {capRateStatus.label}
                    </div>
                  </div>

                  {/* CASH ON CASH */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">CASH ON CASH</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {formatPercentage(financialMetrics.cashOnCash)}
                    </div>
                    <div className={`text-xs font-semibold ${cashOnCashStatus.color}`}>
                      {cashOnCashStatus.label}
                    </div>
                  </div>

                  {/* DSCR */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">DSCR</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {financialMetrics.dscr.toFixed(2)}
                    </div>
                    <div className={`text-xs font-semibold ${dscrStatus.color}`}>
                      {dscrStatus.label}
                    </div>
                  </div>

                  {/* IRR */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-600 dark:text-gray-400">IRR</div>
                      <select className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800">
                        <option>5Y</option>
                      </select>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {formatPercentage(financialMetrics.irr)}
                    </div>
                    <div className={`text-xs font-semibold ${irrStatus.color}`}>
                      {irrStatus.label}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Summary Card */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleSection('propertyFinancials')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#205A3E]" />
                    <h2 className="text-xl font-semibold">Expense Summary</h2>
                  </div>
                  {openSections.propertyFinancials ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openSections.propertyFinancials && (
                  <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => setExpenseView('monthly')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          expenseView === 'monthly'
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setExpenseView('annual')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          expenseView === 'annual'
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Annual
                      </button>
                  </div>
                </div>

                <div>
                  {/* Expenses Section - Three Column Layout */}
                  <div>
                    {expenseChartData.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No expense data available. Please add expenses to see the breakdown.</p>
                        {!isHydrated && <p className="text-xs mt-2">Loading...</p>}
                        {isHydrated && !property?.monthlyExpenses && <p className="text-xs mt-2">Property expenses not found.</p>}
                      </div>
                    ) : (
                    /* Three-Column Layout: Chart | Expenses | YoY Increase */
                    <div className="grid grid-cols-3 gap-6">
                      {/* Left Column: Donut Chart */}
                      <div className="flex flex-col items-center">
                        <div className="relative overflow-visible" style={{ width: '320px', height: '320px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                              <Pie
                                data={expenseChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={98}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                onMouseEnter={(data, index) => setHoveredSegment(index)}
                                onMouseLeave={() => setHoveredSegment(null)}
                                label={({ percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                                  // Show labels for all segments (removed minimum threshold)
                                  if (percent <= 0) return null;
                                  
                                  const RADIAN = Math.PI / 180;
                                  // Position label further outside the chart for better visibility
                                  const labelRadius = outerRadius + 35;
                                  const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
                                  const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
                                  
                                  // Determine quadrant for proper positioning
                                  const isRightSide = x > cx;
                                  
                                  // Calculate text width more accurately
                                  const percentText = `${(percent * 100).toFixed(0)}%`;
                                  const textWidth = percentText.length * 9 + 10;
                                  const textHeight = 20;
                                  
                                  // Adjust positioning based on quadrant with padding to prevent clipping
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
                                  
                                  // Ensure labels don't get clipped by checking bounds
                                  const containerWidth = 320;
                                  const containerHeight = 320;
                                  const margin = 30;
                                  const minX = margin;
                                  const maxX = containerWidth - margin;
                                  const minY = margin;
                                  const maxY = containerHeight - margin;
                                  
                                  // Clamp label position to stay within visible bounds
                                  const clampedRectX = Math.max(minX, Math.min(maxX - textWidth, rectX));
                                  const clampedY = Math.max(minY + textHeight / 2, Math.min(maxY - textHeight / 2, y));
                                  
                                  return (
                                    <g>
                                      {/* Background for better readability */}
                                      <rect
                                        x={clampedRectX}
                                        y={clampedY - textHeight / 2}
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
                                        x={isRightSide ? clampedRectX + 6 : clampedRectX + textWidth - 6} 
                                        y={clampedY} 
                                        fill="#111827" 
                                        textAnchor={textAnchor} 
                                        dominantBaseline="central"
                                        fontSize={14}
                                        fontWeight="700"
                                        className="pointer-events-none dark:fill-gray-100"
                                      >
                                        {percentText}
                                      </text>
                                    </g>
                                  );
                                }}
                                labelLine={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                  // Show label lines for all segments (removed minimum threshold)
                                  if (percent <= 0) return null;
                                  
                                  const RADIAN = Math.PI / 180;
                                  // Start point: outer edge of segment (where the dot will be)
                                  const x1 = cx + outerRadius * Math.cos(-midAngle * RADIAN);
                                  const y1 = cy + outerRadius * Math.sin(-midAngle * RADIAN);
                                  // End point: where label starts (slightly shorter to prevent clipping)
                                  const x2 = cx + (outerRadius + 35) * Math.cos(-midAngle * RADIAN);
                                  const y2 = cy + (outerRadius + 35) * Math.sin(-midAngle * RADIAN);
                                  
                                  return (
                                    <g>
                                      {/* Larger, more visible black dot at connection point */}
                                      <circle
                                        cx={x1}
                                        cy={y1}
                                        r={4}
                                        fill="#1f2937"
                                        stroke="white"
                                        strokeWidth={1}
                                        className="dark:fill-gray-100 dark:stroke-gray-800"
                                      />
                                      {/* Thicker, more visible line connecting dot to label */}
                                      <line
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                        stroke="#1f2937"
                                        strokeWidth={2.5}
                                        strokeLinecap="round"
                                        className="dark:stroke-gray-100"
                                      />
                                    </g>
                                  );
                                }}
                              >
                                {expenseChartData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    style={{
                                      filter: hoveredSegment === index ? 'brightness(1.1) drop-shadow(0 0 6px rgba(0,0,0,0.3))' : 'none',
                                      transform: hoveredSegment === index ? 'scale(1.05)' : 'scale(1)',
                                      transformOrigin: 'center',
                                      transition: 'all 0.2s ease-in-out'
                                    }}
                                  />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Total Expense Text - Below Chart */}
                        <div className="mt-3 text-center">
                          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(expenseChartData.reduce((sum, item) => sum + item.value, 0))}
                            </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Total Expenses
                          </div>
                        </div>
                      </div>

                      {/* Middle Column: Expense Legend */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                          Expenses
                        </h3>
                        <div className="space-y-1.5">
                        {expenseChartData.length > 0 ? (
                          expenseChartData.map((entry, index) => {
                            return (
                              <div
                                key={index}
                                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-all duration-200 cursor-pointer group ${
                                  hoveredSegment === index
                                      ? 'bg-gray-100 dark:bg-gray-700 shadow-sm scale-[1.02]'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                                onMouseEnter={() => setHoveredSegment(index)}
                                onMouseLeave={() => setHoveredSegment(null)}
                              >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div
                                      className={`w-3.5 h-3.5 rounded-full flex-shrink-0 transition-all duration-200 ${
                                        hoveredSegment === index ? 'ring-2 ring-offset-1' : ''
                                      }`}
                                      style={{ 
                                        backgroundColor: entry.color,
                                        ringColor: entry.color
                                      }}
                                  ></div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors truncate">
                                    {entry.name}
                                  </span>
                                </div>
                                  <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold ml-3 flex-shrink-0">
                                    {formatCurrency(entry.value)}
                                  </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                            <div className="text-sm">No expense data available</div>
                          </div>
                        )}
                        </div>
                      </div>

                      {/* Right Column: Year Over Year Increase */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                          Year Over Year Increase
                        </h3>
                        <div className="space-y-1.5">
                          {expenseChartData.length > 0 ? (
                            expenseChartData.map((entry, index) => {
                              const yoYChange = expenseYoYData[entry.key];
                              const hasIncrease = yoYChange !== null && yoYChange !== undefined;
                              
                              return (
                                <div
                                  key={index}
                                  className={`flex items-center justify-end py-2.5 px-3 rounded-lg transition-all duration-200 ${
                                    hoveredSegment === index
                                      ? 'bg-gray-100 dark:bg-gray-700 shadow-sm scale-[1.02]'
                                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                  }`}
                                  onMouseEnter={() => setHoveredSegment(index)}
                                  onMouseLeave={() => setHoveredSegment(null)}
                                >
                                  <span className={`text-sm font-semibold ${
                                    hasIncrease && yoYChange > 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : hasIncrease && yoYChange < 0
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {hasIncrease ? `${yoYChange > 0 ? '+' : ''}${yoYChange.toFixed(1)}%` : 'N/A'}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                              <div className="text-xs">No data</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
                  </div>
                )}
              </div>



              {/* Historical Performance Chart */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleSection('historicalPerformance')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#205A3E]" />
                  <h2 className="text-xl font-semibold">Historical Performance</h2>
                  </div>
                  {openSections.historicalPerformance ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openSections.historicalPerformance && (
                  <div>
                  <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        Based on actual records
                      </span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400 mr-2">Show:</span>
                        <button
                          onClick={() => toggleMetric('income')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            visibleMetrics.income
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          Income
                        </button>
                        <button
                          onClick={() => toggleMetric('expenses')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            visibleMetrics.expenses
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          Expenses
                        </button>
                        <button
                          onClick={() => toggleMetric('cashFlow')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            visibleMetrics.cashFlow
                              ? 'bg-[#205A3E]/10 dark:bg-[#205A3E]/20 text-[#205A3E] dark:text-[#4ade80] border border-[#205A3E]/30 dark:border-[#205A3E]/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          Cash Flow
                        </button>
                      </div>
                    </div>
                    
                    {/* Year Range Controls */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label htmlFor="startYear" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Start Year:
                        </label>
                        <input
                          id="startYear"
                          type="number"
                          min={availableYears.min || 2000}
                          max={availableYears.max || new Date().getFullYear()}
                          value={historicalStartYear || ''}
                          onChange={(e) => {
                            const year = parseInt(e.target.value);
                            if (!isNaN(year) && year >= (availableYears.min || 2000) && year <= (availableYears.max || new Date().getFullYear())) {
                              setHistoricalStartYear(year);
                            }
                          }}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#205A3E] focus:border-transparent"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label htmlFor="numYears" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Number of Years:
                        </label>
                        <input
                          id="numYears"
                          type="number"
                          min="1"
                          max="20"
                          value={historicalYears}
                          onChange={(e) => {
                            const years = parseInt(e.target.value);
                            if (!isNaN(years) && years >= 1 && years <= 20) {
                              setHistoricalYears(years);
                            }
                          }}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#205A3E] focus:border-transparent"
                        />
                      </div>
                      
                      {availableYears.min && availableYears.max && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Available: {availableYears.min} - {availableYears.max}
                        </span>
                      )}
                    </div>
                  </div>

                <div className="h-80">
                  {historicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="year" 
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#9ca3af' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#9ca3af' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            formatCurrency(value), 
                            name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Cash Flow'
                          ]}
                          labelFormatter={(year) => `Year: ${year}`}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend 
                          formatter={(value) => {
                            switch(value) {
                              case 'income': return 'Income';
                              case 'expenses': return 'Expenses';
                              case 'cashFlow': return 'Cash Flow';
                              default: return value;
                            }
                          }}
                        />
                        {visibleMetrics.income && (
                        <Line 
                          type="monotone" 
                          dataKey="income" 
                          stroke="#22c55e" 
                          strokeWidth={3}
                          dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
                        />
                        )}
                        {visibleMetrics.expenses && (
                        <Line 
                          type="monotone" 
                          dataKey="expenses" 
                          stroke="#ef4444" 
                          strokeWidth={3}
                          dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                        />
                        )}
                        {visibleMetrics.cashFlow && (
                        <Line 
                          type="monotone" 
                          dataKey="cashFlow" 
                          stroke="#205A3E" 
                          strokeWidth={3}
                          dot={{ fill: '#205A3E', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#205A3E', strokeWidth: 2 }}
                        />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <div className="text-sm">No historical data available</div>
                      </div>
                    </div>
                  )}
                </div>
                  </div>
                )}
              </div>

              {/* Year-over-Year Analysis */}
              <YoYAnalysis property={property} assumptions={DEFAULT_ASSUMPTIONS} baselineAssumptions={DEFAULT_ASSUMPTIONS} />

              {/* Current Tenants */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleSection('currentTenants')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#205A3E]" />
                    <h2 className="text-xl font-semibold">Current Tenants</h2>
                  </div>
                  {openSections.currentTenants ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openSections.currentTenants && (
                  <div>
                    <div className="space-y-3">
                      {property.tenants && property.tenants.length > 0 ? (
                        property.tenants.map((tenant, index) => {
                          const formatDate = (dateStr) => {
                            if (!dateStr || dateStr === 'Active' || dateStr === 'Invalid Date') return dateStr;
                            try {
                              const date = new Date(dateStr);
                              return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                      } catch (e) {
                              return dateStr;
                            }
                          };
                          
                          const leaseStartDate = formatDate(tenant.leaseStart);
                          const leaseEndDate = tenant.leaseEnd === 'Active' ? 'Active' : formatDate(tenant.leaseEnd);
                    
                    return (
                      <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                                  <div className="font-semibold text-gray-900 dark:text-white mb-2">{tenant.name}</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">Unit {tenant.unit || 'N/A'}</span>
                              </div>
                                  <div className="flex items-center gap-4 mt-3">
                                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(tenant.rent)}/mo
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                      <Calendar className="w-4 h-4" />
                                      <span>Lease term: {leaseStartDate} - {leaseEndDate}</span>
                                    </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                        })
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <p className="text-sm">No tenants listed for this property.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Annual Expense History Chart */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleSection('annualExpenseHistory')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-[#205A3E]" />
                  <h2 className="text-xl font-semibold">Annual Expense History</h2>
                  </div>
                  <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    Categorized expenses
                  </span>
                    {openSections.annualExpenseHistory ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                </div>
                </button>
                {openSections.annualExpenseHistory && (
                  <div>
                <AnnualExpenseChart expenseHistory={property?.expenseHistory || []} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Property Modal */}
        {showEditPropertyModal && (
          <EditPropertyModal
            property={property}
            onClose={() => setShowEditPropertyModal(false)}
            onSave={(updatedData) => {
              // In a real app, this would save to the database
              console.log('Property updated:', updatedData);
              addToast('Property updated successfully!', { type: 'success' });
              setShowEditPropertyModal(false);
            }}
          />
        )}

        {/* Add Expense Modal */}
        {showAddExpenseModal && (
          <AddExpenseModal
            property={property}
            onClose={() => setShowAddExpenseModal(false)}
            onSave={(expenseData) => {
              // In a real app, this would save to the database
              console.log('Expense added:', expenseData);
              addToast('Expense added successfully!', { type: 'success' });
              setShowAddExpenseModal(false);
            }}
          />
        )}

      </Layout>
    </RequireAuth>
  );
}

// Edit Property Modal Component
function EditPropertyModal({ property, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: property?.name || '',
    address: property?.address || '',
    type: property?.type || '',
    units: property?.units || 1,
    squareFootage: property?.squareFootage || 0,
    purchasePrice: property?.purchasePrice || 0,
    purchaseDate: property?.purchaseDate || '',
    currentValue: property?.currentValue || 0,
    yearBuilt: property?.yearBuilt || 0,
    monthlyRent: property?.rent?.monthlyRent || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Edit Property</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Property Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Property Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => updateField('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select type</option>
                <option value="Condo">Condo</option>
                <option value="House">House</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Apartment">Apartment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Units
              </label>
              <input
                type="number"
                min="1"
                value={formData.units}
                onChange={(e) => updateField('units', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Square Footage
              </label>
              <input
                type="number"
                min="0"
                value={formData.squareFootage}
                onChange={(e) => updateField('squareFootage', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purchase Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => updateField('purchasePrice', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                value={formData.purchaseDate ? new Date(formData.purchaseDate).toISOString().split('T')[0] : ''}
                onChange={(e) => updateField('purchaseDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Value
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) => updateField('currentValue', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year Built
              </label>
              <input
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={formData.yearBuilt}
                onChange={(e) => updateField('yearBuilt', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Monthly Rent
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.monthlyRent}
                onChange={(e) => updateField('monthlyRent', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Expense Modal Component
function AddExpenseModal({ property, onClose, onSave }) {
  const [formData, setFormData] = useState({
    category: 'Property Tax',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    frequency: 'monthly'
  });

  const expenseCategories = [
    'Property Tax',
    'Insurance',
    'Condo Fees',
    'Maintenance',
    'Professional Fees',
    'Utilities',
    'Other'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      propertyId: property?.id,
      amount: parseFloat(formData.amount)
    });
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Add Expense</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            >
              {expenseCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => updateField('amount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => updateField('frequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            >
              <option value="one-time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Add any notes about this expense..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Expense
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


