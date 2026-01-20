"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import Button from "@/components/Button";
import { useProperty, usePropertyContext } from "@/context/PropertyContext";
import { isUUID } from "@/utils/slug";
import { formatCurrency, formatPercentage, formatNumber } from "@/utils/formatting";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import AnnualExpenseChart from '@/components/charts/AnnualExpenseChart';
import { useToast } from "@/context/ToastContext";
import { useAccount } from "@/context/AccountContext";
import { X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FileText, DollarSign, TrendingUp, Home, Users, BarChart3, PieChart as PieChartIcon, Calendar, Plus, Edit2, Trash2, Check, Building2, Receipt } from "lucide-react";
import PropertyHeader from "@/components/shared/PropertyHeader";
import YoYAnalysis from "@/components/calculators/YoYAnalysis";
import { DEFAULT_ASSUMPTIONS } from "@/lib/sensitivity-analysis";
import { getPropertyNotes, savePropertyNotes } from "@/lib/property-notes-storage";
import { getPropertyTabs, savePropertyTabs, addPropertyTab, updatePropertyTab, deletePropertyTab } from "@/lib/property-tabs-storage";
import apiClient from "@/lib/api-client";
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

// Helper function to format currency with no decimals (matching portfolio summary format)
const formatCurrencyNoDecimals = (value) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.floor(value || 0));
};

// Helper function to format tenant name for display
const formatTenantName = (tenant) => {
  if (!tenant) return 'Vacant';
  // Support both old format (name) and new format (firstInitial + lastName)
  if (tenant.name) {
    return tenant.name;
  }
  if (tenant.firstInitial && tenant.lastName) {
    return `${tenant.firstInitial}. ${tenant.lastName}`;
  }
  if (tenant.firstInitial) {
    return `${tenant.firstInitial}.`;
  }
  if (tenant.lastName) {
    return tenant.lastName;
  }
  return 'Vacant';
};

