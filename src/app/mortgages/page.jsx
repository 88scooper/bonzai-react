"use client";

import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import { useMortgages } from "@/hooks/useMortgages";
import { useState, useMemo, useEffect } from "react";
import { Plus, Filter, MoreVertical, Edit, Trash2, Eye, Calculator, TrendingDown, DollarSign, Percent, Calendar, Building2, Clock, Banknote, Download, BarChart3, PieChart, TrendingUp, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import MortgageFormUpgraded from "@/components/mortgages/MortgageFormUpgraded";
import MortgageDetails from "@/components/mortgages/MortgageDetails";
import AmortizationSchedule from "@/components/mortgages/AmortizationSchedule";
import MortgageSummaryBanner from "@/components/mortgages/MortgageSummaryBanner";
import MortgageDetailsPanel from "@/components/mortgages/MortgageDetailsPanel";
import PaymentBreakdown from "@/components/mortgages/PaymentBreakdown";
import MortgageCardView from "@/components/mortgages/MortgageCardView";
import { useProperties, usePropertyContext } from "@/context/PropertyContext";
import { formatCurrency, formatPercentage } from "@/utils/formatting";
import { calculateAmortizationSchedule } from "@/utils/mortgageCalculator";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from "recharts";
import { ListPageHeader } from "@/components/shared";

export default function MortgagesPage() {
  const { data: apiMortgages = [], isLoading: apiLoading, error, refetch: refetchMortgages } = useMortgages();
  const { properties, calculationsComplete } = usePropertyContext();
  
  // All state hooks must be called before any conditional logic
  const [showForm, setShowForm] = useState(false);
  const [editingMortgage, setEditingMortgage] = useState(null);
  const [viewingMortgage, setViewingMortgage] = useState(null);
  const [filterProperty, setFilterProperty] = useState("");
  const [showAmortization, setShowAmortization] = useState(false);
  const [selectedMortgage, setSelectedMortgage] = useState(null);
  const [selectedMortgageForDashboard, setSelectedMortgageForDashboard] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'dashboard', 'analytics', 'comparison', 'card'
  const [selectedMortgagesForComparison, setSelectedMortgagesForComparison] = useState([]);
  const [expandedMortgages, setExpandedMortgages] = useState(new Set());
  
  // Transform API mortgages to match the expected format
  // Also include mortgages from properties as fallback for properties without API mortgages
  const mortgages = useMemo(() => {
    // Start with API mortgages
    const apiMortgagesList = (apiMortgages || []).map(mortgage => ({
      id: mortgage.id,
      propertyId: mortgage.propertyId,
      lenderName: mortgage.lenderName || mortgage.lender,
      originalAmount: mortgage.originalAmount,
      interestRate: typeof mortgage.interestRate === 'number' 
        ? (mortgage.interestRate < 1 ? mortgage.interestRate * 100 : mortgage.interestRate) // Convert decimal to percentage if needed
        : 0,
      rateType: mortgage.rateType,
      amortizationPeriodYears: mortgage.amortizationPeriodYears || mortgage.amortizationYears,
      termYears: mortgage.termYears || (mortgage.termMonths ? mortgage.termMonths / 12 : 0),
      startDate: mortgage.startDate || mortgage.start_date,
      paymentFrequency: mortgage.paymentFrequency || mortgage.payment_frequency,
      mortgage: {
        lender: mortgage.lenderName || mortgage.lender,
        originalAmount: mortgage.originalAmount,
        interestRate: typeof mortgage.interestRate === 'number' 
          ? (mortgage.interestRate > 1 ? mortgage.interestRate / 100 : mortgage.interestRate) // Convert percentage to decimal if needed
          : 0,
        rateType: mortgage.rateType,
        amortizationYears: mortgage.amortizationPeriodYears || mortgage.amortizationYears,
        termMonths: mortgage.termMonths || (mortgage.termYears ? mortgage.termYears * 12 : 0),
        paymentFrequency: mortgage.paymentFrequency || mortgage.payment_frequency,
        startDate: mortgage.startDate || mortgage.start_date,
      },
      propertyName: properties.find(p => p.id === mortgage.propertyId)?.nickname || 'Unknown Property'
    }));

    // Add property mortgages that don't have API mortgages (fallback)
    const propertyMortgageIds = new Set(apiMortgagesList.map(m => m.propertyId));
    const propertyMortgages = properties
      .filter(property => !propertyMortgageIds.has(property.id) && property.mortgage?.lender)
      .map(property => ({
        id: `property-${property.id}`,
        propertyId: property.id,
        lenderName: property.mortgage.lender,
        originalAmount: property.mortgage.originalAmount,
        interestRate: property.mortgage.interestRate * 100, // Convert to percentage for display
        rateType: property.mortgage.rateType,
        amortizationPeriodYears: property.mortgage.amortizationYears,
        termYears: property.mortgage.termMonths / 12,
        startDate: property.mortgage.startDate,
        paymentFrequency: property.mortgage.paymentFrequency,
        mortgage: property.mortgage,
        propertyName: property.nickname,
        isFromProperty: true // Flag to indicate this needs to be migrated to API
      }));

    return [...apiMortgagesList, ...propertyMortgages];
  }, [apiMortgages, properties]);

  // Set default mortgage selection when mortgages are loaded
  useEffect(() => {
    if (mortgages.length > 0 && !selectedMortgageForDashboard) {
      setSelectedMortgageForDashboard(mortgages[0]);
    }
  }, [mortgages]);

  // Get unique property IDs for filter
  const propertyIds = [...new Set(mortgages.map(m => m.propertyId).filter(Boolean))];

  // Group mortgages by property
  const mortgagesByProperty = useMemo(() => {
    const grouped = {};
    mortgages.forEach(mortgage => {
    const propertyId = mortgage.propertyId;
      if (!grouped[propertyId]) {
        grouped[propertyId] = {
        property: properties.find(p => p.id === propertyId),
        mortgages: []
      };
    }
      grouped[propertyId].mortgages.push(mortgage);
    });
    return grouped;
  }, [mortgages, properties]);

  // Filter mortgages based on selected property
  const filteredMortgages = useMemo(() => {
    if (!filterProperty) return mortgages;
    return mortgages.filter(mortgage => mortgage.propertyId === filterProperty);
  }, [mortgages, filterProperty]);

  // Calculate current balance for a mortgage
  const getCurrentMortgageBalance = (mortgage) => {
    try {
      const schedule = calculateAmortizationSchedule(mortgage.mortgage);
      const now = new Date();
      const startDate = new Date(mortgage.startDate);
      const monthsElapsed = Math.max(0, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()));
      
      if (monthsElapsed >= schedule.length) {
        return 0; // Mortgage is paid off
      }
      
      return schedule[monthsElapsed]?.remainingBalance || mortgage.originalAmount;
    } catch (error) {
      console.error("Error calculating current balance:", error);
      return mortgage.originalAmount;
    }
  };

  // Calculate monthly payment for each mortgage
  const calculateMonthlyPayment = (mortgage) => {
    try {
      // Use the original mortgage object which has interestRate as decimal
      const mortgageObj = mortgage.mortgage || mortgage;
      const { originalAmount, interestRate, amortizationYears, paymentFrequency } = mortgageObj;
      
      // Ensure all values are numbers
      const principal = parseFloat(originalAmount);
      // interestRate is already a decimal (0.025 for 2.5%), not a percentage
      const rate = parseFloat(interestRate);
      const years = parseFloat(amortizationYears || mortgage.amortizationPeriodYears);
      
      if (principal <= 0 || years <= 0) return 0;
      if (rate === 0) return principal / (years * 12);
      
      // Rate is already a decimal, so use it directly
      const monthlyRate = rate / 12;
      const totalPayments = years * 12;
      
      // Calculate monthly payment using standard mortgage formula
      const monthlyPayment = principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
      
      return Math.round(monthlyPayment * 100) / 100;
    } catch (error) {
      console.error("Error calculating monthly payment:", error);
      return 0;
    }
  };

  // Calculate renewal date
  const calculateRenewalDate = (mortgage) => {
    try {
      const startDate = new Date(mortgage.startDate);
      const renewalDate = new Date(startDate);
      renewalDate.setFullYear(renewalDate.getFullYear() + mortgage.termYears);
      return renewalDate;
    } catch (error) {
      console.error("Error calculating renewal date:", error);
      return null;
    }
  };

  // Calculate remaining loan balance
  const calculateRemainingBalance = (mortgage) => {
    try {
      // Use the original mortgage object which has interestRate as decimal
      const mortgageObj = mortgage.mortgage || mortgage;
      const { originalAmount, interestRate, amortizationYears, startDate } = mortgageObj;
      
      // Ensure all values are numbers
      const principal = parseFloat(originalAmount);
      // interestRate is already a decimal (0.025 for 2.5%), not a percentage
      const rate = parseFloat(interestRate);
      const years = parseFloat(amortizationYears || mortgage.amortizationPeriodYears);
      
      if (principal <= 0 || years <= 0) return principal;
      if (rate === 0) return principal;
      
      // Calculate months since start
      const startDateObj = new Date(startDate || mortgage.startDate);
      const now = new Date();
      const monthsSinceStart = Math.max(0, (now.getFullYear() - startDateObj.getFullYear()) * 12 + (now.getMonth() - startDateObj.getMonth()));
      
      // Rate is already a decimal, so use it directly
      const monthlyRate = rate / 12;
      const totalPayments = years * 12;
      
      // Calculate monthly payment
      const monthlyPayment = principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
      
      // Calculate remaining balance
      const remainingBalance = principal * 
        (Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, monthsSinceStart)) / 
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
      
      return Math.round(Math.max(0, remainingBalance) * 100) / 100;
    } catch (error) {
      console.error("Error calculating remaining balance:", error);
      return mortgage.originalAmount;
    }
  };

  // Calculate total principal paid to date
  const calculateTotalPrincipalPaid = (mortgage) => {
    try {
      const originalAmount = parseFloat(mortgage.originalAmount);
      const remainingBalance = calculateRemainingBalance(mortgage);
      return Math.round((originalAmount - remainingBalance) * 100) / 100;
    } catch (error) {
      console.error("Error calculating total principal paid:", error);
      return 0;
    }
  };

  // Calculate total interest paid to date
  const calculateTotalInterestPaid = (mortgage) => {
    try {
      // Use the original mortgage object which has interestRate as decimal
      const mortgageObj = mortgage.mortgage || mortgage;
      const { originalAmount, interestRate, amortizationYears, startDate } = mortgageObj;
      
      // Ensure all values are numbers
      const principal = parseFloat(originalAmount);
      // interestRate is already a decimal (0.025 for 2.5%), not a percentage
      const rate = parseFloat(interestRate);
      const years = parseFloat(amortizationYears || mortgage.amortizationPeriodYears);
      
      if (principal <= 0 || years <= 0) return 0;
      if (rate === 0) return 0;
      
      // Calculate months since start
      const startDateObj = new Date(startDate || mortgage.startDate);
      const now = new Date();
      const monthsSinceStart = Math.max(0, (now.getFullYear() - startDateObj.getFullYear()) * 12 + (now.getMonth() - startDateObj.getMonth()));
      
      // Rate is already a decimal, so use it directly
      const monthlyRate = rate / 12;
      const totalPayments = years * 12;
      
      // Calculate monthly payment
      const monthlyPayment = principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
      
      // Calculate total payments made
      const totalPaymentsMade = monthlyPayment * monthsSinceStart;
      
      // Calculate total principal paid
      const totalPrincipalPaid = calculateTotalPrincipalPaid(mortgage);
      
      // Total interest paid = total payments made - total principal paid
      return Math.round((totalPaymentsMade - totalPrincipalPaid) * 100) / 100;
    } catch (error) {
      console.error("Error calculating total interest paid:", error);
      return 0;
    }
  };

  // Add current balance and calculated payment to mortgages
  const mortgagesWithBalance = mortgages.map(mortgage => ({
    ...mortgage,
    currentBalance: getCurrentMortgageBalance(mortgage),
    monthlyPayment: calculateMonthlyPayment(mortgage)
  }));

  // Portfolio analytics
  const portfolioAnalytics = useMemo(() => {
    const totalOriginalAmount = mortgagesWithBalance.reduce((sum, m) => sum + m.originalAmount, 0);
    const totalCurrentBalance = mortgagesWithBalance.reduce((sum, m) => sum + m.currentBalance, 0);
    const totalMonthlyPayments = mortgagesWithBalance.reduce((sum, m) => sum + m.monthlyPayment, 0);
    const averageInterestRate = mortgagesWithBalance.length > 0 
      ? mortgagesWithBalance.reduce((sum, m) => sum + m.interestRate, 0) / mortgagesWithBalance.length 
      : 0;
    
    const rateTypeDistribution = mortgagesWithBalance.reduce((acc, m) => {
      acc[m.rateType] = (acc[m.rateType] || 0) + 1;
      return acc;
    }, {});
    
    const termDistribution = mortgagesWithBalance.reduce((acc, m) => {
      acc[m.termYears] = (acc[m.termYears] || 0) + 1;
    return acc;
  }, {});

    const amortizationDistribution = mortgagesWithBalance.reduce((acc, m) => {
      acc[m.amortizationPeriodYears] = (acc[m.amortizationPeriodYears] || 0) + 1;
      return acc;
    }, {});

    return {
      totalOriginalAmount,
      totalCurrentBalance,
      totalMonthlyPayments,
      averageInterestRate,
      rateTypeDistribution,
      termDistribution,
      amortizationDistribution
    };
  }, [mortgagesWithBalance]);

  // Comparison data
  const comparisonData = useMemo(() => {
    if (selectedMortgagesForComparison.length < 2) return null;
    
    return selectedMortgagesForComparison.map(mortgageId => {
      const mortgage = mortgagesWithBalance.find(m => m.id === mortgageId);
      if (!mortgage) return null;
      
      try {
        const schedule = calculateAmortizationSchedule(mortgage.mortgage);
        const totalInterest = schedule.payments.reduce((sum, payment) => sum + payment.interest, 0);
        
        return {
          ...mortgage,
          totalInterest,
          totalCost: mortgage.originalAmount + totalInterest,
          payoffDate: schedule.payments[schedule.payments.length - 1]?.paymentDate
        };
      } catch (error) {
        console.error("Error calculating comparison data for mortgage:", mortgage.lenderName, error);
        return null;
      }
    }).filter(Boolean);
  }, [selectedMortgagesForComparison, mortgagesWithBalance]);

  // Dashboard data for selected mortgage
  const dashboardData = useMemo(() => {
    if (!selectedMortgageForDashboard) return null;
    
    const mortgage = mortgagesWithBalance.find(m => m.id === selectedMortgageForDashboard.id);
    if (!mortgage) return null;
    
    try {
      const schedule = calculateAmortizationSchedule(mortgage.mortgage);
      const totalInterest = schedule.payments.reduce((sum, payment) => sum + payment.interest, 0);
      const totalCost = mortgage.originalAmount + totalInterest;

      return {
        mortgage,
        schedule: schedule.payments,
        totalInterest,
        totalCost,
        remainingPayments: schedule.payments.length,
        payoffDate: schedule.payments[schedule.payments.length - 1]?.paymentDate
      };
    } catch (error) {
      console.error("Error calculating dashboard data:", error);
      return null;
    }
  }, [selectedMortgageForDashboard, mortgagesWithBalance]);


  const handleSelectForDashboard = (mortgage) => {
    setSelectedMortgageForDashboard(mortgage);
  };

  const toggleMortgageExpansion = (mortgageId) => {
    setExpandedMortgages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mortgageId)) {
        newSet.delete(mortgageId);
      } else {
        newSet.add(mortgageId);
      }
      return newSet;
    });
  };

  const handleDownloadSchedule = (mortgageId) => {
    const mortgage = mortgagesWithBalance.find(m => m.id === mortgageId);
    if (!mortgage) return;
    
    const schedule = calculateAmortizationSchedule(mortgage.mortgage);
    const csvContent = [
      ['Payment #', 'Date', 'Principal', 'Interest', 'Total Payment', 'Remaining Balance'],
      ...schedule.map(payment => [
        payment.paymentNumber,
        new Date(payment.paymentDate).toLocaleDateString(),
        payment.principal.toFixed(2),
        payment.interest.toFixed(2),
        payment.monthlyPayment.toFixed(2),
        payment.remainingBalance.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mortgage-schedule-${mortgage.lenderName}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleComparisonToggle = (mortgageId) => {
    setSelectedMortgagesForComparison(prev => {
      if (prev.includes(mortgageId)) {
        return prev.filter(id => id !== mortgageId);
      } else {
        return [...prev, mortgageId];
      }
    });
  };

  // Handle loading and error states after all hooks are called
  if (apiLoading) {
    return (
        <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading mortgages...</p>
          </div>
        </div>
        </Layout>
    );
  }

  if (error) {
    return (
        <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <AlertTriangle className="w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Mortgages</h2>
            <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
          </div>
        </div>
        </Layout>
    );
  }

  return (
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <ListPageHeader
            title="Mortgages"
            description="Manage and analyze your mortgage portfolio"
            actionLabel="Add Mortgage"
            onAction={() => setShowForm(true)}
            actionIcon={Plus}
          />

        {/* View Mode Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base ${
                viewMode === 'card'
                  ? 'bg-[#205A3E] text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base ${
                viewMode === 'analytics'
                  ? 'bg-[#205A3E] text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Charts</span>
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base ${
                viewMode === 'comparison'
                  ? 'bg-[#205A3E] text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Comparison</span>
              <span className="sm:hidden">Compare</span>
            </button>
          </div>
        </div>

        {/* Dashboard */}
        {viewMode === 'card' && (
          <div className="space-y-6">
            {mortgagesWithBalance.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Mortgages Found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Get started by adding your first mortgage.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-[#205A3E] text-white rounded-lg hover:bg-[#1a4a32] transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add Mortgage
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(mortgagesByProperty).map(([propertyId, { property, mortgages: propertyMortgages }]) => (
                  <div key={propertyId} className="space-y-4">
                    {propertyMortgages.map((mortgage) => (
                      <div key={mortgage.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <MortgageCardView 
                          mortgage={mortgage} 
                          onEdit={(mortgage) => {
                            setEditingMortgage(mortgage);
                            setShowForm(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics View */}
        {viewMode === 'analytics' && (
          <div className="space-y-6">
            {/* Portfolio Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Original Amount</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(portfolioAnalytics.totalOriginalAmount)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-[#205A3E]" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Current Balance</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(portfolioAnalytics.totalCurrentBalance)}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Payments</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(portfolioAnalytics.totalMonthlyPayments)}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Average Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {portfolioAnalytics.averageInterestRate.toFixed(2)}%
                    </p>
                  </div>
                  <Percent className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rate Type Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(portfolioAnalytics.rateTypeDistribution).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{type}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Term Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(portfolioAnalytics.termDistribution).map(([term, count]) => (
                    <div key={term} className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{term} years</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Amortization Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(portfolioAnalytics.amortizationDistribution).map(([amort, count]) => (
                    <div key={amort} className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{amort} years</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison View */}
        {viewMode === 'comparison' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Mortgages to Compare</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mortgagesWithBalance.map(mortgage => (
                  <label key={mortgage.id} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMortgagesForComparison.includes(mortgage.id)}
                      onChange={() => handleComparisonToggle(mortgage.id)}
                      className="w-4 h-4 text-[#205A3E] border-gray-300 rounded focus:ring-[#205A3E]"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{mortgage.lenderName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(mortgage.originalAmount)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {comparisonData && comparisonData.length >= 2 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mortgage Comparison</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">Lender</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">Original Amount</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">Interest Rate</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">Monthly Payment</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">Total Interest</th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                      {comparisonData.map((mortgage, index) => (
                        <tr key={mortgage.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                            {mortgage.lenderName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                            {formatCurrency(mortgage.originalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                            {mortgage.interestRate}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                            {formatCurrency(mortgage.monthlyPayment)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                            {formatCurrency(mortgage.totalInterest)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                            {formatCurrency(mortgage.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showForm && (
          <MortgageFormUpgraded
            mortgage={editingMortgage}
            onClose={() => {
              setShowForm(false);
              setEditingMortgage(null);
              // Refetch mortgages after closing form to get updated data
              if (refetchMortgages) {
                refetchMortgages();
              }
            }}
          />
        )}

        {viewingMortgage && (
          <MortgageDetails
            mortgage={viewingMortgage}
            onClose={() => setViewingMortgage(null)}
            onEdit={(mortgage) => {
              setEditingMortgage(mortgage);
              setViewingMortgage(null);
              setShowForm(true);
            }}
          />
        )}

        {showAmortization && selectedMortgage && (
          <AmortizationSchedule
            mortgage={selectedMortgage}
            onClose={() => {
              setShowAmortization(false);
              setSelectedMortgage(null);
            }}
          />
        )}
      </div>
      </Layout>
  );
}