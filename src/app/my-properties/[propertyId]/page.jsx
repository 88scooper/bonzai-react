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
import { X, ChevronDown, ChevronUp, FileText } from "lucide-react";
import YoYAnalysis from "@/components/calculators/YoYAnalysis";
import { DEFAULT_ASSUMPTIONS } from "@/lib/sensitivity-analysis";
import { getPropertyNotes, savePropertyNotes } from "@/lib/property-notes-storage";

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

  const [expenseView, setExpenseView] = useState('monthly'); // 'monthly' or 'annual'
  const [hoveredSegment, setHoveredSegment] = useState(null); // For hover interactions
  
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

  // Prepare expense data for pie chart
  const expenseChartData = useMemo(() => {
    if (!property?.monthlyExpenses || !isHydrated) return [];
    
    // Diverse color palette for better visualization
    const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    
    return Object.entries(property.monthlyExpenses)
      .filter(([key, value]) => key !== 'total' && value > 0)
      .map(([key, value], index) => ({
        name: key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase()),
        value: expenseView === 'annual' ? value * 12 : value,
        color: colors[index % colors.length]
      }));
  }, [property?.monthlyExpenses, expenseView, isHydrated]);

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
    
    return data;
  }, [property, isHydrated]);

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

  return (
    <RequireAuth>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{property.name}</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-300">{property.address}</p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">
                  {property.type}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {property.units} unit{property.units > 1 ? 's' : ''}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatNumber(property.squareFootage)} sq ft
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowEditPropertyModal(true)}>Edit Property</Button>
              <Button onClick={() => setShowAddExpenseModal(true)}>Add Expense</Button>
            </div>
          </div>

          {/* Property Image */}
          <div className="h-64 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
            {property.imageUrl ? (
              <img 
                src={`${property.imageUrl}?v=3`}
                alt={property.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="text-lg font-medium">Property Image</div>
                  <div className="text-sm">Upload functionality coming soon</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Main Content - Full Width */}
            <div className="space-y-6">
              {/* Property Summary & Purchase Details */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6">
                <h2 className="text-xl font-semibold mb-4">Property Summary & Purchase Details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Purchase Price</span>
                      <span className="font-medium">{formatCurrency(property.purchasePrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Original Mortgage</span>
                      <span className="font-medium">{formatCurrency(property.mortgage.originalAmount)}</span>
                    </div>
                    
                    {/* Visual Separator */}
                    <div className="pt-2 border-t border-black/10 dark:border-white/10"></div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Down Payment</span>
                      <span className="font-medium">{formatCurrency(property.purchasePrice - property.mortgage.originalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Closing Costs</span>
                      <span className="font-medium">{formatCurrency(property.closingCosts)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Initial Renovations</span>
                      <span className="font-medium">{formatCurrency(property.initialRenovations)}</span>
                    </div>
                    <div className="pt-2 border-t border-black/10 dark:border-white/10">
                      <div className="flex justify-between font-semibold">
                        <span>Total Investment (Cash)</span>
                        <span>{formatCurrency((property.purchasePrice - property.mortgage.originalAmount) + property.closingCosts + property.initialRenovations)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Purchase Date</span>
                      <span className="font-medium">{new Date(property.purchaseDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Year Built</span>
                      <span className="font-medium">{property.yearBuilt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Purchase Price Per Square Foot</span>
                      <span className="font-medium">{formatCurrency(property.pricePerSquareFoot)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Current Value</span>
                      <span className="font-medium">{formatCurrency(property.currentValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Appreciation</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(property.currentValue - property.purchasePrice)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Notes Section */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6">
                <button
                  onClick={() => toggleSection('generalNotes')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" />
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
                      rows={8}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y min-h-[200px]"
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {notesChanged ? 'Saving...' : 'Notes are automatically saved'}
                    </div>
                  </div>
                )}
              </div>

              {/* Unified Monthly Financials Card */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6">
                <button
                  onClick={() => toggleSection('propertyFinancials')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <h2 className="text-xl font-semibold">Property Financials</h2>
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

                  <div className="space-y-6">
                  {/* Income Section */}
                  <div>
                    <div className="flex justify-between">
                      <span className="text-gray-900 dark:text-gray-100">Total Income</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {isHydrated ? formatCurrency(expenseView === 'monthly' ? (property.rent?.monthlyRent || 0) : (property.rent?.annualRent || 0)) : '--'}
                      </span>
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div>
                    <h3 className="font-medium mb-4 text-gray-900 dark:text-gray-100">
                      {expenseView === 'monthly' ? 'Monthly' : 'Annual'} Total Expense
                    </h3>
                    <div className="grid grid-cols-2 gap-8">
                      {/* Donut Chart */}
                      <div className="flex justify-center">
                        <div className="relative">
                          <ResponsiveContainer width={140} height={140}>
                            <PieChart>
                              <Pie
                                data={expenseChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={65}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                onMouseEnter={(data, index) => setHoveredSegment(index)}
                                onMouseLeave={() => setHoveredSegment(null)}
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
                          {/* Center Text */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(expenseChartData.reduce((sum, item) => sum + item.value, 0))}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Total {expenseView === 'monthly' ? 'Monthly' : 'Annual'} Expense
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Data-Rich Legend */}
                      <div className="space-y-2">
                        {expenseChartData.length > 0 ? (
                          expenseChartData.map((entry, index) => {
                            const total = expenseChartData.reduce((sum, item) => sum + item.value, 0);
                            const percentage = ((entry.value / total) * 100).toFixed(1);

                            return (
                              <div
                                key={index}
                                className={`flex items-center justify-between py-2 px-3 rounded-lg transition-all duration-200 cursor-pointer group ${
                                  hoveredSegment === index
                                    ? 'bg-gray-100 dark:bg-gray-700 shadow-sm'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                                onMouseEnter={() => setHoveredSegment(index)}
                                onMouseLeave={() => setHoveredSegment(null)}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: entry.color }}
                                  ></div>
                                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                                    {entry.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-gray-500 dark:text-gray-400 min-w-[3rem] text-right">
                                    {percentage}%
                                  </span>
                                  <span className="text-gray-900 dark:text-gray-100 font-medium min-w-[4rem] text-right">
                                    {formatCurrency(entry.value)}
                                  </span>
                                </div>
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
                  </div>

                  {/* Net Cash Flow - Bottom Line */}
                  <div className="pt-4 border-t-2 border-gray-300 dark:border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Net Cash Flow</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {isHydrated ? formatCurrency(expenseView === 'monthly' ? (property.rent?.monthlyRent || 0) - (property.monthlyExpenses?.total || 0) : (property.rent?.annualRent || 0) - ((property.monthlyExpenses?.total || 0) * 12)) : '--'}
                      </span>
                    </div>
                  </div>
                </div>
                  </div>
                )}
              </div>



              {/* Historical Performance Chart */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6">
                <button
                  onClick={() => toggleSection('historicalPerformance')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <h2 className="text-xl font-semibold">Historical Performance</h2>
                  {openSections.historicalPerformance ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openSections.historicalPerformance && (
                  <div>
                  <div className="flex items-center gap-3">
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
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6">
                <button
                  onClick={() => toggleSection('currentTenants')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <h2 className="text-xl font-semibold">Current Tenants</h2>
                  {openSections.currentTenants ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openSections.currentTenants && (
                  <div>
                <div className="space-y-3">
                  {property.tenants.map((tenant, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-gray-600 dark:text-gray-400">{tenant.unit}</div>
                      <div className="text-emerald-600 dark:text-emerald-400">{formatCurrency(tenant.rent)}/mo</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Lease: {new Date(tenant.leaseStart).toLocaleDateString()} - {new Date(tenant.leaseEnd).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
                  </div>
                )}
              </div>

              {/* Annual Expense History Chart */}
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-6">
                <button
                  onClick={() => toggleSection('annualExpenseHistory')}
                  className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity"
                >
                  <h2 className="text-xl font-semibold">Annual Expense History</h2>
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


