"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { RequireAuth } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { useProperties, usePropertyContext } from "@/context/PropertyContext";
import { useAccount } from "@/context/AccountContext";
import { Download, X, ChevronDown, ChevronUp, Edit2, Save, XCircle, Plus, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';
import apiClient from "@/lib/api-client";

// Helper functions for historical data calculations
const getYearFromDateString = (value) => {
  if (!value) return NaN;
  const match = String(value).match(/^(\d{4})/);
  return match ? Number(match[1]) : NaN;
};

// Helper function to format date to YYYY-MM-DD (removes time component)
const formatDateOnly = (dateValue) => {
  if (!dateValue) return "N/A";
  // If it's already in YYYY-MM-DD format, return as is
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  // If it's an ISO string with time, extract just the date part
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  // Try to parse as Date and format
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // If parsing fails, return original value
  }
  return dateValue;
};

function getHistoricalIncome(property, year) {
  if (!property.tenants || property.tenants.length === 0) return 0;
  
  const targetYear = parseInt(year);
  const calendarYearStart = new Date(targetYear, 0, 1); // January 1st
  const calendarYearEnd = new Date(targetYear, 11, 31); // December 31st
  let totalIncome = 0;
  
  property.tenants.forEach(tenant => {
    const leaseStart = new Date(tenant.leaseStart);
    const leaseEnd = tenant.leaseEnd === 'Active' 
      ? new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
      : new Date(tenant.leaseEnd);
    
    // Check if tenant was active during any part of the calendar year
    if (leaseStart <= calendarYearEnd && leaseEnd >= calendarYearStart) {
      // Calculate the overlap between tenant lease and the calendar year
      const overlapStart = new Date(Math.max(leaseStart.getTime(), calendarYearStart.getTime()));
      const overlapEnd = new Date(Math.min(leaseEnd.getTime(), calendarYearEnd.getTime()));
      
      if (overlapStart <= overlapEnd) {
        // Calculate days in overlap for precise calculation
        const daysInOverlap = Math.max(0, Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1);
        
        // Calculate days in the month for proration
        const overlapStartMonth = overlapStart.getMonth();
        const overlapEndMonth = overlapEnd.getMonth();
        
        let monthlyIncome = 0;
        
        // Handle same month
        if (overlapStartMonth === overlapEndMonth) {
          const daysInMonth = new Date(overlapStart.getFullYear(), overlapStart.getMonth() + 1, 0).getDate();
          const prorationFactor = daysInOverlap / daysInMonth;
          monthlyIncome = tenant.rent * prorationFactor;
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
            
            monthlyIncome += tenant.rent * prorationFactor;
          }
        }
        
        totalIncome += monthlyIncome;
      }
    }
  });
  
  return totalIncome;
}

function getHistoricalExpenses(property, year) {
  if (!property.expenseHistory) return 0;
  
  const targetYear = parseInt(year);
  const yearExpenses = property.expenseHistory.filter(expense => {
    const expenseYear = getYearFromDateString(expense.date);
    return expenseYear === targetYear;
  });
  
  return yearExpenses.reduce((total, expense) => total + expense.amount, 0);
}

function getAvailableYears(property) {
  const years = new Set();
  const addYear = (value) => {
    const year = getYearFromDateString(value);
    if (!Number.isNaN(year)) {
      years.add(year);
    }
  };
  
  // Get years from expense history
  if (property.expenseHistory) {
    property.expenseHistory.forEach(expense => {
      addYear(expense.date);
    });
  }
  
  // Get years from tenant history
  if (property.tenants) {
    property.tenants.forEach(tenant => {
      const leaseStartYear = getYearFromDateString(tenant.leaseStart);
      const leaseEndYear = tenant.leaseEnd === 'Active' 
        ? new Date().getFullYear()
        : getYearFromDateString(tenant.leaseEnd);
      
      for (let year = leaseStartYear; year <= leaseEndYear; year++) {
        if (!Number.isNaN(year)) {
        years.add(year);
        }
      }
    });
  }
  
  return Array.from(years).sort((a, b) => a - b); // Sort ascending (oldest first)
}