// TopMetricCard component (matching Portfolio Summary format)
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

  return (
    <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-slate-700 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 transition-shadow duration-300 ease-in-out hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0 flex-1 pr-1.5 max-w-[calc(100%-3rem)]">
          <h3 className="text-[3.15px] font-semibold uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap leading-tight" style={{ letterSpacing: '-0.04em' }}>
            {title}
          </h3>
        </div>
        {Icon && (
          <div 
            className="relative group flex-shrink-0"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div ref={iconRef} className={`relative rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 cursor-help ${
              accent === 'emerald' || accent === 'teal'
                ? 'bg-[#205A3E]/10 dark:bg-[#205A3E]/20'
                : 'bg-slate-100 dark:bg-slate-800'
            }`}>
              <Icon className={`h-[16.2px] w-[16.2px] flex-shrink-0 ${
                accent === 'emerald' || accent === 'teal'
                  ? 'text-[#205A3E] dark:text-[#66B894]'
                  : 'text-slate-500 dark:text-slate-400'
              }`} aria-hidden="true" />
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
      <div className="mt-5 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {supporting && (
        <>
          <div className="mt-4 border-t border-gray-100 dark:border-gray-800" />
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

export default function PropertyDetailPage() {
  // Use useParams hook for client components - more reliable than use(params)
  const params = useParams();
  // Handle both string and array cases for Next.js 15
  const slugOrId = Array.isArray(params?.propertyId) ? params.propertyId[0] : params?.propertyId;
  const [isHydrated, setIsHydrated] = useState(false);
  const { addToast } = useToast();
  const { refreshAccounts } = useAccount();
  const { getPropertyById, getPropertyBySlug, updateProperty: updatePropertyInContext, properties: allProperties } = usePropertyContext();
  const router = useRouter();
  
  // Debug: Log available properties count
  useEffect(() => {
    if (isHydrated) {
      console.log('PropertyDetailsPage: Total properties available:', allProperties?.length || 0);
      if (allProperties && allProperties.length > 0) {
        console.log('PropertyDetailsPage: Property nicknames:', allProperties.map(p => p.nickname || p.name));
      }
    }
  }, [isHydrated, allProperties]);
  
  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  // State hooks
  const [expenseView, setExpenseView] = useState('annual'); // 'monthly' or 'annual'
  const [hoveredSegment, setHoveredSegment] = useState(null); // For hover interactions
  const [historicalStartYear, setHistoricalStartYear] = useState(null);
  const [historicalYears, setHistoricalYears] = useState(5);
  const [visibleMetrics, setVisibleMetrics] = useState({
    income: true,
    expenses: true,
    cashFlow: true
  });
  const [openSections, setOpenSections] = useState({
    generalNotes: false,
    propertyFinancials: true,
    historicalPerformance: true,
    currentTenants: true,
    annualExpenseHistory: true
  });
  const [notes, setNotes] = useState('');
  const [notesChanged, setNotesChanged] = useState(false);
  const [activeTenantTab, setActiveTenantTab] = useState('current');
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabLabel, setEditingTabLabel] = useState('');
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAddPhotosModal, setShowAddPhotosModal] = useState(false);
  const [showAddPhotosTooltip, setShowAddPhotosTooltip] = useState(false);
  const [failedImageUrls, setFailedImageUrls] = useState(new Set());
  const [selectedUnitType, setSelectedUnitType] = useState('');
  
  // Get property data - try slug first, then fall back to ID (for backward compatibility)
  const property = useMemo(() => {
    if (!slugOrId) {
      console.log('PropertyDetailsPage: No slugOrId provided');
      return undefined;
    }
    
    // Check if it looks like a UUID
    if (isUUID(slugOrId)) {
      const found = getPropertyById(slugOrId);
      console.log('PropertyDetailsPage: Looking up by UUID:', slugOrId, 'Found:', !!found, 'Property ID:', found?.id);
      return found;
    } else {
      // Try to find by slug
      const found = getPropertyBySlug(slugOrId);
      console.log('PropertyDetailsPage: Looking up by slug:', slugOrId, 'Found:', !!found, 'Property ID:', found?.id, 'Nickname:', found?.nickname);
      if (!found) {
        console.warn('PropertyDetailsPage: Property not found with slug:', slugOrId);
      }
      return found;
    }
  }, [slugOrId, getPropertyById, getPropertyBySlug]);
  
  // Use property.id for notes/tabs storage (still uses UUID internally)
  const propertyId = property?.id;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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

  // All useMemo hooks must be declared before conditional returns
  // These will return empty/default values if property is not available, but hooks must still be called
  
  // Prepare expense data for pie chart with mortgage breakdown
  const expenseChartData = useMemo(() => {
    if (!isHydrated || !property?.monthlyExpenses) return [];
    
    // Diverse color palette for better visualization
    const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
    
    const entries = [];
    let colorIndex = 0;
    
    // Add regular expenses (excluding mortgage payment if it exists)
    Object.entries(property.monthlyExpenses).forEach(([key, value]) => {
      // Filter out 'total' and all mortgage-related entries
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
      }
    });
    
    // Add mortgage breakdown as separate line items
    if (property.mortgage) {
      try {
        const monthlyInterest = getMonthlyMortgageInterest(property.mortgage);
        const monthlyPrincipal = getMonthlyMortgagePrincipal(property.mortgage);
        
        const annualInterest = monthlyInterest * 12;
        const annualPrincipal = monthlyPrincipal * 12;
        
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
        { year: '2021', income: 31200, expenses: 32368, cashFlow: -1168 },
        { year: '2022', income: 31944, expenses: 35721, cashFlow: -3777 },
        { year: '2023', income: 31920, expenses: 33305, cashFlow: -1385 },
        { year: '2024', income: 32688, expenses: 33799, cashFlow: -1111 },
        { year: '2025', income: 33468, expenses: 33799, cashFlow: -331 }
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
      yoYData[entry.key] = null;
    });
    
    return yoYData;
  }, [expenseChartData, historicalData, property?.monthlyExpenses]);

  // Process tenant data for rent chart with monthly granularity
  const rentChartData = useMemo(() => {
    if (!property?.tenants || property.tenants.length === 0) return [];
    
    // Find earliest and latest dates
    let earliestDate = null;
    let latestDate = new Date();
    
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
    currentDate.setDate(1);
    
    while (currentDate <= latestDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Find active tenant(s) for this month
      let activeRent = 0;
      let activeTenant = null;
      let isChange = false;
      let change = 0;
      
      property.tenants.forEach(tenant => {
        try {
          const leaseStart = new Date(tenant.leaseStart);
          const leaseEnd = tenant.leaseEnd === 'Active' 
            ? new Date() 
            : new Date(tenant.leaseEnd);
          
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
        isChange = change !== 0;
      }
      
      const period = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      monthlyData.push({
        period,
        date: new Date(currentDate),
        rent: activeRent,
        change,
        tenantName: formatTenantName(activeTenant),
        isIncrease: change > 0,
        isDecrease: change < 0,
        isChange
      });
      
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
      
      if (mortgage.remainingBalance !== undefined && mortgage.remainingBalance !== null) {
        return mortgage.remainingBalance;
      }
      
      const originalAmount = mortgage.originalAmount || 0;
      const amortizationYears = mortgage.amortizationYears || 30;
      const totalMonths = amortizationYears * 12;
      const monthlyPayment = getMonthlyMortgagePayment(mortgage);
      
      if (monthlyPayment <= 0) return originalAmount;
      
      const annualRate = mortgage.interestRate || 0;
      const monthlyRate = annualRate / 12;
      
      if (monthlyRate === 0) {
        return Math.max(0, originalAmount - (monthlyPayment * monthsElapsed));
      }
      
      const remainingMonths = totalMonths - monthsElapsed;
      if (remainingMonths <= 0) return 0;
      
      const remainingBalance = originalAmount * 
        (Math.pow(1 + monthlyRate, remainingMonths) - 1) / 
        (Math.pow(1 + monthlyRate, totalMonths) - 1) * 
        Math.pow(1 + monthlyRate, totalMonths);
      
      return Math.max(0, remainingBalance);
    };

    const mortgageBalance = calculateMortgageBalance();
    const propertyValue = property.currentMarketValue || property.currentValue || property.purchasePrice || 0;
    const equity = Math.max(0, propertyValue - mortgageBalance);
    const equityPercentage = propertyValue > 0 ? (equity / propertyValue) * 100 : 0;
    const portfolioLTV = propertyValue > 0 ? (mortgageBalance / propertyValue) * 100 : 0;

    const annualRevenue = property.rent?.annualRent || 0;
    const annualOperatingExpenses = calculateAnnualOperatingExpenses(property);
    const annualDebtService = calculateAnnualDebtService(property);
    const totalExpenses = annualOperatingExpenses + annualDebtService;
    const noi = calculateNOI(property);
    const netCashFlow = calculateAnnualCashFlow(property);
    const capRate = calculateCapRate(property);
    const cashOnCash = calculateCashOnCashReturn(property);
    const dscr = calculateDSCR(property);
    const irr = calculateIRR(property, 5);

    // Calculate forecasted equity (equity + appreciation + principal payments)
    const downPayment = property.purchasePrice - (property.mortgage?.originalAmount || 0);
    const appreciation = propertyValue - property.purchasePrice;
    const equityViaPrincipalPayments = property.purchasePrice - mortgageBalance - downPayment;
    const forecastedEquity = equity;

    return {
      propertyValue,
      mortgageBalance,
      equity,
      equityPercentage,
      portfolioLTV,
      annualRevenue,
      annualOperatingExpenses,
      annualDebtService,
      totalExpenses,
      noi,
      netCashFlow,
      capRate,
      cashOnCash,
      dscr,
      irr,
      forecastedEquity,
      margin: annualRevenue > 0 ? ((netCashFlow / annualRevenue) * 100) : 0
    };
  }, [property]);

  // Helper function to generate multiple image URLs from base imageUrl and property_data.imageUrls
  const getPropertyImages = useMemo(() => {
    const images = [];
    
    // First, check if property_data has imageUrls array (new way)
    // Only use images from propertyData.imageUrls (these should be validated/existing images)
    const propertyDataImageUrls = property?.propertyData?.imageUrls || [];
    console.log('getPropertyImages: propertyDataImageUrls:', propertyDataImageUrls, 'property:', property?.id);
    
    if (propertyDataImageUrls.length > 0) {
      // Filter out base64 data URLs and prefer file paths, also filter out failed images
      const filePathUrls = propertyDataImageUrls.filter(url => 
        url && 
        typeof url === 'string' && 
        !url.startsWith('data:') && 
        !failedImageUrls.has(url)
      );
      console.log('getPropertyImages: Returning filtered imageUrls:', filePathUrls);
      return filePathUrls;
    }
    
    // Fallback to legacy method: ONLY use the base imageUrl (don't generate variations)
    // Variations don't exist and will show as blank white images
    if (!property?.imageUrl) {
      console.log('getPropertyImages: No imageUrl found, returning empty array');
      return [];
    }
    
    // Only include base imageUrl if it hasn't failed to load
    if (!failedImageUrls.has(property.imageUrl)) {
      images.push(property.imageUrl);
    }
    
    console.log('getPropertyImages: Returning legacy imageUrl:', images);
    return images;
  }, [property?.imageUrl, property?.propertyData?.imageUrls, failedImageUrls, property?.id]);

  // Reset image index when property or images change
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [property?.imageUrl, property?.propertyData?.imageUrls]);

  // Reset selected unit type when property changes
  useEffect(() => {
    setSelectedUnitType('');
  }, [propertyId]);

  // NOW we can do conditional returns after all hooks are declared
  // Early return if slugOrId is not available
  if (!slugOrId) {
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

  // Show loading while hydrating
  if (!isHydrated) {
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

  // Show error if property not found after hydration
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

  // All useMemo hooks are now declared above, before conditional returns
  // The following code uses those memoized values

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

  const goToPreviousImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? getPropertyImages.length - 1 : prev - 1
    );
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => 
      (prev + 1) % getPropertyImages.length
    );
  };

  return (
    <RequireAuth>
      <Layout>
        <div className="space-y-6">
          {/* Property Header with Bonzai Green Banner */}
          <PropertyHeader 
            property={property}
            onEdit={() => router.push('/data')}
          />

          {/* Purchase Summary & Property Details with Image */}
          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
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
                  <span className="text-gray-600 dark:text-gray-400">Unit Size</span>
                  <span className="font-medium text-gray-900 dark:text-white text-right">
                    {property.units > 1 && property.squareFootage ? (
                      <div className="space-y-0.5">
                        {Array.from({ length: property.units }, (_, index) => {
                          const unitSize = Math.round(property.squareFootage / property.units);
                          return (
                            <div key={index} className="text-xs">
                              Unit {index + 1}: {unitSize.toLocaleString('en-CA')} sq ft
                            </div>
                          );
                        })}
                      </div>
                    ) : property.squareFootage && property.units 
                      ? `${Math.round(property.squareFootage / (property.units || 1)).toLocaleString('en-CA')} sq ft`
                      : property.squareFootage 
                        ? `${Math.round(property.squareFootage).toLocaleString('en-CA')} sq ft`
                        : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600 dark:text-gray-400">Unit Type</span>
                  <div className="font-medium text-gray-900 dark:text-white text-right">
                    {property.units > 1 && property.bedrooms && property.bathrooms && property.bedrooms.length > 0 ? (
                      <div className="relative">
                        <select
                          value={selectedUnitType ?? ''}
                          onChange={(e) => setSelectedUnitType(e.target.value)}
                          className="appearance-none bg-white dark:bg-neutral-800 border border-black/15 dark:border-white/15 rounded-md px-3 py-1.5 pr-8 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 cursor-pointer"
                        >
                          <option value="">Select Unit</option>
                          {property.bedrooms.map((beds, index) => {
                            const baths = property.bathrooms && property.bathrooms[index] !== undefined ? property.bathrooms[index] : (property.bathrooms && property.bathrooms[0] ? property.bathrooms[0] : 0);
                            return (
                              <option key={index} value={index}>
                                Unit {index + 1}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                        {selectedUnitType !== '' && (
                          <div className="mt-2 text-sm">
                            {(() => {
                              const unitIndex = parseInt(selectedUnitType);
                              const beds = property.bedrooms[unitIndex];
                              const baths = property.bathrooms && property.bathrooms[unitIndex] !== undefined ? property.bathrooms[unitIndex] : (property.bathrooms && property.bathrooms[0] ? property.bathrooms[0] : 0);
                              return `${beds} Bed, ${baths} Bath`;
                            })()}
                          </div>
                        )}
                      </div>
                    ) : property.unitConfig || (property.bedrooms && property.bedrooms[0] !== undefined && property.bathrooms && property.bathrooms[0] !== undefined
                      ? `${property.bedrooms[0]} Bed, ${property.bathrooms[0]} Bath`
                      : property.unitConfig || 'N/A')}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ownership</span>
                  <span className="font-medium text-gray-900 dark:text-white">{property.ownership || property.propertyData?.ownership || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Principal Residence</span>
                  <span className="font-medium text-gray-900 dark:text-white">{property.isPrincipalResidence ? "Yes" : "No"}</span>
                </div>
              </div>
              
              {/* Column 3: Thumbnail Image Carousel */}
              <div className="flex items-center justify-center">
                <div className="w-full h-64 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden shadow-sm relative group">
                  {getPropertyImages.length > 0 ? (
                    <>
                      <img 
                        src={`${getPropertyImages[currentImageIndex]}?v=3`}
                        alt={`${property.name || property.nickname} - Image ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover transition-opacity duration-300 cursor-pointer"
                        onError={(e) => {
                          // Track failed images and remove them from the display
                          const failedUrl = getPropertyImages[currentImageIndex];
                          if (failedUrl) {
                            setFailedImageUrls(prev => new Set([...prev, failedUrl]));
                          }
                          // Hide broken images
                          e.target.style.display = 'none';
                          // If this was the current image and there are other images, move to next
                          if (getPropertyImages.length > 1) {
                            setCurrentImageIndex(prev => (prev + 1) % getPropertyImages.length);
                          }
                        }}
                        onClick={() => {
                          if (getPropertyImages.length === 1) {
                            setShowAddPhotosTooltip(true);
                            setTimeout(() => setShowAddPhotosTooltip(false), 3000);
                          }
                        }}
                      />
                      
                      {/* Navigation Buttons - Show on hover or when multiple images */}
                      {getPropertyImages.length > 1 && (
                        <>
                          <button
                            onClick={goToPreviousImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={goToNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            aria-label="Next image"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          
                          {/* Image Indicators */}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {getPropertyImages.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`h-1.5 rounded-full transition-all duration-200 ${
                                  index === currentImageIndex
                                    ? 'bg-white w-6'
                                    : 'bg-white/50 w-1.5 hover:bg-white/70'
                                }`}
                                aria-label={`Go to image ${index + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                      
                      {/* Tooltip for single image - suggest adding more photos */}
                      {getPropertyImages.length === 1 && showAddPhotosTooltip && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-white px-4 py-2 rounded-lg text-sm z-10 whitespace-nowrap shadow-lg">
                          Add some more photos
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                            <div className="border-4 border-transparent border-t-black/90"></div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <div className="text-lg font-medium">Property Image</div>
                        <div className="text-sm">Upload functionality coming soon</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Add Photos Button - Bottom Right */}
                  <button
                    onClick={() => setShowAddPhotosModal(true)}
                    className="absolute bottom-2 right-2 bg-[#205A3E]/80 hover:bg-[#1a4a32]/80 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                    aria-label="Add photos"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* General Notes Section */}
          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 py-0.5 px-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between w-full mb-0.5">
              <button
                onClick={() => toggleSection('generalNotes')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <h2 className="text-xs font-semibold">General Notes</h2>
              </button>
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
                <button
                  onClick={() => toggleSection('generalNotes')}
                  className="hover:opacity-80 transition-opacity"
                >
                  {openSections.generalNotes ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
            {openSections.generalNotes && (
              <div>
                {tabs.length === 0 ? (
                  // No custom tabs - just show the main notes
                  <div>
                    <textarea
                      value={notes}
                      onChange={handleNotesChange}
                      placeholder="Add your notes about this property - dates key events, recording paint colours used, tracking the replacement of appliance - all these details can live here..."
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y min-h-[120px]"
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
                          rows={5}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y min-h-[120px]"
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TopMetricCard
              title="Estimated Property Value"
              value={formatCurrencyNoDecimals(financialMetrics.propertyValue)}
              icon={Building2}
              accent="emerald"
              supporting={
                <>
                  <div className="whitespace-nowrap overflow-hidden">
                    {formatCurrencyNoDecimals(financialMetrics.equity)} equity ({Math.round(financialMetrics.equityPercentage || 0)}%) • {formatCurrencyNoDecimals(financialMetrics.mortgageBalance)} debt ({Math.round(financialMetrics.propertyValue > 0 ? (financialMetrics.mortgageBalance / financialMetrics.propertyValue) * 100 : 0)}%)
                  </div>
                  <div className="mt-1 text-xs opacity-90">
                    Portfolio LTV: {Math.floor(financialMetrics.portfolioLTV || 0)}%
                  </div>
                  <div className="mt-1 text-xs opacity-90">
                    Estimated Appreciation: {formatCurrencyNoDecimals(appreciation)} ({Math.round(property.purchasePrice > 0 ? ((appreciation / property.purchasePrice) * 100) : 0)}%)
                  </div>
                </>
              }
              supportingSize="dynamic"
              iconTooltip="The estimated current market value of this property, based on current market valuations. Values are rounded down to the nearest dollar. LTV (Loan-to-Value) shows the percentage of the property that is financed."
            />
            
            <TopMetricCard
              title="Forecasted Annual Equity"
              value={formatCurrencyNoDecimals(financialMetrics.forecastedEquity)}
              icon={TrendingUp}
              accent="teal"
              supporting={
                <>
                  <div className="whitespace-nowrap overflow-hidden">
                    Current total equity: {formatCurrencyNoDecimals(financialMetrics.equity)}
                  </div>
                  <div className="mt-1 text-xs opacity-90">
                    Includes principal payments + estimated appreciation
                  </div>
                </>
              }
              supportingSize="dynamic"
              iconTooltip="The projected equity you will earn this calendar year through principal payments and estimated property appreciation. This forecast helps you understand how your property equity is growing over time."
            />
            
            <TopMetricCard
              title="Annual Debt Service"
              value={formatCurrencyNoDecimals(financialMetrics.annualDebtService)}
              icon={Receipt}
              accent="amber"
              supporting={
                <>
                  <div className="whitespace-nowrap overflow-hidden">
                    Monthly debt service: {formatCurrencyNoDecimals(financialMetrics.annualDebtService / 12)}
                  </div>
                  <div className="mt-1 text-xs opacity-90">
                    Principal + interest payments
                  </div>
                </>
              }
              supportingSize="dynamic"
              iconTooltip="Your total annual mortgage payments (principal and interest) for this property. This represents your annual debt obligations and helps you understand cash flow requirements."
            />
          </div>

          <div className="space-y-6">
            {/* Main Content - Full Width */}
            <div className="space-y-6">
              {/* Performance Metrics Section */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold">Performance Metrics</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* CAP RATE */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">CAP RATE</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {formatPercentage(financialMetrics.capRate)}
                    </div>
                    <div className={`text-xs font-semibold ${capRateStatus.color}`}>
                      {capRateStatus.label}
                    </div>
                  </div>

                  {/* CASH ON CASH */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">CASH ON CASH</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {formatPercentage(financialMetrics.cashOnCash)}
                    </div>
                    <div className={`text-xs font-semibold ${cashOnCashStatus.color}`}>
                      {cashOnCashStatus.label}
                    </div>
                  </div>

                  {/* DSCR */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">DSCR</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {financialMetrics.dscr.toFixed(2)}
                    </div>
                    <div className={`text-xs font-semibold ${dscrStatus.color}`}>
                      {dscrStatus.label}
                    </div>
                  </div>

                  {/* IRR */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-600 dark:text-gray-400">IRR</div>
                      <select className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#205A3E] focus:border-transparent">
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
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Income & Expenses
                      </h2>
                    </div>
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
                  {/* Net Cash Flow */}
                  <div
                    className={`flex items-start justify-between rounded-md border px-4 py-3 text-sm ${
                      financialMetrics.netCashFlow >= 0
                        ? 'border-[#C7D9CB] bg-[#EFF4F0] text-[#205A3E] dark:border-[#244632] dark:bg-[#15251D] dark:text-[#7AC0A1]'
                        : 'border-[#E1B8B8] bg-[#FDF3F3] text-[#9F3838] dark:border-[#4C1F1F] dark:bg-[#1F1111] dark:text-[#F2A5A5]'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">Net Cash Flow (Forecasted)</p>
                      <p className="text-xs opacity-80">After operating expenses and debt service</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold">{formatCurrency(financialMetrics.netCashFlow)}</p>
                      <p className="text-xs font-medium opacity-80">
                        {formatPercentage((financialMetrics.totalExpenses / financialMetrics.annualRevenue) * 100)}% of revenue consumed
                      </p>
                    </div>
                  </div>

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
              </div>

              {/* Expense Summary Card */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleSection('propertyFinancials')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
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
                          isAnimationActive={true}
                          animationBegin={300}
                          animationDuration={1400}
                          animationEasing="ease-in-out"
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
                          isAnimationActive={true}
                          animationBegin={300}
                          animationDuration={1400}
                          animationEasing="ease-in-out"
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
                          isAnimationActive={true}
                          animationBegin={300}
                          animationDuration={1400}
                          animationEasing="ease-in-out"
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
                      <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                                  <div className="font-semibold text-gray-900 dark:text-white mb-2">{formatTenantName(tenant)}</div>
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
                    <h2 className="text-xl font-semibold">Annual Expense History</h2>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      Categorized expenses
                    </span>
                  </div>
                  {openSections.annualExpenseHistory ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
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

        {/* Add Photos Modal */}
        {showAddPhotosModal && (
          <AddPhotosModal
            property={property}
            onClose={() => setShowAddPhotosModal(false)}
            onSave={async () => {
              console.log('PropertyDetailsPage: onSave called, refreshing accounts...');
              // Refresh property data from the API to show the new images
              await refreshAccounts();
              console.log('PropertyDetailsPage: refreshAccounts completed');
              // Force a small delay to ensure context updates propagate
              await new Promise(resolve => setTimeout(resolve, 500));
              // Force re-render by updating a state variable if needed
              // The property memo should automatically update when getPropertyById/getPropertyBySlug change
            }}
            updatePropertyInContext={updatePropertyInContext}
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

// Add Photos Modal Component
function AddPhotosModal({ property, onClose, onSave, updatePropertyInContext }) {
  const [imageUrls, setImageUrls] = useState(['']);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();

  const handleAddUrl = () => {
    setImageUrls([...imageUrls, '']);
  };

  const handleUrlChange = (index, value) => {
    const updated = [...imageUrls];
    updated[index] = value;
    setImageUrls(updated);
  };

  const handleRemoveUrl = (index) => {
    if (imageUrls.length > 1) {
      setImageUrls(imageUrls.filter((_, i) => i !== index));
    } else {
      setImageUrls(['']);
    }
  };

  const handleFileInput = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', { type: 'error' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      addToast('Image size must be less than 10MB', { type: 'error' });
      return;
    }

    // Convert to base64 data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        const updated = [...imageUrls];
        updated[index] = dataUrl;
        setImageUrls(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filter out empty URLs
    const validUrls = imageUrls.filter(url => url.trim() !== '');
    
    if (validUrls.length === 0) {
      addToast('Please add at least one image URL or upload a file', { type: 'error' });
      return;
    }

    setUploading(true);
    
    try {
      // Get current property_data
      const currentPropertyData = property?.propertyData || {};
      
      // Get existing imageUrls array or create new one
      const existingImageUrls = currentPropertyData.imageUrls || [];
      
      // Add new imageUrl if it's not in the array
      const baseImageUrl = property?.imageUrl || existingImageUrls[0] || '';
      
      // Combine existing URLs with new ones, avoiding duplicates
      const allImageUrls = [...existingImageUrls];
      validUrls.forEach(url => {
        if (!allImageUrls.includes(url) && url !== baseImageUrl) {
          allImageUrls.push(url);
        }
      });

      // Update property_data with imageUrls array
      const updatedPropertyData = {
        ...currentPropertyData,
        imageUrls: allImageUrls,
        // Keep imageUrl as the primary image if it exists
        imageUrl: baseImageUrl || allImageUrls[0] || null
      };

      // Update property via API
      console.log('AddPhotosModal: Saving photos, updatedPropertyData:', updatedPropertyData);
      const response = await apiClient.updateProperty(property.id, {
        propertyData: updatedPropertyData
      });

      if (response.success) {
        console.log('AddPhotosModal: Photos saved successfully, API response:', response.data);
        
        // Immediately update local property context with the API response
        if (response.data) {
          const apiProperty = response.data;
          const apiPropertyData = apiProperty.property_data || {};
          console.log('AddPhotosModal: Updating local property context with imageUrls:', apiPropertyData.imageUrls);
          
          // Update property in context immediately for instant UI feedback
          // This will be merged with the full property data from refreshAccounts
          if (updatePropertyInContext) {
            updatePropertyInContext(property.id, {
              propertyData: apiPropertyData
            }, true); // skipSave since we already saved via API
          }
        }
        
        addToast(`Successfully added ${validUrls.length} photo(s)`, { type: 'success' });
        
        // Wait for onSave to complete (refresh accounts) before closing
        if (onSave) {
          console.log('AddPhotosModal: Calling onSave to refresh accounts...');
          await onSave();
          console.log('AddPhotosModal: onSave completed');
        }
        
        // Add a small delay to ensure context updates propagate
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('AddPhotosModal: Closing modal');
        onClose();
      } else {
        throw new Error(response.error || 'Failed to save photos');
      }
    } catch (error) {
      console.error('Error saving photos:', error);
      addToast(error.message || 'Failed to save photos', { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/20 dark:border-gray-700/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Photos
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            {imageUrls.map((url, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder="Enter image URL or upload a file"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileInput(e, index)}
                      className="hidden"
                      id={`file-upload-${index}`}
                    />
                    <label
                      htmlFor={`file-upload-${index}`}
                      className="inline-flex items-center gap-2 text-sm text-[#205A3E] hover:text-[#1a4a32] cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Upload file instead
                    </label>
                  </div>
                  {url && url.startsWith('data:image') && (
                    <div className="mt-2">
                      <img 
                        src={url} 
                        alt={`Preview ${index + 1}`}
                        className="max-w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                    </div>
                  )}
                </div>
                {imageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveUrl(index)}
                    className="text-red-500 hover:text-red-700 mt-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddUrl}
            className="flex items-center gap-2 text-[#205A3E] hover:text-[#1a4a32] text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add another photo
          </button>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" type="button" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Saving...' : 'Save Photos'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


