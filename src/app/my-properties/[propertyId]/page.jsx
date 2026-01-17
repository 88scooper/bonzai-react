"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import Button from "@/components/Button";
import { useProperty } from "@/context/PropertyContext";
import { formatCurrency, formatPercentage, formatNumber } from "@/utils/formatting";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import AnnualExpenseChart from '@/components/charts/AnnualExpenseChart';
import { useToast } from "@/context/ToastContext";
import { X, ChevronDown, ChevronUp, FileText, DollarSign, TrendingUp, Home, Users, BarChart3, PieChart as PieChartIcon, Calendar, Plus, Edit2, Trash2, Check } from "lucide-react";
import PropertyHeader from "@/components/shared/PropertyHeader";
import YoYAnalysis from "@/components/calculators/YoYAnalysis";
import { DEFAULT_ASSUMPTIONS } from "@/lib/sensitivity-analysis";
import { getPropertyNotes, savePropertyNotes } from "@/lib/property-notes-storage";
import { getPropertyTabs, savePropertyTabs, addPropertyTab, updatePropertyTab, deletePropertyTab } from "@/lib/property-tabs-storage";
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
  
  // Edit functionality removed - users must use the Data page to modify property data
  
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
  
  // State for tenant tabs
  const [activeTenantTab, setActiveTenantTab] = useState('current');
  
  // State for custom property tabs
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabLabel, setEditingTabLabel] = useState('');
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState('');

  // Load notes when property is available
  useEffect(() => {
    if (propertyId && isHydrated) {
      const savedNotes = getPropertyNotes(propertyId);
      setNotes(savedNotes);
      
      // Load tabs
      const savedTabs = getPropertyTabs(propertyId);
      setTabs(savedTabs);
      // Don't auto-select a tab - General Notes (null) is the default
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
  
  // Tab handlers
  const handleAddTab = () => {
    if (!newTabLabel.trim()) return;
    const newTab = addPropertyTab(propertyId, newTabLabel.trim());
    const updatedTabs = getPropertyTabs(propertyId);
    setTabs(updatedTabs);
    setActiveTabId(newTab.id);
    setNewTabLabel('');
    setShowAddTabModal(false);
    addToast('Tab added successfully!', { type: 'success' });
  };
  
  const handleDeleteTab = (tabId) => {
    deletePropertyTab(propertyId, tabId);
    const updatedTabs = getPropertyTabs(propertyId);
    setTabs(updatedTabs);
    if (activeTabId === tabId) {
      // Switch to General Notes when deleting the active tab
      setActiveTabId(null);
    }
    addToast('Tab deleted successfully!', { type: 'success' });
  };
  
  const handleStartEditTab = (tab) => {
    setEditingTabId(tab.id);
    setEditingTabLabel(tab.label);
  };
  
  const handleSaveTabLabel = (tabId) => {
    if (!editingTabLabel.trim()) return;
    updatePropertyTab(propertyId, tabId, { label: editingTabLabel.trim() });
    const updatedTabs = getPropertyTabs(propertyId);
    setTabs(updatedTabs);
    setEditingTabId(null);
    setEditingTabLabel('');
    addToast('Tab label updated!', { type: 'success' });
  };
  
  const handleCancelEditTab = () => {
    setEditingTabId(null);
    setEditingTabLabel('');
  };
  
  const handleTabContentChange = (tabId, content) => {
    updatePropertyTab(propertyId, tabId, { content });
    // Update local state immediately for better UX
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId ? { ...tab, content } : tab
      )
    );
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

  // Process tenant data for rent chart with monthly granularity
  const rentChartData = useMemo(() => {
    if (!property?.tenants || property.tenants.length === 0) return [];
    
    // Find earliest and latest dates
    let earliestDate = null;
    let latestDate = new Date(); // Default to current date
    
    property.tenants.forEach(tenant => {
      try {
        const startDate = new Date(tenant.leaseStart);
        if (!earliestDate || startDate < earliestDate) {
          earliestDate = startDate;
        }
        
        if (tenant.leaseEnd && tenant.leaseEnd !== 'Active') {
          const endDate = new Date(tenant.leaseEnd);
          if (endDate > latestDate) {
            latestDate = endDate;
          }
        }
      } catch (e) {
        // Skip invalid dates
      }
    });
    
    if (!earliestDate) return [];
    
    // Generate monthly data points
    const monthlyData = [];
    const currentDate = new Date(earliestDate);
    currentDate.setDate(1); // Start of month
    
    while (currentDate <= latestDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Find active tenant(s) for this month
      let activeRent = 0;
      let activeTenant = null;
      let isChange = false;
      let change = 0;
      let changePercent = 0;
      
      property.tenants.forEach(tenant => {
        try {
          const leaseStart = new Date(tenant.leaseStart);
          const leaseEnd = tenant.leaseEnd === 'Active' 
            ? new Date() 
            : new Date(tenant.leaseEnd);
          
          // Check if tenant was active during this month
          const monthStart = new Date(year, month, 1);
          const monthEnd = new Date(year, month + 1, 0);
          
          if (leaseStart <= monthEnd && leaseEnd >= monthStart) {
            activeRent = tenant.rent || 0;
            activeTenant = tenant;
          }
        } catch (e) {
          // Skip invalid dates
        }
      });
      
      // Calculate change from previous month
      if (monthlyData.length > 0) {
        const previousRent = monthlyData[monthlyData.length - 1].rent;
        change = activeRent - previousRent;
        if (previousRent > 0) {
          changePercent = (change / previousRent) * 100;
        }
        isChange = change !== 0;
      }
      
      const period = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      monthlyData.push({
        period,
        date: new Date(currentDate),
        rent: activeRent,
        change,
        changePercent,
        tenantName: activeTenant?.name || 'Vacant',
        isIncrease: change > 0,
        isDecrease: change < 0,
        isChange
      });
      
      // Move to next month
      currentDate.setMonth(month + 1);
    }
    
    return monthlyData;
  }, [property?.tenants]);

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
          {/* Property Header with Bonzai Green Banner */}
          <PropertyHeader 
            property={property}
            onEdit={() => window.location.href = '/data'}
          />

          {/* Purchase Summary & Property Details with Image */}
          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-gray-500" />
              <h2 className="text-xl font-semibold">Purchase Summary & Property Details</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Purchase & Value Details */}
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
              </div>
              
              {/* Column 2: Property Details */}
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
                  <span className="text-gray-600 dark:text-gray-400">Principal Residence</span>
                  <span className="font-medium text-gray-900 dark:text-white">{property.isPrincipalResidence ? "Yes" : "No"}</span>
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
              <div className="flex items-center gap-2">
                {openSections.generalNotes && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddTabModal(true);
                    }}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Page
                  </Button>
                )}
                {openSections.generalNotes ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </button>
            {openSections.generalNotes && (
              <div>
                {tabs.length === 0 ? (
                  // No custom tabs - just show the main notes
                  <div>
                    <textarea
                      value={notes}
                      onChange={handleNotesChange}
                      placeholder="Add your notes about this property - dates key events, recording paint colours used, tracking the replacement of appliance - all these details can live here..."
                      rows={8}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y min-h-[200px]"
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {notesChanged ? 'Saving...' : 'Notes are automatically saved'}
                    </div>
                  </div>
                ) : (
                  // Has custom tabs - show tab interface
                  <div>
                    {/* Tab Navigation */}
                    <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                      {/* General Notes Tab */}
                      <div
                        className={`group flex items-center gap-2 px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                          !activeTabId
                            ? 'border-[#205A3E] dark:border-[#66B894]'
                            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => setActiveTabId(null)}
                      >
                        <button
                          className={`text-sm font-medium transition-colors ${
                            !activeTabId
                              ? 'text-[#205A3E] dark:text-[#66B894]'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          General Notes
                        </button>
                      </div>
                      {/* Custom Tabs */}
                      {tabs.map((tab) => (
                        <div
                          key={tab.id}
                          className={`group flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                            activeTabId === tab.id
                              ? 'border-[#205A3E] dark:border-[#66B894]'
                              : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          {editingTabId === tab.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingTabLabel}
                                onChange={(e) => setEditingTabLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveTabLabel(tab.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditTab();
                                  }
                                }}
                                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#205A3E] focus:border-transparent"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveTabLabel(tab.id)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Save"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={handleCancelEditTab}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Cancel"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => setActiveTabId(tab.id)}
                                className={`text-sm font-medium transition-colors ${
                                  activeTabId === tab.id
                                    ? 'text-[#205A3E] dark:text-[#66B894]'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                              >
                                {tab.label}
                              </button>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEditTab(tab)}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Edit label"
                                >
                                  <Edit2 className="w-3 h-3 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTab(tab.id)}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete tab"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Tab Content */}
                    {!activeTabId ? (
                      // General Notes content
                      <div>
                        <textarea
                          value={notes}
                          onChange={handleNotesChange}
                          placeholder="Add your notes about this property - dates key events, recording paint colours used, tracking the replacement of appliance - all these details can live here..."
                          rows={8}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y min-h-[200px]"
                        />
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {notesChanged ? 'Saving...' : 'Notes are automatically saved'}
                        </div>
                      </div>
                    ) : (
                      // Custom tab content
                      <div>
                        {tabs
                          .filter((tab) => tab.id === activeTabId)
                          .map((tab) => (
                            <div key={tab.id}>
                              <textarea
                                value={tab.content || ''}
                                onChange={(e) => handleTabContentChange(tab.id, e.target.value)}
                                placeholder="Add content for this page..."
                                rows={8}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y min-h-[200px]"
                              />
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Content is automatically saved
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
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
                <p className="text-[0.84375rem] text-gray-600 dark:text-gray-400">
                  {(() => {
                    const purchaseYear = new Date(property.purchaseDate).getFullYear();
                    const purchasePrice = property.purchasePrice || 0;
                    const currentValue = financialMetrics.propertyValue || 0;
                    const changePercent = purchasePrice > 0 ? ((currentValue - purchasePrice) / purchasePrice) * 100 : 0;
                    const isIncrease = changePercent >= 0;
                    return `${isIncrease ? '+' : ''}${formatPercentage(Math.abs(changePercent))} ${isIncrease ? 'increase' : 'decrease'} since ${purchaseYear}`;
                  })()}
                </p>
                <p className="text-[0.84375rem] text-gray-600 dark:text-gray-400">
                  {(() => {
                    const debtPercentage = financialMetrics.propertyValue > 0 
                      ? (financialMetrics.mortgageBalance / financialMetrics.propertyValue) * 100 
                      : 0;
                    return (
                      <>
                        {formatCurrency(financialMetrics.equity)} equity ({formatPercentage(financialMetrics.equityPercentage)}) <span className="mx-1.5">●</span> {formatCurrency(financialMetrics.mortgageBalance)} debt ({formatPercentage(debtPercentage)})
                      </>
                    );
                  })()}
                </p>
                <p className="text-[0.84375rem] text-gray-600 dark:text-gray-400">
                  Potential Cash-Out Refinance {formatCurrency(Math.max(0, (financialMetrics.propertyValue * 0.8) - financialMetrics.mortgageBalance))} (assuming 80%)
                </p>
              </div>
            </div>

            {/* Forecasted Annual Equity */}
            <div className="relative rounded-2xl border border-[#1A4A5A]/25 dark:border-[#123640]/40 bg-gradient-to-br from-[#D8E6EA] via-[#F5F9FA] to-transparent dark:from-[#11252B] dark:via-[#0B181D] dark:to-transparent p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Forecasted Annual Equity
                  </h3>
                </div>
                <div className="relative rounded-full p-1.5 text-[#1A4A5A] dark:text-[#7AC0CF] bg-white/90 dark:bg-[#132E36]/70 cursor-help flex-shrink-0 flex items-center justify-center">
                  <Home className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(financialMetrics.forecastedEquity)}
              </div>
              <div className="mt-2.5 border-t-[2px] border-[#1A4A5A]/30 dark:border-[#7AC0CF]/30" />
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[0.84375rem] text-gray-600 dark:text-gray-400">Estimated Equity</span>
                  <span className="text-[0.84375rem] font-medium text-gray-700 dark:text-gray-300">{formatCurrency(financialMetrics.equity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[0.84375rem] text-gray-600 dark:text-gray-400">- Down Payment</span>
                  <span className="text-[0.84375rem] font-medium text-gray-700 dark:text-gray-300">{formatCurrency(downPayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[0.84375rem] text-gray-600 dark:text-gray-400">- Property Value Appreciation</span>
                  <span className="text-[0.84375rem] font-medium text-emerald-600 dark:text-emerald-400">+{formatCurrency(appreciation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[0.84375rem] text-gray-600 dark:text-gray-400">- Equity Via Principal Mortgage Payments</span>
                  <span className="text-[0.84375rem] font-medium text-gray-700 dark:text-gray-300">{formatCurrency(equityViaPrincipalPayments)}</span>
                </div>
              </div>
            </div>

            {/* Mortgage Remaining */}
            <div className="relative rounded-2xl border border-[#D4B896]/40 dark:border-[#8B6F47]/40 bg-gradient-to-br from-[#F5F1EB] via-[#F9F6F2] to-transparent dark:from-[#3E2F1F] dark:via-[#2A1F14] dark:to-transparent p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#5C4033] dark:text-[#D4B896]">
                    Mortgage Remaining
                  </h3>
                </div>
                <div className="relative rounded-full p-1.5 text-[#8B6F47] dark:text-[#C9A882] bg-white/90 dark:bg-[#4A3524]/70 cursor-help flex-shrink-0 flex items-center justify-center">
                  <DollarSign className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-3 text-xl font-bold text-[#5C4033] dark:text-[#D4B896]">
                {formatCurrency(financialMetrics.mortgageBalance)}
              </div>
              <div className="mt-2.5 border-t-[2px] border-[#D4B896]/50 dark:border-[#8B6F47]/50" />
              <div className="mt-2 space-y-1">
                <p className="text-[0.84375rem] text-[#5C4033] dark:text-[#C9A882]">
                  Portfolio LTV (Loan-to-Value): {formatPercentage(financialMetrics.portfolioLTV)}
                </p>
                <p className="text-[0.84375rem] text-[#5C4033] dark:text-[#C9A882]">
                  Total Mortgage Interest Paid: <span className="font-medium text-[#5C4033] dark:text-[#D4B896]">{formatCurrency(totalMortgageInterestPaid)}</span>
                </p>
                <p className="text-[0.84375rem] text-[#5C4033] dark:text-[#C9A882]">
                  Total Mortgage Principal Paid: <span className="font-medium text-[#5C4033] dark:text-[#D4B896]">{formatCurrency(totalMortgagePrincipalPaid)}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Main Content - Full Width */}
            <div className="space-y-6">
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
                        <div className="relative overflow-visible" style={{ width: '310px', height: '310px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
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
                                  // Position label at the end of the line - reduced by 50%
                                  const labelRadius = outerRadius + 25;
                                  const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
                                  const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
                                  
                                  // Determine quadrant for proper text alignment
                                  const isRightSide = x > cx;
                                  
                                  // Calculate text width for background
                                  const percentText = `${(percent * 100).toFixed(0)}%`;
                                  const textWidth = percentText.length * 8 + 8;
                                  const textHeight = 20;
                                  
                                  // Container dimensions with margins
                                  const containerWidth = 310;
                                  const containerHeight = 310;
                                  const margin = 40;
                                  const minX = margin;
                                  const maxX = containerWidth - margin;
                                  const minY = margin;
                                  const maxY = containerHeight - margin;
                                  
                                  // Position background and text at the end of the line
                                  let rectX, textX, textAnchor;
                                  if (isRightSide) {
                                    // For right side, label starts at line end
                                    rectX = x;
                                    textX = x + 4;
                                    textAnchor = 'start';
                                    // Ensure label doesn't get clipped on the right
                                    if (rectX + textWidth > maxX) {
                                      rectX = maxX - textWidth;
                                      textX = rectX + 4;
                                    }
                                  } else {
                                    // For left side, label ends at line end
                                    rectX = x - textWidth;
                                    textX = x - 4;
                                    textAnchor = 'end';
                                    // Ensure label doesn't get clipped on the left
                                    if (rectX < minX) {
                                      rectX = minX;
                                      textX = rectX + textWidth - 4;
                                    }
                                  }
                                  
                                  // Clamp Y position to stay within bounds
                                  const clampedY = Math.max(minY + textHeight / 2, Math.min(maxY - textHeight / 2, y));
                                  
                                  return (
                                    <g>
                                      {/* Background for better readability */}
                                      <rect
                                        x={rectX}
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
                                        x={textX} 
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
                                  // End point: where label is positioned (at the end of the line) - reduced by 50%
                                  const x2 = cx + (outerRadius + 25) * Math.cos(-midAngle * RADIAN);
                                  const y2 = cy + (outerRadius + 25) * Math.sin(-midAngle * RADIAN);
                                  
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
                                  className={`flex items-center py-2.5 px-3 rounded-lg transition-all duration-200 cursor-pointer group ${
                                  hoveredSegment === index
                                      ? 'bg-gray-100 dark:bg-gray-700 shadow-sm scale-[1.02]'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                                onMouseEnter={() => setHoveredSegment(index)}
                                onMouseLeave={() => setHoveredSegment(null)}
                              >
                                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
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
                                  <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold whitespace-nowrap flex-shrink-0 min-w-[100px] text-right">
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

              {/* Tenant Details */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleSection('currentTenants')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#205A3E]" />
                    <h2 className="text-xl font-semibold">Tenant Details</h2>
                  </div>
                  {openSections.currentTenants ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openSections.currentTenants && (
                  <div>
                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => setActiveTenantTab('current')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          activeTenantTab === 'current'
                            ? 'text-[#205A3E] dark:text-[#66B894] border-b-2 border-[#205A3E] dark:border-[#66B894]'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        Current Tenants
                      </button>
                      <button
                        onClick={() => setActiveTenantTab('past')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          activeTenantTab === 'past'
                            ? 'text-[#205A3E] dark:text-[#66B894] border-b-2 border-[#205A3E] dark:border-[#66B894]'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        Past Tenants
                      </button>
                    </div>

                    {/* Grid Layout: Tenant List (1/3) and Chart (2/3) - Chart hidden for Past Tenants */}
                    <div className={`grid gap-6 ${activeTenantTab === 'current' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                      {/* Tenant List - 1/3 when chart visible, full width when chart hidden */}
                      <div className={`space-y-3 ${activeTenantTab === 'current' ? '' : 'w-full'}`}>
                      {(() => {
                          const formatDate = (dateStr) => {
                            if (!dateStr || dateStr === 'Active' || dateStr === 'Invalid Date') return dateStr;
                            try {
                              const date = new Date(dateStr);
                              return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                      } catch (e) {
                              return dateStr;
                            }
                          };
                          
                        // Filter tenants based on active tab
                        const currentDate = new Date();
                        currentDate.setHours(0, 0, 0, 0);
                        
                        const filteredTenants = property.tenants && property.tenants.length > 0
                          ? property.tenants.filter(tenant => {
                              if (activeTenantTab === 'current') {
                                // Current tenants: leaseEnd is 'Active' or leaseEnd is in the future
                                if (tenant.leaseEnd === 'Active') return true;
                                try {
                                  const leaseEndDate = new Date(tenant.leaseEnd);
                                  leaseEndDate.setHours(0, 0, 0, 0);
                                  return leaseEndDate >= currentDate;
                                } catch (e) {
                                  return false;
                                }
                              } else {
                                // Past tenants: leaseEnd is not 'Active' and leaseEnd is in the past
                                if (tenant.leaseEnd === 'Active') return false;
                                try {
                                  const leaseEndDate = new Date(tenant.leaseEnd);
                                  leaseEndDate.setHours(0, 0, 0, 0);
                                  return leaseEndDate < currentDate;
                                } catch (e) {
                                  return false;
                                }
                              }
                            })
                          : [];

                        if (filteredTenants.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              <p className="text-sm">
                                {activeTenantTab === 'current' 
                                  ? 'No current tenants listed for this property.'
                                  : 'No past tenants listed for this property.'}
                              </p>
                            </div>
                          );
                        }

                        return filteredTenants.map((tenant, index) => {
                          const leaseStartDate = formatDate(tenant.leaseStart);
                          const leaseEndDate = tenant.leaseEnd === 'Active' ? 'Active' : formatDate(tenant.leaseEnd);
                          
                          // Calculate duration of tenancy
                          const calculateTenancyDuration = () => {
                            try {
                              const startDate = new Date(tenant.leaseStart);
                              const endDate = tenant.leaseEnd === 'Active' 
                                ? new Date() 
                                : new Date(tenant.leaseEnd);
                              
                              if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                                return 'N/A';
                              }
                              
                              let years = endDate.getFullYear() - startDate.getFullYear();
                              let months = endDate.getMonth() - startDate.getMonth();
                              
                              // Adjust if months is negative
                              if (months < 0) {
                                years--;
                                months += 12;
                              }
                              
                              // Adjust for days - if end date day is before start date day, subtract a month
                              if (endDate.getDate() < startDate.getDate()) {
                                months--;
                                if (months < 0) {
                                  years--;
                                  months += 12;
                                }
                              }
                              
                              const yearsText = years > 0 ? `${years} ${years === 1 ? 'Year' : 'Years'}` : '';
                              const monthsText = months > 0 ? `${months} ${months === 1 ? 'Month' : 'Months'}` : '';
                              
                              if (yearsText && monthsText) {
                                return `${yearsText} ${monthsText}`;
                              } else if (yearsText) {
                                return yearsText;
                              } else if (monthsText) {
                                return monthsText;
                              } else {
                                return 'Less than 1 Month';
                              }
                            } catch (e) {
                              return 'N/A';
                            }
                          };
                          
                          const tenancyDuration = calculateTenancyDuration();
                    
                    return (
                      <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                                  <div className="font-semibold text-gray-900 dark:text-white mb-2">{tenant.name}</div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <div>
                                      <span className="font-medium">
                                        {tenant.unit 
                                          ? (tenant.unit.toString().toLowerCase().startsWith('unit') 
                                              ? tenant.unit 
                                              : `Unit ${tenant.unit}`)
                                          : 'Unit N/A'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">Key Deposit </span>
                                      <span className="font-medium">
                                        {tenant.keyDeposit !== undefined && tenant.keyDeposit !== null 
                                          ? formatCurrency(tenant.keyDeposit) 
                                          : formatCurrency(0)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">Duration of Tenancy </span>
                                      <span className="font-medium">{tenancyDuration}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        <span>Lease Term: {leaseStartDate} - {leaseEndDate}</span>
                                      </span>
                                    </div>
                                    <div className="mt-2">
                                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(tenant.rent)}/month
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                        );
                      });
                      })()}
                      </div>

                      {/* Rent Over Time Chart - 2/3 - Only show for Current Tenants */}
                      {activeTenantTab === 'current' && (
                        <div className="col-span-2">
                          {rentChartData && rentChartData.length > 0 ? (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Rent Over Time
                            </h3>
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={rentChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                  <XAxis 
                                    dataKey="period" 
                                    tick={{ fontSize: 10 }}
                                    tickLine={{ stroke: '#9ca3af' }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={70}
                                    interval={rentChartData.length > 12 ? Math.floor(rentChartData.length / 12) : 0}
                                  />
                                  <YAxis 
                                    tick={{ fontSize: 11 }}
                                    tickLine={{ stroke: '#9ca3af' }}
                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                  />
                                  <Tooltip 
                                    formatter={(value, name, props) => {
                                      if (name === 'rent') {
                                        const payload = props.payload;
                                        const changeInfo = payload.isChange 
                                          ? ` (${payload.change > 0 ? '+' : ''}${formatCurrency(payload.change)} from previous month)`
                                          : '';
                                        return [
                                          `${formatCurrency(value)}${changeInfo}`,
                                          'Monthly Rent'
                                        ];
                                      }
                                      return [value, name];
                                    }}
                                    labelFormatter={(period) => `Month: ${period}`}
                                    contentStyle={{
                                      backgroundColor: 'white',
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="rent" 
                                    stroke="#205A3E" 
                                    strokeWidth={2.5}
                                    dot={(props) => {
                                      const { cx, cy, payload, index } = props;
                                      // Show marker if there's a change, or if it's the first data point
                                      if (!payload.isChange && index !== 0 && payload.rent > 0) {
                                        return null; // Hide dot if no change (except first point)
                                      }
                                      
                                      const fillColor = payload.isIncrease 
                                        ? '#10b981' 
                                        : payload.isDecrease 
                                        ? '#ef4444' 
                                        : '#3b82f6';
                                      return (
                                        <circle 
                                          cx={cx} 
                                          cy={cy} 
                                          r={4} 
                                          fill={fillColor} 
                                          stroke="white" 
                                          strokeWidth={2}
                                        />
                                      );
                                    }}
                                    activeDot={{ r: 6, stroke: '#205A3E', strokeWidth: 2 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                                <span>Increase</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-red-500"></div>
                                <span>Decrease</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-blue-500"></div>
                                <span>No Change</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                            <p className="text-sm">No rent data available for chart</p>
                          </div>
                        )}
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

        {/* Edit functionality removed - users must use the Data page to modify property data */}

        {/* Add Tab Modal */}
        {showAddTabModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Add New Page</h2>
                <button
                  onClick={() => {
                    setShowAddTabModal(false);
                    setNewTabLabel('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Page Label
                  </label>
                  <input
                    type="text"
                    value={newTabLabel}
                    onChange={(e) => setNewTabLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTab();
                      }
                    }}
                    placeholder="Enter page label..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      setShowAddTabModal(false);
                      setNewTabLabel('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddTab}
                    disabled={!newTabLabel.trim()}
                  >
                    Add Page
                  </Button>
                </div>
              </div>
            </div>
          </div>
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