// Shared DataRow component for displaying data rows
function DataRow({ label, value, isBold = false }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <span className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${isBold ? 'font-bold' : ''}`}>{label}</span>
      <span className={`text-sm text-gray-900 dark:text-gray-100 ${isBold ? 'font-bold' : ''}`}>{value || "N/A"}</span>
    </div>
  );
}

// Historical Data Display Component
function HistoricalDataDisplay({ property, expenseView, selectedYear: externalSelectedYear, onYearChange }) {
  const availableYears = [...getAvailableYears(property)].sort((a, b) => a - b);
  const [internalSelectedYear, setInternalSelectedYear] = useState(
    availableYears.length > 1 ? 'all' : (availableYears[0] ?? 'all')
  );

  useEffect(() => {
    if (availableYears.length === 0) {
      setInternalSelectedYear('all');
      return;
    }

    if (availableYears.length === 1) {
      setInternalSelectedYear(availableYears[0]);
      return;
    }

    setInternalSelectedYear(prev => {
      if (prev === 'all') {
        return prev;
      }

      if (typeof prev === 'number' && availableYears.includes(prev)) {
        return prev;
      }

      return 'all';
    });
  }, [availableYears]);
  
  // Use external year if provided, otherwise use internal state
  const selectedYear = externalSelectedYear !== undefined ? externalSelectedYear : internalSelectedYear;
  const setSelectedYear = onYearChange || setInternalSelectedYear;

  if (availableYears.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        <div className="text-sm">No historical data available</div>
      </div>
    );
  }

  const showAllYears = selectedYear === 'all';
  const yearsToDisplay = showAllYears
    ? availableYears
    : (typeof selectedYear === 'number' && availableYears.includes(selectedYear))
      ? [selectedYear]
      : availableYears;

  if (yearsToDisplay.length === 0) {
  return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        <div className="text-sm">No historical data available</div>
      </div>
    );
  }

  const snapshots = yearsToDisplay.map((year) => {
    const income = getHistoricalIncome(property, year);
    const expenses = getHistoricalExpenses(property, year);

    const expenseBreakdown = (property.expenseHistory || [])
      .filter(expense => getYearFromDateString(expense.date) === year)
      .reduce((acc, expense) => {
        const category = expense.category;
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += expense.amount;
        return acc;
      }, {});

    return {
      year,
      income,
      expenses,
      netIncome: income - expenses,
      expenseBreakdown,
    };
  });

  if (showAllYears) {
    const categorySet = new Set();
    snapshots.forEach(snapshot => {
      Object.keys(snapshot.expenseBreakdown).forEach(category => categorySet.add(category));
    });
    const sortedCategories = Array.from(categorySet).sort();

    const formatValue = (amount) =>
      `$${(
        expenseView === 'monthly'
          ? amount / 12
          : amount
      ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-200">Category</th>
              {snapshots.map(snapshot => (
                <th
                  key={`header-${snapshot.year}`}
                  className="py-2 px-4 font-semibold text-gray-700 dark:text-gray-200 text-right"
                >
                  {snapshot.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            <tr>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">Rent</td>
              {snapshots.map(snapshot => (
                <td key={`rent-${snapshot.year}`} className="py-2 px-4 text-right text-gray-900 dark:text-gray-100">
                  {formatValue(snapshot.income)}
                </td>
              ))}
            </tr>
            {sortedCategories.map(category => (
              <tr key={`category-${category}`}>
                <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{category}</td>
                {snapshots.map(snapshot => {
                  const amount = snapshot.expenseBreakdown[category] || 0;
                  return (
                    <td key={`category-${category}-${snapshot.year}`} className="py-2 px-4 text-right text-gray-900 dark:text-gray-100">
                      {formatValue(amount)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="py-2 pr-4 font-semibold text-gray-900 dark:text-gray-100">
                {expenseView === 'monthly' ? 'Total Monthly Expenses' : 'Total Annual Expenses'}
              </td>
              {snapshots.map(snapshot => (
                <td key={`total-exp-${snapshot.year}`} className="py-2 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {formatValue(snapshot.expenses)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold text-gray-900 dark:text-gray-100">
                {expenseView === 'monthly' ? 'Monthly Net Income' : 'Annual Net Income'}
              </td>
              {snapshots.map(snapshot => (
                <td key={`net-${snapshot.year}`} className="py-2 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {formatValue(snapshot.netIncome)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {snapshots.map((snapshot, index) => (
        <div key={snapshot.year} className="space-y-4">
          {showAllYears && (
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {snapshot.year}
              </span>
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {expenseView === 'monthly' ? 'Monthly View' : 'Annual View'}
              </span>
            </div>
          )}

      {/* Historical Income */}
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Income</div>
        <DataRow 
          label={expenseView === 'monthly' ? 'Monthly Rent' : 'Annual Rent'} 
              value={`$${expenseView === 'monthly' ? (snapshot.income / 12).toLocaleString() : snapshot.income.toLocaleString()}`} 
        />
        <DataRow 
          label={expenseView === 'monthly' ? 'Total Monthly Revenue' : 'Total Annual Revenue'} 
              value={`$${expenseView === 'monthly' ? (snapshot.income / 12).toLocaleString() : snapshot.income.toLocaleString()}`} 
          isBold={true}
        />
      </div>

      {/* Separator */}
      <div className="py-2"></div>

      {/* Historical Expenses */}
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expenses</div>
        {property.expenseHistory && property.expenseHistory.length > 0 ? (
          <>
                {Object.entries(snapshot.expenseBreakdown).map(([category, amount]) => (
              <DataRow 
                    key={`${snapshot.year}-${category}`}
                label={category} 
                    value={`$${expenseView === 'monthly'
                      ? (amount / 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
              />
            ))}
            <DataRow 
              label={expenseView === 'monthly' ? 'Total Monthly Expenses' : 'Total Annual Expenses'} 
                  value={`$${expenseView === 'monthly'
                    ? (snapshot.expenses / 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : snapshot.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
              isBold={true}
            />
          </>
        ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">No expense data for {snapshot.year}</div>
        )}
      </div>

      {/* Net Income */}
      <div className="py-2 border-t border-gray-200 dark:border-gray-700">
        <DataRow 
          label={expenseView === 'monthly' ? 'Monthly Net Income' : 'Annual Net Income'} 
              value={`$${expenseView === 'monthly'
                ? (snapshot.netIncome / 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : snapshot.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          isBold={true}
        />
      </div>

          {showAllYears && index < snapshots.length - 1 && (
            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-4"></div>
          )}
        </div>
      ))}
    </div>
  );
}

// PropertyCard component with collapsible sections
function PropertyCard({ property, onUpdate, onAddExpense, onAddTenant }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [expenseView, setExpenseView] = useState('monthly');
  const [tenantView, setTenantView] = useState('current');
  const [historicalView, setHistoricalView] = useState('current');
  const availableYears = [...getAvailableYears(property)].sort((a, b) => a - b);
  const [selectedYear, setSelectedYear] = useState(() => {
    if (availableYears.length === 0) return 'all';
    if (availableYears.length === 1) return availableYears[0];
    return 'all';
  });

  const clonePropertyData = (value) => {
    const structuredCloneFn = (globalThis).structuredClone;
    if (typeof structuredCloneFn === "function") {
      return structuredCloneFn(value);
    }
    return JSON.parse(JSON.stringify(value));
  };

  const getValueAtPath = (obj, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((acc, key) => {
      if (acc === null || acc === undefined) return undefined;
      return acc[key];
    }, obj);
  };

  const setValueAtPath = (obj, path, value) => {
    if (!path) return obj;
    const keys = path.split('.');
    const base = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
    let current = base;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const next = current[key];
      if (Array.isArray(next)) {
        current[key] = [...next];
      } else if (next && typeof next === 'object') {
        current[key] = { ...next };
      } else {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return base;
  };

  useEffect(() => {
    setSelectedYear(prev => {
      if (availableYears.length === 0) {
        return 'all';
      }

      if (availableYears.length === 1) {
        return availableYears[0];
      }

      if (prev === 'all') {
        return 'all';
      }

      if (typeof prev === 'number' && availableYears.includes(prev)) {
        return prev;
      }

      return 'all';
    });
  }, [availableYears]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedData(clonePropertyData(property));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleSave = () => {
    const payload =
      editedData && Object.keys(editedData).length > 0
        ? clonePropertyData(editedData)
        : clonePropertyData(property);

    if (!payload.rent) {
      payload.rent = { monthlyRent: 0, annualRent: 0 };
    }
    const monthlyRent = Number(payload.rent.monthlyRent || 0);
    payload.rent.monthlyRent = monthlyRent;
    payload.rent.annualRent = Number(payload.rent.annualRent || monthlyRent * 12);

    if (!payload.monthlyExpenses) {
      payload.monthlyExpenses = {};
    }

    const operatingExpenseKeys = [
      "advertising",
      "insurance",
      "officeExpenses",
      "professionalFees",
      "management",
      "maintenance",
      "propertyTax",
      "travel",
      "utilities",
      "motorVehicle",
      "condoFees",
    ];

    const monthlyExpensesRecord = payload.monthlyExpenses;
    operatingExpenseKeys.forEach((key) => {
      monthlyExpensesRecord[key] = Number(monthlyExpensesRecord[key] || 0);
    });
    monthlyExpensesRecord.mortgageInterest = Number(monthlyExpensesRecord.mortgageInterest || 0);
    monthlyExpensesRecord.mortgagePrincipal = Number(monthlyExpensesRecord.mortgagePrincipal || 0);
    monthlyExpensesRecord.mortgagePayment = Number(monthlyExpensesRecord.mortgagePayment || 0);

    const operatingTotal = operatingExpenseKeys.reduce(
      (sum, key) => sum + (monthlyExpensesRecord[key] || 0),
      0
    );
    monthlyExpensesRecord.total = Number(operatingTotal.toFixed(2));

    payload.monthlyPropertyTax = monthlyExpensesRecord.propertyTax || 0;
    payload.monthlyCondoFees = monthlyExpensesRecord.condoFees || 0;
    payload.monthlyInsurance = monthlyExpensesRecord.insurance || 0;
    payload.monthlyMaintenance = monthlyExpensesRecord.maintenance || 0;
    payload.monthlyProfessionalFees = monthlyExpensesRecord.professionalFees || 0;
    payload.monthlyUtilities = monthlyExpensesRecord.utilities || 0;

    if (onUpdate) {
      onUpdate(property.id, payload);
    }

    setIsEditing(false);
    setEditedData({});
  };

  const updateField = (path, value, type = "text") => {
    if (!path) return;
    setEditedData(prev => {
      const base =
        prev && Object.keys(prev).length > 0 ? prev : clonePropertyData(property);
      let parsedValue;
      if (type === "number") {
        parsedValue = value === "" ? "" : Number(value);
      } else if (type === "checkbox") {
        parsedValue = Boolean(value);
      } else {
        parsedValue = value;
      }
      return setValueAtPath(base, path, parsedValue);
    });
  };

  const Section = ({ title, sectionKey, children }) => {
    const isExpanded = expandedSections[sectionKey];
    return (
      <div className="border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {isExpanded && (
          <div className="p-4 pt-0 bg-gray-50 dark:bg-gray-800/50">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Editable DataRow component for PropertyCard (with editing capabilities)
  const EditableDataRow = ({ label, value, editable = false, field = "", type = "text", isBold = false }) => {
    const rawInputValue = field ? getValueAtPath(editedData, field) : undefined;
    const inputValue = rawInputValue === undefined || rawInputValue === null 
      ? (type === "checkbox" ? false : "") 
      : rawInputValue;
    const inputString = inputValue === "" ? "" : String(inputValue);

    return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <span className={`text-sm font-medium text-gray-600 dark:text-gray-400 ${isBold ? 'font-bold' : ''}`}>{label}</span>
      {isEditing && editable ? (
        type === "checkbox" ? (
          <input
            type="checkbox"
            checked={inputValue === true || inputValue === "true" || inputValue === 1}
            onChange={(e) => updateField(field, e.target.checked, type)}
            className="w-4 h-4 text-[#205A3E] border-gray-300 rounded focus:ring-[#205A3E]"
          />
        ) : (
          <input
            type={type}
            value={type === "number" ? inputString : inputString}
            onChange={(e) => updateField(field, e.target.value, type)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#205A3E]"
          />
        )
      ) : (
        <span className={`text-sm text-gray-900 dark:text-gray-100 ${isBold ? 'font-bold' : ''}`}>
          {type === "checkbox" ? (value ? "Yes" : "No") : (value || "N/A")}
        </span>
      )}
    </div>
  );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-6 bg-gradient-to-r from-[#205A3E] to-[#2a7050] text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{property.name || property.nickname}</h2>
            <p className="text-sm opacity-90 mt-1">{property.address}</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Save changes"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Cancel editing"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Edit property"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <Section title="Property Details" sectionKey="propertyDetails">
        <div className="space-y-1">
          <EditableDataRow label="Property Name" value={property.name || property.nickname} editable field="name" />
          <EditableDataRow label="Address" value={property.address} editable field="address" />
          <EditableDataRow label="Property Type" value={property.propertyType || property.type} editable field="propertyType" />
          <EditableDataRow label="Year Built" value={property.yearBuilt} editable field="yearBuilt" type="number" />
          <EditableDataRow label="Square Footage" value={property.size || property.squareFootage} editable field="size" type="number" />
          <EditableDataRow label="Bedrooms" value={property.bedrooms?.[0] || property.bedrooms} editable field="bedrooms" type="number" />
          <EditableDataRow label="Bathrooms" value={property.bathrooms?.[0] || property.bathrooms} editable field="bathrooms" type="number" />
          <EditableDataRow label="Dens" value={property.dens?.[0] || property.dens} editable field="dens" type="number" />
          <EditableDataRow label="Units" value={property.units || 1} editable field="units" type="number" />
          <EditableDataRow label="Principal Residence" value={property.isPrincipalResidence || false} editable field="isPrincipalResidence" type="checkbox" />
        </div>
      </Section>

      <Section title="Purchase Information" sectionKey="purchaseInfo">
        <div className="space-y-1">
          <EditableDataRow label="Purchase Date" value={formatDateOnly(property.purchaseDate)} editable field="purchaseDate" type="date" />
          <EditableDataRow 
            label="Purchase Price" 
            value={`$${(property.purchasePrice || 0).toLocaleString()}`} 
            editable 
            field="purchasePrice" 
            type="number" 
          />
          <EditableDataRow 
            label="Original Mortgage" 
            value={`$${(property.mortgage?.originalAmount || 0).toLocaleString()}`} 
            editable 
            field="mortgage.originalAmount" 
            type="number" 
          />
          <EditableDataRow 
            label="Down Payment" 
            value={`$${((property.purchasePrice || 0) - (property.mortgage?.originalAmount || 0)).toLocaleString()}`} 
          />
          <EditableDataRow 
            label="Closing Costs" 
            value={`$${(property.closingCosts || 0).toLocaleString()}`} 
            editable 
            field="closingCosts" 
            type="number" 
          />
          <EditableDataRow 
            label="Initial Renovations" 
            value={`$${(property.initialRenovations || 0).toLocaleString()}`} 
            editable 
            field="initialRenovations" 
            type="number" 
          />
          <EditableDataRow 
            label="Total Purchase Cost" 
            value={`$${(((property.purchasePrice || 0) - (property.mortgage?.originalAmount || 0)) + (property.closingCosts || 0) + (property.initialRenovations || 0)).toLocaleString()}`} 
          />
          <EditableDataRow 
            label="Current Market Value" 
            value={`$${(property.currentMarketValue || property.currentValue || 0).toLocaleString()}`} 
            editable 
            field="currentMarketValue" 
            type="number" 
          />
          <EditableDataRow 
            label="Appreciation" 
            value={`$${(property.appreciation || 0).toLocaleString()}`} 
          />
        </div>
      </Section>

      <Section title="Mortgage Details" sectionKey="mortgageDetails">
        <div className="space-y-1">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Mortgage information can be edited on the{" "}
              <a 
                href="/mortgages" 
                className="underline font-semibold hover:text-blue-900 dark:hover:text-blue-100"
              >
                Mortgages page
              </a>
              .
            </p>
          </div>
          <EditableDataRow label="Lender" value={property.mortgage?.lender} />
          <EditableDataRow 
            label="Original Amount" 
            value={`$${(property.mortgage?.originalAmount || 0).toLocaleString()}`} 
          />
          <EditableDataRow 
            label="Interest Rate" 
            value={`${((property.mortgage?.interestRate || 0) * 100).toFixed(2)}%`} 
          />
          <EditableDataRow label="Rate Type" value={property.mortgage?.rateType} />
          <EditableDataRow 
            label="Amortization (Years)" 
            value={property.mortgage?.amortizationYears?.toFixed(1)} 
          />
          <EditableDataRow label="Term (Months)" value={property.mortgage?.termMonths} />
          <EditableDataRow label="Payment Frequency" value={property.mortgage?.paymentFrequency} />
          <EditableDataRow label="Start Date" value={formatDateOnly(property.mortgage?.startDate)} />
        </div>
      </Section>

      <Section title="Income & Expenses" sectionKey="incomeExpenses">
        <div className="space-y-1">
          {/* Note about annual expenses */}
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Expenses incurred annually are averaged out over the year.
            </p>
          </div>
          {/* View Toggle and Add Expense Button */}
          <div className="flex items-center justify-between mb-4">
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
            <button
              onClick={() => onAddExpense && onAddExpense(property)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#205A3E] text-white rounded-lg hover:bg-[#1a4a32] transition-colors"
              title="Add expense"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>

          {/* Historical Data Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Data:</span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setHistoricalView('current')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  historicalView === 'current'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Current
              </button>
              <button
                onClick={() => setHistoricalView('historical')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  historicalView === 'historical'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Historical
              </button>
            </div>
          </div>

          {/* Year Selector - shown when Historical view is selected */}
          {historicalView === 'historical' && availableYears.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Year(s):</span>
              <select
                value={selectedYear === 'all' ? 'all' : selectedYear.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedYear(value === 'all' ? 'all' : parseInt(value, 10));
                }}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#205A3E]"
              >
                <option value="all">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {historicalView === 'current' ? (
            /* Current Data Display */
            <>
              {/* Income */}
              <EditableDataRow 
                label={expenseView === 'monthly' ? 'Monthly Rent' : 'Annual Rent'} 
                value={`$${expenseView === 'monthly' ? (property.rent?.monthlyRent || 0).toLocaleString() : (property.rent?.annualRent || 0).toLocaleString()}`} 
                editable={expenseView === 'monthly'}
                field="rent.monthlyRent"
                type="number" 
              />
              <EditableDataRow 
                label={expenseView === 'monthly' ? 'Total Monthly Revenue' : 'Total Annual Revenue'} 
                value={`$${expenseView === 'monthly' ? (property.rent?.monthlyRent || 0).toLocaleString() : (property.rent?.annualRent || 0).toLocaleString()}`} 
                isBold={true}
              />

              {/* Separator */}
              <div className="py-2"></div>

              {/* Expenses */}
              <EditableDataRow 
                label="Advertising" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.advertising || 0) : ((property.monthlyExpenses?.advertising || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.advertising"
                type="number"
              />
              <EditableDataRow 
                label="Insurance" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.insurance || 0) : ((property.monthlyExpenses?.insurance || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.insurance"
                type="number"
              />
              <EditableDataRow 
                label="Interest & Banking Charges" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.mortgageInterest || 0) : ((property.monthlyExpenses?.mortgageInterest || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.mortgageInterest"
                type="number"
              />
              <EditableDataRow 
                label="Office Expenses" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.officeExpenses || 0) : ((property.monthlyExpenses?.officeExpenses || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.officeExpenses"
                type="number"
              />
              <EditableDataRow 
                label="Professional Fees" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.professionalFees || 0) : ((property.monthlyExpenses?.professionalFees || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.professionalFees"
                type="number"
              />
              <EditableDataRow 
                label="Management & Administration" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.management || 0) : ((property.monthlyExpenses?.management || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.management"
                type="number"
              />
              <EditableDataRow 
                label="Repairs & Maintenance" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.maintenance || 0) : ((property.monthlyExpenses?.maintenance || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.maintenance"
                type="number"
              />
              <EditableDataRow 
                label="Property Taxes" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.propertyTax || 0) : ((property.monthlyExpenses?.propertyTax || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.propertyTax"
                type="number"
              />
              <EditableDataRow 
                label="Travel" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.travel || 0) : ((property.monthlyExpenses?.travel || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.travel"
                type="number"
              />
              <EditableDataRow 
                label="Utilities" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.utilities || 0) : ((property.monthlyExpenses?.utilities || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.utilities"
                type="number"
              />
              <EditableDataRow 
                label="Motor Vehicle Expense" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.motorVehicle || 0) : ((property.monthlyExpenses?.motorVehicle || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.motorVehicle"
                type="number"
              />
              <EditableDataRow 
                label="Other Rental Expense (incl. Condo Fees & Broker Fees)" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.condoFees || 0) : ((property.monthlyExpenses?.condoFees || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.condoFees"
                type="number"
              />
              <EditableDataRow 
                label="Mortgage (Principal)" 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.mortgagePrincipal || 0) : ((property.monthlyExpenses?.mortgagePrincipal || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                editable={expenseView === 'monthly'}
                field="monthlyExpenses.mortgagePrincipal"
                type="number"
              />
              <EditableDataRow 
                label={expenseView === 'monthly' ? 'Total Monthly Expenses' : 'Total Annual Expenses'} 
                value={`$${(expenseView === 'monthly' ? (property.monthlyExpenses?.total || 0) : ((property.monthlyExpenses?.total || 0) * 12)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                isBold={true}
              />
            </>
          ) : (
            /* Historical Data Display */
            <HistoricalDataDisplay 
              property={property} 
              expenseView={expenseView}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
            />
          )}
        </div>
      </Section>

      <Section title="Tenant Information" sectionKey="tenantInfo">
        <div className="space-y-1">
          {/* View Toggle and Add Tenant Button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setTenantView('current')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    tenantView === 'current'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Current
                </button>
                <button
                  onClick={() => setTenantView('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    tenantView === 'all'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Tenant History
                </button>
              </div>
            </div>
            <button
              onClick={() => onAddTenant && onAddTenant(property)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#205A3E] text-white rounded-lg hover:bg-[#1a4a32] transition-colors"
              title="Add tenant"
            >
              <Plus className="w-4 h-4" />
              Add Tenant
            </button>
          </div>

          {tenantView === 'current' ? (
            /* Current Tenant */
            <>
              {(() => {
                const activeTenant = property.tenants?.find(t => t.status === 'Active') || property.tenant;
                const tenantIndex = property.tenants?.findIndex(t => t.status === 'Active') ?? 0;
                return (
                  <>
                    <EditableDataRow 
                      label="Tenant Name" 
                      value={activeTenant?.name || 'N/A'} 
                      editable 
                      field={`tenants.${tenantIndex}.name`}
                    />
                    <EditableDataRow 
                      label="Unit" 
                      value={activeTenant?.unit || 'N/A'} 
                      editable 
                      field={`tenants.${tenantIndex}.unit`}
                    />
                    <EditableDataRow 
                      label="Lease Start Date" 
                      value={activeTenant?.leaseStartDate || activeTenant?.leaseStart || 'N/A'} 
                      editable 
                      field={`tenants.${tenantIndex}.leaseStart`}
                      type="date"
                    />
                    <EditableDataRow 
                      label="Lease End Date" 
                      value={activeTenant?.leaseEndDate || activeTenant?.leaseEnd || 'N/A'} 
                      editable 
                      field={`tenants.${tenantIndex}.leaseEnd`}
                      type="date"
                    />
                    <EditableDataRow 
                      label="Monthly Rent" 
                      value={`$${(activeTenant?.rent || 0).toLocaleString()}`} 
                      editable 
                      field={`tenants.${tenantIndex}.rent`}
                      type="number"
                    />
                    <EditableDataRow label="Key Deposit" value="" />
                    <EditableDataRow 
                      label="Status" 
                      value={activeTenant?.status || 'N/A'} 
                      editable 
                      field={`tenants.${tenantIndex}.status`}
                    />
                  </>
                );
              })()}
            </>
          ) : (
            /* All Tenants */
            <div className="space-y-4">
              {property.tenants && property.tenants.length > 0 ? (
                property.tenants.map((tenant, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Tenant {index + 1}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          tenant.status === 'Active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {tenant.status}
                        </span>
                      </div>
                      <EditableDataRow 
                        label="Name" 
                        value={tenant.name} 
                        editable 
                        field={`tenants.${index}.name`}
                      />
                      <EditableDataRow 
                        label="Unit" 
                        value={tenant.unit} 
                        editable 
                        field={`tenants.${index}.unit`}
                      />
                      <EditableDataRow 
                        label="Lease Start" 
                        value={tenant.leaseStart} 
                        editable 
                        field={`tenants.${index}.leaseStart`}
                        type="date"
                      />
                      <EditableDataRow 
                        label="Lease End" 
                        value={tenant.leaseEnd} 
                        editable 
                        field={`tenants.${index}.leaseEnd`}
                        type="date"
                      />
                      <EditableDataRow 
                        label="Monthly Rent" 
                        value={`$${(tenant.rent || 0).toLocaleString()}`} 
                        editable 
                        field={`tenants.${index}.rent`}
                        type="number"
                      />
                      <EditableDataRow label="Key Deposit" value="" />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${tenant.name || 'this tenant'}?`)) {
                              const updatedTenants = property.tenants.filter((_, idx) => idx !== index);
                              const updatedProperty = {
                                ...property,
                                tenants: updatedTenants
                              };
                              onUpdate(property.id, updatedProperty);
                            }
                          }}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center gap-1"
                          title="Remove tenant"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <div className="text-sm">No tenant data available</div>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title="Property Notes" sectionKey="propertyNotes">
        <div className="space-y-1">
          <EditableDataRow label="Appliance Details" value="" editable field="applianceDetails" type="text" />
          <EditableDataRow label="Paint Details" value="" editable field="paintDetails" type="text" />
          <EditableDataRow label="Flooring Details" value="" editable field="flooringDetails" type="text" />
          <EditableDataRow label="Kitchen Features" value="" editable field="kitchenFeatures" type="text" />
          <EditableDataRow label="Bathroom Features" value="" editable field="bathroomFeatures" type="text" />
          <EditableDataRow label="Special Features" value="" editable field="specialFeatures" type="text" />
          <EditableDataRow label="Maintenance Notes" value="" editable field="maintenanceNotes" type="text" />
          <EditableDataRow label="Upgrade History" value="" editable field="upgradeHistory" type="text" />
          <EditableDataRow label="General Notes" value="" editable field="generalNotes" type="text" />
        </div>
      </Section>
    </div>
  );
}

export default function DataPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const properties = useProperties(); // Get properties from context
  const { updateProperty } = usePropertyContext();
  const { currentAccountId, refreshAccounts } = useAccount();
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [selectedPropertyForExpense, setSelectedPropertyForExpense] = useState(null);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [selectedPropertyForTenant, setSelectedPropertyForTenant] = useState(null);

  const handlePropertyUpdate = async (propertyId, updatedData) => {
    try {
      // Prepare the data for the API - map frontend structure to API schema
      const apiData = {
        nickname: updatedData.name || updatedData.nickname,
        address: updatedData.address,
        purchasePrice: updatedData.purchasePrice,
        purchaseDate: updatedData.purchaseDate,
        closingCosts: updatedData.closingCosts,
        renovationCosts: updatedData.renovationCosts,
        initialRenovations: updatedData.initialRenovations,
        currentMarketValue: updatedData.currentMarketValue || updatedData.currentValue,
        yearBuilt: updatedData.yearBuilt,
        propertyType: updatedData.propertyType || updatedData.type,
        size: updatedData.size || updatedData.squareFootage,
        unitConfig: updatedData.unitConfig,
        propertyData: {
          rent: updatedData.rent,
          mortgage: updatedData.mortgage,
          monthlyExpenses: updatedData.monthlyExpenses,
          tenants: updatedData.tenants,
          expenseHistory: updatedData.expenseHistory,
          bedrooms: updatedData.bedrooms,
          bathrooms: updatedData.bathrooms,
          units: updatedData.units,
          isPrincipalResidence: updatedData.isPrincipalResidence || false,
          // Include any other nested data
          ...(updatedData.propertyData || {})
        }
      };

      // Save to API
      const response = await apiClient.updateProperty(propertyId, apiData);
      
      if (response.success) {
        // Update local state after successful API call
        updateProperty(propertyId, updatedData);
        addToast("Property updated successfully!", { type: "success" });
      } else {
        throw new Error(response.error || "Failed to update property");
      }
    } catch (error) {
      console.error("Failed to update property", error);
      addToast(`Failed to update property: ${error.message}`, { type: "error" });
    }
  };


  return (
    <RequireAuth>
      <Layout>
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Property Data</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                View and manage comprehensive property information and financial details.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsExcelModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
          </div>

          {/* Property Cards Grid */}
          {properties && properties.length > 0 ? (
            <div className="space-y-6">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onUpdate={handlePropertyUpdate}
                  onAddExpense={(property) => {
                    setSelectedPropertyForExpense(property);
                    setShowAddExpenseModal(true);
                  }}
                  onAddTenant={(property) => {
                    setSelectedPropertyForTenant(property);
                    setShowAddTenantModal(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No properties found. Add properties on the My Properties page.
              </p>
              <Button
                onClick={() => window.location.href = '/my-properties'}
                className="flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Go to My Properties
              </Button>
            </div>
          )}

          {/* Excel Export Modal */}
          {isExcelModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Export to Excel
                  </h2>
                  <button
                    onClick={() => setIsExcelModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Export Property Data</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Download your property data as an Excel file. To add new properties, please use the My Properties page.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        // Export current properties to Excel
                        const exportData = properties.map(property => ({
                          name: property.name || property.nickname,
                          address: property.address,
                          propertyType: property.propertyType || property.type,
                          purchasePrice: property.purchasePrice,
                          purchaseDate: property.purchaseDate,
                          currentMarketValue: property.currentMarketValue || property.currentValue,
                          yearBuilt: property.yearBuilt,
                          size: property.size || property.squareFootage,
                          unitConfig: property.unitConfig,
                          monthlyRent: property.rent?.monthlyRent || 0,
                          // Add other fields as needed
                        }));

                        const ws = XLSX.utils.json_to_sheet(exportData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Properties");
                        XLSX.writeFile(wb, `property_data_export_${new Date().toISOString().split('T')[0]}.xlsx`);
                        addToast("Property data exported successfully!", { type: "success" });
                        setIsExcelModalOpen(false);
                      }}
                      className="flex items-center gap-2 w-full"
                    >
                      <Download className="w-4 h-4" />
                      Export Properties
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>• Exports all current property data</p>
                    <p>• File will be downloaded to your device</p>
                    <p>• To add new properties, visit the My Properties page</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Expense Modal */}
          {showAddExpenseModal && selectedPropertyForExpense && (
            <AddExpenseModal
              property={selectedPropertyForExpense}
              onClose={() => {
                setShowAddExpenseModal(false);
                setSelectedPropertyForExpense(null);
              }}
              onSave={async (expenseData) => {
                try {
                  const response = await apiClient.createExpense(selectedPropertyForExpense.id, expenseData);
                  if (response.success) {
                    addToast("Expense added successfully!", { type: "success" });
                    // Refresh properties to show new expense
                    await refreshAccounts();
                    setShowAddExpenseModal(false);
                    setSelectedPropertyForExpense(null);
                  } else {
                    throw new Error(response.error || "Failed to add expense");
                  }
                } catch (error) {
                  console.error("Error adding expense:", error);
                  addToast(error.message || "Failed to add expense", { type: "error" });
                }
              }}
            />
          )}

          {/* Add Tenant Modal */}
          {showAddTenantModal && selectedPropertyForTenant && (
            <AddTenantModal
              property={selectedPropertyForTenant}
              onClose={() => {
                setShowAddTenantModal(false);
                setSelectedPropertyForTenant(null);
              }}
              onSave={async (tenantData) => {
                try {
                  // Add tenant to property's tenants array
                  const updatedTenants = [
                    ...(selectedPropertyForTenant.tenants || []),
                    tenantData
                  ];
                  const updatedProperty = {
                    ...selectedPropertyForTenant,
                    tenants: updatedTenants
                  };
                  await handlePropertyUpdate(selectedPropertyForTenant.id, updatedProperty);
                  setShowAddTenantModal(false);
                  setSelectedPropertyForTenant(null);
                } catch (error) {
                  console.error("Error adding tenant:", error);
                  addToast(error.message || "Failed to add tenant", { type: "error" });
                }
              }}
            />
          )}
        </div>
      </Layout>
    </RequireAuth>
  );
}

// Add Expense Modal Component
function AddExpenseModal({ property, onClose, onSave }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    description: ''
  });

  const expenseCategories = [
    'Property Tax',
    'Insurance',
    'Maintenance',
    'Repairs',
    'Utilities',
    'Professional Fees',
    'Management',
    'Advertising',
    'Travel',
    'Motor Vehicle',
    'Condo Fees',
    'Other'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return;
    }
    onSave({
      date: formData.date,
      amount: parseFloat(formData.amount),
      category: formData.category || null,
      description: formData.description || null
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Expense - {property.name || property.nickname}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              You can select any date, including past dates for historical expenses
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Select category (optional)</option>
              {expenseCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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

// Add Tenant Modal Component
function AddTenantModal({ property, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    leaseStart: new Date().toISOString().split('T')[0],
    leaseEnd: '',
    rent: '',
    status: 'Active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.rent) {
      return;
    }
    onSave({
      name: formData.name,
      unit: formData.unit || null,
      leaseStart: formData.leaseStart,
      leaseEnd: formData.leaseEnd || 'Active',
      rent: parseFloat(formData.rent) || 0,
      status: formData.status
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Tenant - {property.name || property.nickname}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tenant Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Unit
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Unit number or identifier"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lease Start *
              </label>
              <input
                type="date"
                value={formData.leaseStart}
                onChange={(e) => setFormData(prev => ({ ...prev, leaseStart: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lease End
              </label>
              <input
                type="date"
                value={formData.leaseEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, leaseEnd: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Leave empty for active"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monthly Rent *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.rent}
              onChange={(e) => setFormData(prev => ({ ...prev, rent: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#205A3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Past">Past</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Tenant
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}



