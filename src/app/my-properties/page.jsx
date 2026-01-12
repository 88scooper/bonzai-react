"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import Button from "@/components/Button";
import AddPropertyModal from "@/components/AddPropertyModal";
import { useProperties, usePropertyContext } from "@/context/PropertyContext";
import { formatCurrency, formatPercentage } from "@/utils/formatting";
import { Building2, PiggyBank, FileSpreadsheet, Plus } from "lucide-react";
import { getCurrentMortgageBalance, getMonthlyMortgagePayment, getMonthlyMortgageInterest, getMonthlyMortgagePrincipal } from "@/utils/mortgageCalculator";
import { calculateIRR as calculateIRRProper } from "@/utils/financialCalculations";

// Calculate YoY change percentage
function calculateYoYChange(currentValue, previousValue) {
  if (!previousValue || previousValue === 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
}

// Get revenue for a specific period with proper tenant transition handling
function getRevenueForPeriod(property, year, startMonth = 1, endMonth = 12) {
  if (!property.tenants || property.tenants.length === 0) return 0;
  
  const targetYear = parseInt(year);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Create period start and end dates
  const periodStart = new Date(targetYear, startMonth - 1, 1);
  const periodEnd = new Date(targetYear, endMonth, 0); // Last day of endMonth
  
  // For current year, limit to current month if period extends beyond
  if (targetYear === currentYear && endMonth > currentMonth) {
    const adjustedEndMonth = Math.min(endMonth, currentMonth);
    const adjustedPeriodEnd = new Date(targetYear, adjustedEndMonth, 0);
    periodEnd.setTime(adjustedPeriodEnd.getTime());
  }
  
  let totalRevenue = 0;
  
  // Process each tenant to calculate revenue for the period
  property.tenants.forEach(tenant => {
    const leaseStart = new Date(tenant.leaseStart);
    const leaseEnd = tenant.leaseEnd === 'Active' 
      ? new Date(currentYear, currentMonth - 1, new Date().getDate())
      : new Date(tenant.leaseEnd);
    
    // Check if tenant was active during any part of the period
    if (leaseStart <= periodEnd && leaseEnd >= periodStart) {
      // Calculate the overlap between tenant lease and the period
      const overlapStart = new Date(Math.max(leaseStart.getTime(), periodStart.getTime()));
      const overlapEnd = new Date(Math.min(leaseEnd.getTime(), periodEnd.getTime()));
      
      // Calculate days in overlap
      const daysInOverlap = Math.max(0, Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1);
      
      // Calculate days in the month for proration
      const overlapStartMonth = overlapStart.getMonth();
      const overlapEndMonth = overlapEnd.getMonth();
      
      let monthlyRevenue = 0;
      
      // Handle same month
      if (overlapStartMonth === overlapEndMonth) {
        const daysInMonth = new Date(overlapStart.getFullYear(), overlapStart.getMonth() + 1, 0).getDate();
        const prorationFactor = daysInOverlap / daysInMonth;
        monthlyRevenue = tenant.rent * prorationFactor;
      } else {
        // Handle multiple months
        for (let month = overlapStartMonth; month <= overlapEndMonth; month++) {
          const monthStart = new Date(overlapStart.getFullYear(), month, 1);
          const monthEnd = new Date(overlapStart.getFullYear(), month + 1, 0);
          
          const monthOverlapStart = new Date(Math.max(overlapStart.getTime(), monthStart.getTime()));
          const monthOverlapEnd = new Date(Math.min(overlapEnd.getTime(), monthEnd.getTime()));
          
          const daysInMonth = monthEnd.getDate();
          const daysInOverlap = Math.max(0, Math.ceil((monthOverlapEnd - monthOverlapStart) / (1000 * 60 * 60 * 24)) + 1);
          const prorationFactor = daysInOverlap / daysInMonth;
          
          monthlyRevenue += tenant.rent * prorationFactor;
        }
      }
      
      totalRevenue += monthlyRevenue;
    }
  });
  
  return totalRevenue;
}

// Get expenses for a specific period with prorated annual expenses
function getExpensesForPeriod(property, year, startMonth = 1, endMonth = 12) {
  if (!property.expenseHistory) return 0;
  
  const targetYear = parseInt(year);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // For current year, limit to current month if period extends beyond
  const actualEndMonth = targetYear === currentYear ? Math.min(endMonth, currentMonth) : endMonth;
  
  let totalExpenses = 0;
  
  // Process each expense
  property.expenseHistory.forEach(expense => {
    const expenseDate = new Date(expense.date);
    const expenseYear = expenseDate.getFullYear();
    const expenseMonth = expenseDate.getMonth() + 1;
    
    // Only process expenses from the target year
    if (expenseYear !== targetYear) return;
    
    // Determine if this is an annual expense that should be prorated
    const isAnnualExpense = expense.category === 'Property Tax' || 
                           expense.category === 'Insurance' ||
                           expense.amount > 1000; // Large expenses likely annual
    
    if (isAnnualExpense) {
      // Prorate annual expenses across the entire year
      const monthsInYear = 12;
      const proratedAmount = (expense.amount / monthsInYear) * (actualEndMonth - startMonth + 1);
      totalExpenses += proratedAmount;
    } else {
      // For monthly/one-time expenses, only include if they fall within the period
      if (expenseMonth >= startMonth && expenseMonth <= actualEndMonth) {
        totalExpenses += expense.amount;
      }
    }
  });
  
  return totalExpenses;
}

// Calculate YoY changes with proper period-over-period comparison and data completeness warnings
function calculateYoYChanges(property) {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  // Compare Jan through current month for both years
  const startMonth = 1;
  const endMonth = currentMonth;
  
  // Get current year data (Jan through current month)
  const currentRevenue = getRevenueForPeriod(property, currentYear.toString(), startMonth, endMonth);
  const currentExpenses = getExpensesForPeriod(property, currentYear.toString(), startMonth, endMonth);
  
  // Get previous year data (Jan through same month)
  const previousRevenue = getRevenueForPeriod(property, previousYear.toString(), startMonth, endMonth);
  const previousExpenses = getExpensesForPeriod(property, previousYear.toString(), startMonth, endMonth);
  
  // Calculate YoY changes
  const yoyRevenueChange = calculateYoYChange(currentRevenue, previousRevenue);
  const yoyExpenseChange = calculateYoYChange(currentExpenses, previousExpenses);
  
  // Create comparison period description
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const comparisonPeriod = startMonth === endMonth 
    ? monthNames[startMonth - 1] 
    : `${monthNames[startMonth - 1]}-${monthNames[endMonth - 1]}`;
  
  // Determine if current year data is incomplete
  const isIncompleteData = currentMonth < 12;
  const dataCompletenessWarning = isIncompleteData 
    ? `Based on ${comparisonPeriod} data only` 
    : 'Full year comparison';
  
  // Check if we have sufficient data for meaningful comparison
  const hasData = previousRevenue > 0 && previousExpenses > 0 && currentRevenue > 0 && currentExpenses > 0;
  
  return {
    yoyRevenueChange,
    yoyExpenseChange,
    currentRevenue,
    currentExpenses,
    previousRevenue,
    previousExpenses,
    comparisonPeriod,
    isIncompleteData,
    dataCompletenessWarning,
    hasData
  };
}

export default function MyPropertiesPage() {
  const { calculationsComplete } = usePropertyContext();
  const properties = useProperties();
  const [forceShow, setForceShow] = useState(false);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  
  // Debug logging
  console.log('MyPropertiesPage - calculationsComplete:', calculationsComplete);
  console.log('MyPropertiesPage - properties:', properties);
  console.log('MyPropertiesPage - properties length:', properties?.length);
  
  // Timeout fallback - force show content after 1.5 seconds to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setForceShow(true);
    }, 1500);
    return () => clearTimeout(timeout);
  }, []);
  
  // Show content if calculations are complete OR if we have properties OR if timeout elapsed
  const shouldShowContent = calculationsComplete || forceShow || (properties && Array.isArray(properties) && properties.length > 0);
  
  // Show loading state only briefly, then show content anyway
  if (!shouldShowContent) {
    return (
      <RequireAuth>
        <Layout>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">My Investment Properties</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Overview of your real estate investment performance and key metrics for {new Date().getFullYear()}. Values shown combine actual data from January 1 to today plus forecast for the remainder of the year.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E]"></div>
              <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Loading property data...</span>
            </div>
          </div>
        </Layout>
      </RequireAuth>
    );
  }
  
  return (
    <RequireAuth>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">My Investment Properties</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Overview of your real estate investment performance and key metrics for {new Date().getFullYear()}.
              </p>
            </div>
            <button
              onClick={() => setIsAddPropertyModalOpen(true)}
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-[#205A3E] hover:bg-[#1a4730] dark:bg-[#2F7E57] dark:hover:bg-[#205A3E] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-100"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Property</span>
              <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          </div>

          {/* Debug info */}
          <div className="text-xs text-gray-500 mb-2">
            Properties: {properties ? properties.length : 'null'} | 
            Calculations Complete: {calculationsComplete ? 'Yes' : 'No'}
          </div>

          {properties && Array.isArray(properties) && properties.length > 0 ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-1">
              {properties.map((property, index) => {
                if (!property || !property.id) {
                  console.warn(`Property at index ${index} is missing or has no id:`, property);
                  return (
                    <div key={`missing-${index}`} className="p-4 border border-yellow-300 rounded-lg bg-yellow-50">
                      <p className="text-yellow-600">Property at index {index} is missing data</p>
                    </div>
                  );
                }
                try {
                  return <PropertyCard key={property.id} property={property} />;
                } catch (error) {
                  console.error(`Error rendering property card for ${property.id}:`, error);
                  return (
                    <div key={property.id} className="p-4 border border-red-300 rounded-lg bg-red-50">
                      <p className="text-red-600">Error rendering property: {property.nickname || property.name || property.id}</p>
                      <p className="text-xs text-red-500 mt-1">{error.message}</p>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                {properties === undefined || properties === null 
                  ? 'Loading properties...' 
                  : 'No properties yet. Add your first investment property to get started.'}
              </div>
              {properties && Array.isArray(properties) && properties.length === 0 && (
                <button
                  onClick={() => setIsAddPropertyModalOpen(true)}
                  className="group relative inline-flex items-center gap-2 px-6 py-3 bg-[#205A3E] hover:bg-[#1a4730] dark:bg-[#2F7E57] dark:hover:bg-[#205A3E] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-100"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Your First Property</span>
                  <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              )}
            </div>
          )}
        </div>
        <AddPropertyModal 
          isOpen={isAddPropertyModalOpen} 
          onClose={() => setIsAddPropertyModalOpen(false)} 
        />
      </Layout>
    </RequireAuth>
  );
}

function PropertyCard({ property }) {
  const [irrYears, setIrrYears] = useState(5); // Default to 5 years
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hoveredMetric, setHoveredMetric] = useState(null); // Track which metric is being hovered
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Helper function to get property image URL with fallback
  const getPropertyImageUrl = () => {
    // First, try the imageUrl from property data
    if (property.imageUrl) {
      return property.imageUrl;
    }
    
    // Try to construct from address (e.g., "500-415 Wilson Avenue" -> "500 Wilson Ave.png")
    if (property.address) {
      // Match pattern like "500-415 Wilson Avenue" -> extract "500" and "Wilson Avenue"
      // For addresses with ranges like "500-415", take the first number
      const addressMatch = property.address.match(/^(\d+)(?:[-\s]*\d*)?\s+(.+?)(?:,|$)/);
      if (addressMatch) {
        const firstNumber = addressMatch[1]; // "500"
        const street = addressMatch[2].trim(); // "Wilson Avenue"
        
        // Convert full words to abbreviations
        let streetAbbr = street
          .replace(/\bAvenue\b/gi, 'Ave')
          .replace(/\bStreet\b/gi, 'St')
          .replace(/\bDrive\b/gi, 'Dr')
          .replace(/\bWay\b/gi, 'Way')
          .replace(/\bBoulevard\b/gi, 'Blvd')
          .replace(/\bRoad\b/gi, 'Rd');
        
        // Convert direction words to abbreviations (East -> E, West -> W, etc.)
        streetAbbr = streetAbbr
          .replace(/\bEast\b/gi, 'E')
          .replace(/\bWest\b/gi, 'W')
          .replace(/\bNorth\b/gi, 'N')
          .replace(/\bSouth\b/gi, 'S');
        
        // Construct: "500 Wilson Ave"
        const imageName = `${firstNumber} ${streetAbbr}`.trim();
        return `/images/${imageName}.png`;
      }
    }
    
    // Fallback: try nickname directly
    if (property.nickname || property.name) {
      const nickname = property.nickname || property.name;
      return `/images/${nickname}.png`;
    }
    
    return null;
  };
  
  const imageUrl = getPropertyImageUrl();
  
  // Mark as hydrated after mount to avoid hydration mismatches
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Safety check
  if (!property) {
    console.warn('PropertyCard: property is null or undefined');
    return (
      <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
        <p className="text-gray-500">Property data is missing</p>
      </div>
    );
  }
  
  // Error boundary for rendering
  if (hasError) {
    return (
      <div className="p-4 border border-red-300 rounded-lg bg-red-50">
        <p className="text-red-600 font-semibold">Error rendering property</p>
        <p className="text-sm text-red-500 mt-1">{property.nickname || property.name || property.id}</p>
        {errorMessage && <p className="text-xs text-red-400 mt-1">{errorMessage}</p>}
      </div>
    );
  }
  
  try {
    // Calculate property-level values
    const currentValue = property.currentMarketValue || property.currentValue || 0;
  const monthlyCashFlow = property.monthlyCashFlow || 0;
  const annualCashFlow = property.annualCashFlow || (monthlyCashFlow * 12);
  const capRate = property.capRate || 0;
  
  // Calculate mortgage debt (property-level)
  let mortgageDebt = 0;
  if (property.mortgage) {
    try {
      // Check if mortgage has required fields
      if (property.mortgage.originalAmount && property.mortgage.interestRate !== undefined && property.mortgage.amortizationYears) {
        mortgageDebt = getCurrentMortgageBalance(property.mortgage);
        // Ensure it's a valid number
        if (isNaN(mortgageDebt) || !isFinite(mortgageDebt)) {
          mortgageDebt = property.mortgage.originalAmount || 0;
        }
      } else {
        mortgageDebt = property.mortgage.originalAmount || 0;
      }
    } catch (error) {
      console.warn('Error calculating mortgage balance:', error);
      mortgageDebt = property.mortgage.originalAmount || 0;
    }
  }
  
  // Calculate equity (property-level)
  const equity = Math.max(0, currentValue - mortgageDebt);
  const equityPercentage = currentValue > 0 ? (equity / currentValue) * 100 : 0;
  const debtPercentage = currentValue > 0 ? (mortgageDebt / currentValue) * 100 : 0;
  
  // Calculate forecasted equity earned this year - use state to avoid hydration mismatch
  const [forecastedEquityEarned, setForecastedEquityEarned] = useState(0);
  const [appreciationPercentage, setAppreciationPercentage] = useState(0);
  const [appreciation, setAppreciation] = useState(0);
  const [annualPrincipal, setAnnualPrincipal] = useState(0);
  
  useEffect(() => {
    if (!isHydrated) return;
    
    const monthlyPrincipal = property.monthlyExpenses?.mortgagePrincipal || 0;
    const calculatedAnnualPrincipal = monthlyPrincipal * 12;
    setAnnualPrincipal(calculatedAnnualPrincipal);
    // Simplified: assume current value appreciation based on purchase price
    const purchasePrice = property.purchasePrice || 0;
    const calculatedAppreciation = currentValue > purchasePrice ? currentValue - purchasePrice : 0;
    setAppreciation(calculatedAppreciation);
    
    // Calculate appreciation percentage
    const calculatedAppreciationPercentage = purchasePrice > 0 && currentValue > purchasePrice
      ? Math.floor(((currentValue - purchasePrice) / purchasePrice) * 100)
      : 0;
    setAppreciationPercentage(calculatedAppreciationPercentage);
    
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
    const annualAppreciation = yearsHeld > 0 ? calculatedAppreciation / yearsHeld : 0;
    setForecastedEquityEarned(calculatedAnnualPrincipal + annualAppreciation);
  }, [isHydrated, property.monthlyExpenses?.mortgagePrincipal, property.purchasePrice, property.purchaseDate, currentValue]);
  
  // Calculate LTV (property-level)
  const ltv = currentValue > 0 ? (mortgageDebt / currentValue) * 100 : 0;
  
  // Calculate Income & Expenses (property-level)
  const annualRevenue = ((property.rent && property.rent.monthlyRent) ? property.rent.monthlyRent : 0) * 12;
  
  // Calculate debt service directly from mortgage data
  let monthlyPrincipalPayment = 0;
  let monthlyInterestPayment = 0;
  let monthlyDebtService = 0;
  
  if (property.mortgage) {
    try {
      // Check if mortgage has required fields
      if (property.mortgage.originalAmount && property.mortgage.interestRate !== undefined && property.mortgage.amortizationYears) {
        // Calculate monthly principal and interest payments
        monthlyPrincipalPayment = getMonthlyMortgagePrincipal(property.mortgage);
        monthlyInterestPayment = getMonthlyMortgageInterest(property.mortgage);
        
        // Ensure they're valid numbers
        if (isNaN(monthlyPrincipalPayment) || !isFinite(monthlyPrincipalPayment)) {
          monthlyPrincipalPayment = 0;
        }
        if (isNaN(monthlyInterestPayment) || !isFinite(monthlyInterestPayment)) {
          monthlyInterestPayment = 0;
        }
      } else {
        // Fallback: try to use monthlyExpenses if available
        monthlyPrincipalPayment = property.monthlyExpenses?.mortgagePrincipal || 0;
        monthlyInterestPayment = property.monthlyExpenses?.mortgageInterest || 0;
      }
    } catch (error) {
      console.warn('Error calculating mortgage payments:', error);
      // Fallback: try to use monthlyExpenses if available
      monthlyPrincipalPayment = property.monthlyExpenses?.mortgagePrincipal || 0;
      monthlyInterestPayment = property.monthlyExpenses?.mortgageInterest || 0;
    }
  } else {
    // No mortgage, try to use monthlyExpenses if available
    monthlyPrincipalPayment = property.monthlyExpenses?.mortgagePrincipal || 0;
    monthlyInterestPayment = property.monthlyExpenses?.mortgageInterest || 0;
  }
  
  monthlyDebtService = monthlyPrincipalPayment + monthlyInterestPayment;
  const annualDebtService = monthlyDebtService * 12;
  
  // Operating expenses = total expenses - debt service
  const monthlyTotalExpenses = property.monthlyExpenses?.total || 0;
  const monthlyOperatingExpenses = monthlyTotalExpenses - monthlyDebtService;
  const annualOperatingExpenses = monthlyOperatingExpenses * 12;
  const totalAnnualExpenses = annualOperatingExpenses + annualDebtService;
  
  // Net Cash Flow
  const netCashFlow = annualRevenue - totalAnnualExpenses;
  
  // Margin = (Net Cash Flow / Total Revenue) - as decimal for percentFormatter
  const margin = annualRevenue > 0 ? netCashFlow / annualRevenue : 0;
  
  // Revenue consumed = (Total Expenses / Total Revenue) × 100
  const revenueConsumed = annualRevenue > 0 ? (totalAnnualExpenses / annualRevenue) * 100 : 0;
  
  // Operating expenses and debt service percentages
  const operatingExpensesPercent = annualRevenue > 0 ? (annualOperatingExpenses / annualRevenue) * 100 : 0;
  const debtServicePercent = annualRevenue > 0 ? (annualDebtService / annualRevenue) * 100 : 0;
  
  // Performance Metrics Calculations
  const downPayment = property.purchasePrice - (property.mortgage?.originalAmount || 0);
  const closingCosts = property.closingCosts || 0;
  const initialRenovations = property.initialRenovations || 0;
  const totalInitialCashInvested = downPayment + closingCosts + initialRenovations;
  
  // Cash on Cash Return
  const cashOnCashReturn = totalInitialCashInvested > 0 ? (annualCashFlow / totalInitialCashInvested) * 100 : 0;
  
  // DSCR = NOI / Annual Debt Service
  const noi = annualRevenue - annualOperatingExpenses;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  
  // IRR Calculation using proper NPV-based method with Newton-Raphson
  // This accounts for: time value of money, mortgage paydown, selling costs, and proper discounting
  const calculatePropertyIRR = (years) => {
    if (years <= 0 || totalInitialCashInvested <= 0) return 0;
    
    // Create a property object with totalInvestment for the utility function
    // The utility function expects property.totalInvestment to exist
    const propertyForIRR = {
      ...property,
      totalInvestment: totalInitialCashInvested,
      // Ensure currentMarketValue is set (used for appreciation calculation)
      currentMarketValue: currentValue,
      currentValue: currentValue,
      // Ensure mortgage data is available
      mortgage: property.mortgage || null,
      // Ensure rent data is available for cash flow calculation
      rent: property.rent || { monthlyRent: 0 },
      // Ensure monthlyExpenses are available
      monthlyExpenses: property.monthlyExpenses || {}
    };
    
    try {
      // Use the proper Newton-Raphson IRR calculation from financialCalculations.js
      // This properly discounts cash flows and accounts for mortgage paydown and selling costs
      const irrPercentage = calculateIRRProper(propertyForIRR, years);
      
      // Convert from percentage to decimal for internal calculations and status checks
      // The function returns a percentage (e.g., 12.5 for 12.5%), but we store as decimal (0.125)
      // Status checks use decimal format (e.g., irr >= 0.12 for 12%)
      return irrPercentage / 100;
    } catch (error) {
      console.error('Error calculating IRR:', error);
      return 0; // Return 0 on error rather than showing incorrect data
    }
  };
  
  const irr = calculatePropertyIRR(irrYears);
  
  // Format purchase date
  const formatPurchaseDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch (error) {
      return 'N/A';
    }
  };
  
  // Format currency without decimals for main values
  const formatCurrencyRounded = (value) => {
    const numValue = Number(value) || 0;
    if (isNaN(numValue) || !isFinite(numValue)) return '$0';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.floor(Math.abs(numValue)));
  };
  
  return (
    <Link 
      href={`/my-properties/${property.id}`}
      prefetch={false}
      className="group block rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-white dark:bg-neutral-900 hover:shadow-lg transition-all"
    >
      <div className="p-2.5 md:p-3 lg:p-4">
        {/* Two-Column Layout: Left = Property Details, Right = All Financial Sections */}
        {/* Optimized proportions: 30% left, 70% right - prioritizing financial data */}
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_2.1fr] xl:grid-cols-[1fr_2.2fr] gap-2.5 md:gap-3 lg:gap-4">
          {/* Left Column: Property Details - Compact */}
          <div className="space-y-2">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#205A3E] dark:group-hover:text-[#4ade80] transition-colors mb-0.5">
                {property.nickname || property.name}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1.5">
                {property.address}
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs md:text-sm">
                <div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">Purchase Price</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{formatCurrency(property.purchasePrice)}</div>
                </div>
                <div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">Units</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{property.units || 1}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">Purchase Date</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{formatPurchaseDate(property.purchaseDate)}</div>
                </div>
              </div>
            </div>
            
            {/* Property Image - Compact */}
            <div className="rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-neutral-800">
              {imageUrl ? (
                <Image 
                  src={`${imageUrl}?v=3`}
                  alt={property.nickname || property.name || 'Property image'}
                  width={600}
                  height={160}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                  onError={(e) => {
                    // If image fails to load, hide it and show placeholder
                    e.target.style.display = 'none';
                    const placeholder = e.target.parentElement.querySelector('.image-placeholder');
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`image-placeholder w-full h-20 md:h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-neutral-800 dark:to-neutral-700 ${imageUrl ? 'hidden' : 'flex'} items-center justify-center`}>
                <span className="text-gray-400 dark:text-gray-500 text-xs">
                  {(property.nickname || property.name || 'Property').charAt(0)}
                </span>
              </div>
            </div>
            
            {/* Tooltip Display Area - Shows in empty space under thumbnail */}
            <div className="mt-2 min-h-[60px] transition-all duration-200 ease-in-out">
              {hoveredMetric ? (
                <div className="rounded-lg border border-[#205A3E]/40 dark:border-[#66B894]/40 bg-gradient-to-br from-[#205A3E] to-[#1C4F39] dark:from-[#1D3A2C] dark:to-[#0F1F17] p-2.5 text-white text-xs leading-relaxed shadow-lg opacity-100 transition-opacity duration-200">
                  <div className="font-semibold mb-1.5 text-[#66B894] dark:text-[#4ade80] text-[11px] uppercase tracking-wide">
                    {hoveredMetric.title}
                  </div>
                  <div className="text-white/95 dark:text-gray-200 leading-snug">
                    {hoveredMetric.text}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-2 opacity-60 transition-opacity duration-200">
                  Hover over a metric for details
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column: All Financial Sections - Prioritized */}
          <div className="space-y-2.5 md:space-y-3">
            {/* Top: Three Financial Overview Cards - Side by Side, Compact */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Estimated Property Value */}
              <FinancialOverviewCard
                title="Estimated Property Value"
                value={formatCurrencyRounded(currentValue)}
                supporting={
                  <>
                    <div>
                      {formatCurrencyRounded(equity)} equity ({Math.floor(equityPercentage)}%) • {formatCurrencyRounded(mortgageDebt)} debt ({Math.floor(debtPercentage)}%)
                    </div>
                    <div className="mt-1 text-[9px] md:text-[10px] opacity-90">
                      Portfolio LTV: {Math.floor(ltv)}%
                    </div>
                    <div className="mt-1 text-[9px] md:text-[10px] opacity-90">
                      Estimated Appreciation: {formatCurrencyRounded(appreciation)} ({appreciationPercentage}%)
                    </div>
                  </>
                }
                icon={Building2}
                accent="emerald"
                tooltipText={`The current estimated market value of this property. Estimated Appreciation shows the increase in value since purchase (${formatCurrencyRounded(appreciation)}), representing ${appreciationPercentage}% growth from the original purchase price.`}
              />
              
              {/* Estimated Equity */}
              <FinancialOverviewCard
                title="Estimated Equity"
                value={formatCurrencyRounded(equity)}
                supporting={
                  <>
                    <div>
                      Current total equity: {formatCurrencyRounded(equity)}
                    </div>
                    <div className="mt-1">
                      Forecasted equity earned this year: {formatCurrencyRounded(forecastedEquityEarned)}
                    </div>
                    <div className="mt-1 text-[9px] md:text-[10px] opacity-90">
                      Includes principal payments + estimated appreciation
                    </div>
                  </>
                }
                icon={PiggyBank}
                accent="teal"
                tooltipText={`Your current equity in this property. Forecasted equity earned this year includes principal payments (${formatCurrencyRounded(annualPrincipal)}) and estimated appreciation.`}
              />
              
              {/* Mortgage Debt */}
              <FinancialOverviewCard
                title="Mortgage Debt"
                value={formatCurrencyRounded(mortgageDebt)}
                supporting={
                  <>
                    <div>
                      Monthly debt service: {formatCurrencyRounded(monthlyDebtService)}
                    </div>
                    <div className="mt-1 text-[9px] md:text-[10px] opacity-90">
                      Principal + interest payments
                    </div>
                  </>
                }
                icon={FileSpreadsheet}
                accent="amber"
                tooltipText={`The remaining mortgage balance on this property. LTV (Loan-to-Value) ratio shows what percentage of the property's value is financed through debt.`}
              />
            </div>

            {/* Middle: Income & Expenses */}
            <IncomeExpensesSection
              totalRevenue={annualRevenue}
              operatingExpenses={annualOperatingExpenses}
              debtService={annualDebtService}
              netCashFlow={netCashFlow}
              margin={margin}
              revenueConsumed={revenueConsumed}
              operatingExpensesPercent={operatingExpensesPercent}
              debtServicePercent={debtServicePercent}
            />

            {/* Bottom: Performance Metrics - Full Width, Compact Grid */}
            <div className="pt-1.5 md:pt-2 border-t border-black/10 dark:border-white/10">
              <div className="mb-1 md:mb-1.5">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Performance Metrics</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-1.5">
            <KeyMetricCard
              title="CAP RATE"
              value={formatPercentage(capRate)}
              tooltipText="The capitalization rate measures the property's return based on its income relative to its value. A strong cap rate for Toronto area rentals is typically 5-7%."
              statusTone={capRate >= 5 ? 'positive' : capRate >= 3.5 ? 'neutral' : 'warning'}
              statusMessage={capRate >= 5 ? 'STRONG' : capRate >= 3.5 ? 'MODERATE' : 'LOW'}
              onHover={(isHovered) => setHoveredMetric(isHovered ? { title: 'CAP RATE', text: "The capitalization rate measures the property's return based on its income relative to its value. A strong cap rate for Toronto area rentals is typically 5-7%." } : null)}
            />
            <KeyMetricCard
              title="CASH ON CASH"
              value={formatPercentage(cashOnCashReturn)}
              tooltipText="Cash-on-cash return shows the annual return on your initial cash investment. A good cash-on-cash return is generally between 8-12%."
              statusTone={cashOnCashReturn >= 8 ? 'positive' : cashOnCashReturn >= 5 ? 'neutral' : 'warning'}
              statusMessage={cashOnCashReturn >= 8 ? 'STRONG' : cashOnCashReturn >= 5 ? 'MODERATE' : 'LOW'}
              onHover={(isHovered) => setHoveredMetric(isHovered ? { title: 'CASH ON CASH', text: "Cash-on-cash return shows the annual return on your initial cash investment. A good cash-on-cash return is generally between 8-12%." } : null)}
            />
            <KeyMetricCard
              title="DSCR"
              value={dscr > 0 ? dscr.toFixed(2) : 'N/A'}
              tooltipText="Debt Service Coverage Ratio measures the property's ability to cover its debt payments. A DSCR above 1.25 is generally considered healthy."
              statusTone={dscr >= 1.25 ? 'positive' : dscr >= 1.0 ? 'neutral' : 'warning'}
              statusMessage={dscr >= 1.25 ? 'HEALTHY' : dscr >= 1.0 ? 'ADEQUATE' : 'RISK'}
              onHover={(isHovered) => setHoveredMetric(isHovered ? { title: 'DSCR', text: "Debt Service Coverage Ratio measures the property's ability to cover its debt payments. A DSCR above 1.25 is generally considered healthy." } : null)}
            />
            <KeyMetricCard
              title="IRR"
              value={formatPercentage(irr * 100)}
              tooltipText={`IRR (Internal Rate of Return)
IRR is your property's "all-in" annual growth rate. Unlike simple cash flow, it combines your rental profit, property appreciation (3%), and mortgage paydown into one percentage so you can easily compare this deal to other investments like stocks or savings. By accounting for the time value of money and the 5% cost to eventually sell, it provides the most accurate "big picture" of your total wealth growth.`}
              statusTone={irr >= 0.12 ? 'positive' : irr >= 0.08 ? 'neutral' : 'warning'}
              statusMessage={irr >= 0.12 ? 'STRONG' : irr >= 0.08 ? 'MODERATE' : 'LOW'}
              onHover={(isHovered) => setHoveredMetric(isHovered ? { title: 'IRR', text: `IRR (Internal Rate of Return)
IRR is your property's "all-in" annual growth rate. Unlike simple cash flow, it combines your rental profit, property appreciation (3%), and mortgage paydown into one percentage so you can easily compare this deal to other investments like stocks or savings. By accounting for the time value of money and the 5% cost to eventually sell, it provides the most accurate "big picture" of your total wealth growth.` } : null)}
              customContent={
                <select 
                  value={irrYears} 
                  onChange={(e) => setIrrYears(parseInt(e.target.value))}
                  className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#205A3E] dark:focus:ring-[#4ade80] mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value={3}>3Y</option>
                  <option value={5}>5Y</option>
                  <option value={10}>10Y</option>
                  <option value={15}>15Y</option>
                  <option value={20}>20Y</option>
                </select>
              }
            />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
    );
  } catch (error) {
    console.error('Error in PropertyCard render:', error);
    // Return error UI instead of throwing
    return (
      <div className="p-4 border border-red-300 rounded-lg bg-red-50">
        <p className="text-red-600 font-semibold">Error rendering property</p>
        <p className="text-sm text-red-500 mt-1">{property.nickname || property.name || property.id || 'Unknown'}</p>
        <p className="text-xs text-red-400 mt-1">{error.message || 'Unknown error'}</p>
      </div>
    );
  }
}

// Financial Overview Card Component (similar to TopMetricCard)
function FinancialOverviewCard({ title, value, supporting, icon: Icon, accent = 'emerald', tooltipText }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const accentConfig = {
    emerald: {
      border: 'border-[#205A3E]/30 dark:border-[#1C4F39]/40',
      gradient: 'from-[#D9E5DC] via-[#F4F8F5] to-transparent dark:from-[#1A2F25] dark:via-[#101B15] dark:to-transparent',
      icon: 'text-[#205A3E] dark:text-[#66B894] bg-white/90 dark:bg-[#1D3A2C]/70',
      supporting: 'text-[#205A3E] dark:text-[#66B894]',
      separator: 'border-[#205A3E]/30 dark:border-[#66B894]/30',
    },
    teal: {
      border: 'border-[#1A4A5A]/25 dark:border-[#123640]/40',
      gradient: 'from-[#D8E6EA] via-[#F5F9FA] to-transparent dark:from-[#11252B] dark:via-[#0B181D] dark:to-transparent',
      icon: 'text-[#1A4A5A] dark:text-[#7AC0CF] bg-white/90 dark:bg-[#132E36]/70',
      supporting: 'text-[#1A4A5A] dark:text-[#7AC0CF]',
      separator: 'border-[#1A4A5A]/30 dark:border-[#7AC0CF]/30',
    },
    amber: {
      border: 'border-[#B57A33]/25 dark:border-[#8C5D24]/35',
      gradient: 'from-[#F3E6D4] via-[#FBF6EE] to-transparent dark:from-[#2A2014] dark:via-[#1B140C] dark:to-transparent',
      icon: 'text-[#B57A33] dark:text-[#E9C08A] bg-white/90 dark:bg-[#2D2115]/70',
      supporting: 'text-[#B57A33] dark:text-[#E9C08A]',
      separator: 'border-[#B57A33]/30 dark:border-[#E9C08A]/30',
    },
  };
  
  const config = accentConfig[accent] || accentConfig.emerald;
  
  return (
    <div className={`relative rounded-lg border ${config.border} bg-gradient-to-br ${config.gradient} p-2 md:p-2.5`}>
      <div className="flex items-start justify-between gap-1">
        <h3 className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white flex-1 leading-tight line-clamp-2">
          {title}
        </h3>
        {Icon && (
          <div 
            className="relative group flex-shrink-0"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div className={`relative rounded-full p-1 ${config.icon} cursor-help flex items-center justify-center`}>
              <Icon className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" aria-hidden="true" />
            </div>
            {tooltipText && showTooltip && (
              <div className="absolute bottom-full right-0 mb-2 p-3 bg-[#205A3E] text-white text-xs leading-relaxed rounded-lg pointer-events-none whitespace-normal z-50 w-72 max-w-[calc(100vw-2rem)] shadow-2xl">
                {tooltipText}
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#205A3E]"></div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-1 md:mt-1.5 text-base md:text-lg font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      {supporting && (
        <>
          <div className={`mt-1 md:mt-1.5 border-t-[2px] ${config.separator}`} />
          <div className={`mt-0.5 md:mt-1 text-[10px] md:text-xs font-bold ${config.supporting} leading-tight`} suppressHydrationWarning>
            {typeof supporting === 'string' ? supporting : supporting}
          </div>
        </>
      )}
    </div>
  );
}

// Income & Expenses Section Component
function IncomeExpensesSection({ 
  totalRevenue, 
  operatingExpenses, 
  debtService, 
  netCashFlow, 
  margin, 
  revenueConsumed,
  operatingExpensesPercent,
  debtServicePercent
}) {
  const totalOutflows = operatingExpenses + debtService;
  const netPositive = netCashFlow >= 0;
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
  const operatingExpensesPercentRounded = totalRevenue > 0 
    ? Math.round((operatingExpenses / totalRevenue) * 100)
    : 0;
  const debtServicePercentRounded = totalRevenue > 0
    ? Math.round((debtService / totalRevenue) * 100)
    : 0;

  const steps = [
    { label: 'Total Revenue', value: totalRevenue, type: 'base' },
    { label: 'Total Expenses', value: totalOutflows, type: 'subtract', isAggregate: true },
    { label: `Operating Expenses (${operatingExpensesPercentRounded}%)`, value: operatingExpenses, type: 'subtract', isSub: true },
    { label: `Debt Service (${debtServicePercentRounded}%)`, value: debtService, type: 'subtract', isSub: true },
  ];

  const barWidth = (value) => {
    if (scale <= 0) return 0;
    return Math.min(100, (Math.abs(value) / scale) * 100);
  };
  
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-2.5 md:p-3">
      <div className="mb-2.5">
        <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
          Income & Expenses
        </h3>
        <p className="mt-0.5 text-[10px] md:text-xs text-gray-600 dark:text-gray-400">
          Annualized snapshot of how rent covers operating costs and debt service.
        </p>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        {/* Net Cash Flow - Moved to top */}
        <div
          className={`mb-3 md:mb-4 flex items-start justify-between rounded-md border px-3 md:px-4 py-2.5 md:py-3.5 text-sm md:text-base ${
            netPositive
              ? 'border-[#C7D9CB] bg-[#EFF4F0] text-[#205A3E] dark:border-[#244632] dark:bg-[#15251D] dark:text-[#7AC0A1]'
              : 'border-[#E1B8B8] bg-[#FDF3F3] text-[#9F3838] dark:border-[#4C1F1F] dark:bg-[#1F1111] dark:text-[#F2A5A5]'
          }`}
        >
          <div>
            <p className="font-semibold text-lg md:text-xl">Net Cash Flow</p>
            <p className="text-sm md:text-base opacity-80">After operating expenses and debt service</p>
          </div>
          <div className="text-right">
            <p className="text-lg md:text-2xl font-bold">{formatCurrency(netCashFlow)}</p>
            {expenseShare !== null && Number.isFinite(expenseShare) && (
              <p className="text-sm md:text-base font-medium opacity-80">
                {percentFormatter.format(expenseShare)} of revenue consumed
              </p>
            )}
          </div>
        </div>

        {/* Revenue and Expenses Steps */}
        {steps.map((step, index) => (
          <div key={step.label} className={`relative ${step.isSub ? 'pl-6 md:pl-8' : 'pl-2 md:pl-3'}`}>
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
            <div className="mt-1 h-1.5 md:h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
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

function MetricDisplayCard({ label, value, subvalue, isPositive, accent = 'emerald', size = 'large' }) {
  // Consistent font sizes across all metric cards
  const valueSize = size === 'large' ? 'text-xl' : 'text-lg';
  
  // Sophisticated tinted backgrounds matching Bonzai TopMetricCard style
  const accentConfig = {
    emerald: {
      border: 'border-[#205A3E]/30 dark:border-[#1C4F39]/40',
      gradient: 'from-[#D9E5DC] via-[#F4F8F5] to-transparent dark:from-[#1A2F25] dark:via-[#101B15] dark:to-transparent',
    },
    teal: {
      border: 'border-[#1A4A5A]/25 dark:border-[#123640]/40',
      gradient: 'from-[#D8E6EA] via-[#F5F9FA] to-transparent dark:from-[#11252B] dark:via-[#0B181D] dark:to-transparent',
    },
    amber: {
      border: 'border-[#B57A33]/25 dark:border-[#8C5D24]/35',
      gradient: 'from-[#F3E6D4] via-[#FBF6EE] to-transparent dark:from-[#2A2014] dark:via-[#1B140C] dark:to-transparent',
    },
    red: {
      border: 'border-red-200/30 dark:border-red-800/40',
      gradient: 'from-red-50/50 via-red-25/30 to-transparent dark:from-red-950/30 dark:via-red-900/20 dark:to-transparent',
    },
  };

  const config = isPositive === false ? accentConfig.red : accentConfig[accent] || accentConfig.emerald;
  
  const getValueColor = () => {
    if (isPositive === false) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-900 dark:text-gray-100';
  };

  return (
    <div className={`relative overflow-hidden rounded-lg border ${config.border} bg-gradient-to-br ${config.gradient} p-2.5 hover:opacity-95 transition-opacity`}>
      <div className="text-center">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
          {label}
        </div>
        <div className={`${valueSize} font-bold ${getValueColor()} mb-0.5`}>
          {value}
        </div>
        {subvalue && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {subvalue}
          </div>
        )}
      </div>
    </div>
  );
}

function KeyMetricCard({ title, value, tooltipText, statusTone = 'neutral', statusMessage, customContent, onHover }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleMouseEnter = () => {
    setShowTooltip(true);
    if (onHover) onHover(true);
  };
  
  const handleMouseLeave = () => {
    setShowTooltip(false);
    if (onHover) onHover(false);
  };
  
  // Sophisticated tinted backgrounds matching Bonzai TopMetricCard style
  const getCardStyles = () => {
    switch (statusTone) {
      case 'positive':
        return {
          border: 'border-[#205A3E]/30 dark:border-[#1C4F39]/40',
          gradient: 'from-[#D9E5DC] via-[#F4F8F5] to-transparent dark:from-[#1A2F25] dark:via-[#101B15] dark:to-transparent',
        };
      case 'neutral':
        return {
          border: 'border-[#1A4A5A]/25 dark:border-[#123640]/40',
          gradient: 'from-[#D8E6EA] via-[#F5F9FA] to-transparent dark:from-[#11252B] dark:via-[#0B181D] dark:to-transparent',
        };
      case 'warning':
        return {
          border: 'border-[#B57A33]/25 dark:border-[#8C5D24]/35',
          gradient: 'from-[#F3E6D4] via-[#FBF6EE] to-transparent dark:from-[#2A2014] dark:via-[#1B140C] dark:to-transparent',
        };
      default:
        return {
          border: 'border-black/10 dark:border-white/10',
          gradient: 'from-transparent via-transparent to-transparent',
        };
    }
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

  const cardStyles = getCardStyles();
  const statusStyles = statusToneConfig[statusTone] || statusToneConfig.neutral;

  // Minimal design - neutral text colors matching Bonzai aesthetic
  const getValueColor = () => {
    return 'text-gray-900 dark:text-gray-100';
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-lg border ${cardStyles.border} bg-gradient-to-br ${cardStyles.gradient} p-1.5 md:p-2 hover:opacity-95 transition-opacity`}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <h5 className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide truncate">{title}</h5>
          {tooltipText && (
            <div 
              className="relative flex-shrink-0 group"
              onMouseEnter={handleMouseEnter}
            >
              <div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-white dark:bg-gray-100 border-2 border-[#205A3E] dark:border-[#4ade80] flex items-center justify-center cursor-help transition-all duration-200 hover:scale-110 hover:bg-[#205A3E] dark:hover:bg-[#4ade80] group/icon">
                <span className="text-[#205A3E] dark:text-[#4ade80] text-[8px] md:text-[10px] font-bold leading-none transition-colors duration-200 group-hover/icon:text-white dark:group-hover/icon:text-[#1D3A2C]">i</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-0.5">
        <p className={`text-sm md:text-base font-bold ${getValueColor()}`}>
          {value}
        </p>
      </div>

      {statusMessage && (
        <div className={`rounded px-1.5 py-0.5 text-[9px] md:text-[10px] font-semibold uppercase tracking-wide ${statusStyles.bg} ${statusStyles.border} ${statusStyles.text} inline-block`}>
          {statusMessage}
        </div>
      )}

      {customContent && (
        <div className="mt-1.5">
          {customContent}
        </div>
      )}
    </div>
  );
}



