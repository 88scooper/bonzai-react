"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/api-client";
import { savePropertyDraft, getPropertyDraft, clearPropertyDraft } from "@/lib/onboarding-draft-storage";
import { normalizePaymentFrequency } from "@/lib/mortgage-validation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import DateInput from "@/components/DateInput";
import SelectInput from "@/components/SelectInput";
import { 
  Landmark, 
  UserCheck,
  BarChart3, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  X,
  Save,
  Loader2
} from "lucide-react";

const EXPENSE_CATEGORIES = [
  'Advertising',
  'Insurance',
  'Interest & Bank Charges',
  'Office Expenses',
  'Professional Fees',
  'Management & Administration',
  'Repairs & Maintenance',
  'Salaries, Wages, and Benefits',
  'Property Taxes',
  'Travel',
  'Utilities',
  'Motor Vehicle Expenses',
  'Other Expenses',
  'Condo Maintenance Fees',
  'Mortgage (Principal)'
];

const RATE_TYPES = ['FIXED', 'VARIABLE'];
const TERM_OPTIONS = [
  { value: '12', label: '12 months (1 year)' },
  { value: '24', label: '24 months (2 years)' },
  { value: '36', label: '36 months (3 years)' },
  { value: '48', label: '48 months (4 years)' },
  { value: '60', label: '60 months (5 years)' },
];
const AMORTIZATION_OPTIONS = [
  { value: '15', label: '15 years' },
  { value: '20', label: '20 years' },
  { value: '25', label: '25 years' },
  { value: '30', label: '30 years' },
];
const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly (12 payments/year)' },
  { value: 'SEMI_MONTHLY', label: 'Semi-monthly (24 payments/year)' },
  { value: 'BI_WEEKLY', label: 'Bi-weekly (26 payments/year)' },
  { value: 'ACCELERATED_BI_WEEKLY', label: 'Accelerated Bi-weekly (26 payments/year)' },
  { value: 'WEEKLY', label: 'Weekly (52 payments/year)' },
  { value: 'ACCELERATED_WEEKLY', label: 'Accelerated Weekly (52 payments/year)' },
];

export default function PropertyFinancialDataForm({
  propertyId,
  property,
  accountId,
  onComplete,
  onBack,
  onExit // New prop for exiting without completing
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null); // 'income' | 'mortgage' | 'expenses' | null
  const [sectionsSaved, setSectionsSaved] = useState({
    income: false,
    expenses: false,
    mortgage: false,
  });
  const autoSaveTimeoutRef = useRef(null);

  // Form state structure
  const [formData, setFormData] = useState({
    income: {
      tenants: [{ firstInitial: '', lastName: '' }], // Array of tenant objects with firstInitial and lastName
      monthlyRent: '',
      keyDeposit: '',
      leaseStartDate: new Date().toISOString().split('T')[0],
      leaseEndDate: '',
      status: 'Active',
    },
    mortgage: {
      lender: '',
      originalAmount: '',
      interestRate: '',
      rateType: 'FIXED',
      termMonths: '60',
      amortizationYears: '25',
      startDate: new Date().toISOString().split('T')[0],
      paymentFrequency: 'MONTHLY',
      currentBalance: '', // Optional field for existing mortgages
    },
    expensesByYear: {}, // { [year]: { revenue: '', expenses: { [category]: '' } } }
  });

  // Validation errors
  const [errors, setErrors] = useState({
    income: {},
    mortgage: {},
    expenses: {},
  });

  // Get default year from property closing date
  const getDefaultYear = () => {
    if (property?.purchaseDate) {
      const purchaseDate = new Date(property.purchaseDate);
      return purchaseDate.getFullYear().toString();
    }
    return new Date().getFullYear().toString();
  };

  // Get years from purchase date to current year (inclusive)
  const getYearsFromPurchaseToCurrent = () => {
    const purchaseYear = parseInt(getDefaultYear());
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = purchaseYear; year <= currentYear; year++) {
      years.push(year.toString());
    }
    return years;
  };

  // Initialize year data structure
  const initializeYearData = (year) => {
    const expenses = {};
    const expensePaymentFrequencies = {};
    EXPENSE_CATEGORIES.forEach(category => {
      expenses[category] = '';
      expensePaymentFrequencies[category] = 'Annual'; // Default to Annual
    });
    return {
      revenue: '',
      expenses: expenses,
      expensePaymentFrequencies: expensePaymentFrequencies
    };
  };

  // Restore draft on mount and initialize years based on purchase date if needed
  useEffect(() => {
    // Only proceed if we have property data to determine purchase year
    if (!property && propertyId) {
      // Property not loaded yet, wait for it
      return;
    }
    
    if (propertyId) {
      const draft = getPropertyDraft(propertyId);
      if (draft) {
        // Migrate old tenantName/tenantNames to tenants array if needed
        if (draft.income) {
          // Migrate from old tenantName/tenantNames format to new tenants format
          if (!draft.income.tenants) {
            let tenantArray = [];
            if (draft.income.tenantName) {
              // Single tenant name - try to split into first initial and last name
              const nameParts = String(draft.income.tenantName).trim().split(/\s+/);
              if (nameParts.length > 0) {
                const firstInitial = nameParts[0].charAt(0).toUpperCase();
                const lastName = nameParts.slice(1).join(' ') || nameParts[0].substring(1) || '';
                tenantArray.push({ firstInitial, lastName });
              }
            } else if (draft.income.tenantNames && Array.isArray(draft.income.tenantNames)) {
              // Array of tenant names - convert each
              tenantArray = draft.income.tenantNames.map(name => {
                const nameParts = String(name || '').trim().split(/\s+/);
                if (nameParts.length > 0) {
                  const firstInitial = nameParts[0].charAt(0).toUpperCase();
                  const lastName = nameParts.slice(1).join(' ') || nameParts[0].substring(1) || '';
                  return { firstInitial, lastName };
                }
                return { firstInitial: '', lastName: '' };
              }).filter(t => t.firstInitial || t.lastName);
            }
            if (tenantArray.length > 0) {
              draft.income.tenants = tenantArray;
            } else {
              draft.income.tenants = [{ firstInitial: '', lastName: '' }];
            }
            // Clean up old fields
            delete draft.income.tenantName;
            delete draft.income.tenantNames;
          }
          // Ensure tenants is always an array with at least one entry
          if (!draft.income.tenants || !Array.isArray(draft.income.tenants)) {
            draft.income.tenants = [{ firstInitial: '', lastName: '' }];
          }
        }
        
        // Migrate old expenses array to expensesByYear if needed
        if (draft.expenses && Array.isArray(draft.expenses) && draft.expenses.length > 0 && !draft.expensesByYear) {
          const migrated = { expensesByYear: {} };
          draft.expenses.forEach(expense => {
            const year = expense.year || getDefaultYear();
            if (!migrated.expensesByYear[year]) {
              const expenses = {};
              const expensePaymentFrequencies = {};
              EXPENSE_CATEGORIES.forEach(category => {
                expenses[category] = '';
                expensePaymentFrequencies[category] = 'Annual';
              });
              migrated.expensesByYear[year] = {
                revenue: '',
                expenses: expenses,
                expensePaymentFrequencies: expensePaymentFrequencies
              };
            }
            if (expense.category && expense.amount) {
              migrated.expensesByYear[year].expenses[expense.category] = expense.amount;
            }
          });
          draft.expensesByYear = migrated.expensesByYear;
          delete draft.expenses;
        }
        
        // Ensure expensePaymentFrequencies exists for all years
        if (draft.expensesByYear) {
          Object.keys(draft.expensesByYear).forEach(year => {
            if (!draft.expensesByYear[year].expensePaymentFrequencies) {
              const expensePaymentFrequencies = {};
              EXPENSE_CATEGORIES.forEach(category => {
                expensePaymentFrequencies[category] = 'Annual';
              });
              draft.expensesByYear[year].expensePaymentFrequencies = expensePaymentFrequencies;
            }
          });
        }
        
        // If no years exist in expensesByYear, initialize with purchase year to current year
        if (!draft.expensesByYear || Object.keys(draft.expensesByYear).length === 0) {
          const years = getYearsFromPurchaseToCurrent();
          draft.expensesByYear = {};
          years.forEach(year => {
            draft.expensesByYear[year] = initializeYearData(year);
          });
        }
        
        setFormData(draft);
        addToast("Draft restored", { type: "success", duration: 2000 });
      } else {
        // No draft exists - initialize with purchase year to current year
        // Also load keyDeposit from property if it exists
        const years = getYearsFromPurchaseToCurrent();
        const propertyData = property?.property_data || property?.propertyData || {};
        setFormData(prev => {
          // Only initialize if expensesByYear is empty
          const newExpensesByYear = {};
          if (!prev.expensesByYear || Object.keys(prev.expensesByYear).length === 0) {
            years.forEach(year => {
              newExpensesByYear[year] = initializeYearData(year);
            });
          } else {
            Object.assign(newExpensesByYear, prev.expensesByYear);
          }
          return {
            ...prev,
            income: {
              ...prev.income,
              ...(propertyData.keyDeposit && { keyDeposit: propertyData.keyDeposit.toString() }),
            },
            expensesByYear: Object.keys(newExpensesByYear).length > 0 ? newExpensesByYear : prev.expensesByYear
          };
        });
      }
    } else if (property) {
      // No propertyId yet but have property - initialize with purchase year to current year
      // Also load keyDeposit from property if it exists
      const years = getYearsFromPurchaseToCurrent();
      const propertyData = property?.property_data || property?.propertyData || {};
      setFormData(prev => {
        // Only initialize if expensesByYear is empty
        const newExpensesByYear = {};
        if (!prev.expensesByYear || Object.keys(prev.expensesByYear).length === 0) {
          years.forEach(year => {
            newExpensesByYear[year] = initializeYearData(year);
          });
        } else {
          Object.assign(newExpensesByYear, prev.expensesByYear);
        }
        return {
          ...prev,
          income: {
            ...prev.income,
            ...(propertyData.keyDeposit && { keyDeposit: propertyData.keyDeposit.toString() }),
          },
          expensesByYear: Object.keys(newExpensesByYear).length > 0 ? newExpensesByYear : prev.expensesByYear
        };
      });
    }
  }, [propertyId, property]);

  // Auto-save with debounce
  const saveDraft = useCallback(() => {
    if (!propertyId) return;
    
    setSavingDraft(true);
    const success = savePropertyDraft(propertyId, formData);
    if (success) {
      setDraftSaved(true);
      // Clear the saved indicator after 3 seconds
      setTimeout(() => setDraftSaved(false), 3000);
    }
    setSavingDraft(false);
  }, [propertyId, formData]);

  // Debounced auto-save
  useEffect(() => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1.5 seconds debounce)
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 1500);

    // Cleanup on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, saveDraft]);

  // Manual save draft handler - saves draft and exits wizard
  const handleSaveDraft = () => {
    saveDraft();
    addToast("Draft saved", { type: "success", duration: 2000 });
    // Exit the wizard after saving draft
    // Use onExit if available (preserves sessionStorage), otherwise use onComplete
    if (onExit) {
      onExit();
    } else if (onComplete) {
      onComplete();
    }
  };

  // Update form data helper
  const updateFormData = (section, updates) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  };

  // Add tenant field
  const addTenant = () => {
    setFormData(prev => ({
      ...prev,
      income: {
        ...prev.income,
        tenants: [...prev.income.tenants, { firstInitial: '', lastName: '' }]
      }
    }));
  };

  // Remove tenant field
  const removeTenant = (index) => {
    setFormData(prev => ({
      ...prev,
      income: {
        ...prev.income,
        tenants: prev.income.tenants.filter((_, i) => i !== index)
      }
    }));
  };

  // Update tenant first initial at specific index
  const updateTenantFirstInitial = (index, value) => {
    // Only allow 1 character
    const trimmedValue = value.length > 1 ? value.charAt(0).toUpperCase() : value.toUpperCase();
    setFormData(prev => ({
      ...prev,
      income: {
        ...prev.income,
        tenants: prev.income.tenants.map((tenant, i) => 
          i === index ? { ...tenant, firstInitial: trimmedValue } : tenant
        )
      }
    }));
  };

  // Update tenant last name at specific index
  const updateTenantLastName = (index, value) => {
    setFormData(prev => ({
      ...prev,
      income: {
        ...prev.income,
        tenants: prev.income.tenants.map((tenant, i) => 
          i === index ? { ...tenant, lastName: value } : tenant
        )
      }
    }));
  };

  // Add year column
  const addYear = () => {
    const defaultYear = getDefaultYear();
    // Find next available year (increment if default year already exists)
    let newYear = defaultYear;
    let yearNum = parseInt(defaultYear);
    setFormData(prev => {
      const existingYears = prev.expensesByYear || {};
      while (existingYears[newYear]) {
        yearNum++;
        newYear = yearNum.toString();
      }
      return {
        ...prev,
        expensesByYear: {
          ...existingYears,
          [newYear]: initializeYearData(newYear)
        }
      };
    });
  };

  // Remove year column
  const removeYear = (year) => {
    setFormData(prev => {
      const updated = { ...prev.expensesByYear };
      delete updated[year];
      return {
        ...prev,
        expensesByYear: updated
      };
    });
  };

  // Update year (rename year column)
  const updateYear = (oldYear, newYear) => {
    if (!newYear || newYear === oldYear) return;
    
    // Check if new year already exists
    if (formData.expensesByYear?.[newYear]) {
      addToast(`Year ${newYear} already exists`, { type: "error" });
      return;
    }
    
    setFormData(prev => {
      const updated = { ...prev.expensesByYear };
      if (updated[oldYear]) {
        updated[newYear] = updated[oldYear];
        delete updated[oldYear];
      }
      return {
        ...prev,
        expensesByYear: updated
      };
    });
  };

  // Update revenue for a year
  const updateRevenue = (year, value) => {
    setFormData(prev => {
      const currentYearData = prev.expensesByYear?.[year] || initializeYearData(year);
      return {
        ...prev,
        expensesByYear: {
          ...(prev.expensesByYear || {}),
          [year]: {
            ...currentYearData,
            revenue: value
          }
        }
      };
    });
  };

  // Update expense for a year and category
  const updateExpense = (year, category, value) => {
    setFormData(prev => {
      const currentYearData = prev.expensesByYear?.[year] || initializeYearData(year);
      return {
        ...prev,
        expensesByYear: {
          ...(prev.expensesByYear || {}),
          [year]: {
            ...currentYearData,
            expenses: {
              ...(currentYearData.expenses || {}),
              [category]: value
            }
          }
        }
      };
    });
  };

  // Update payment frequency for a year and category
  const updateExpensePaymentFrequency = (year, category, value) => {
    setFormData(prev => {
      const currentYearData = prev.expensesByYear?.[year] || initializeYearData(year);
      return {
        ...prev,
        expensesByYear: {
          ...(prev.expensesByYear || {}),
          [year]: {
            ...currentYearData,
            expensePaymentFrequencies: {
              ...(currentYearData.expensePaymentFrequencies || {}),
              [category]: value
            }
          }
        }
      };
    });
  };

  // Get all years sorted
  const getYears = () => {
    if (!formData.expensesByYear) return [];
    return Object.keys(formData.expensesByYear).sort((a, b) => parseInt(a) - parseInt(b));
  };

  // Validation helpers
  const validateIncome = () => {
    const incomeErrors = {};
    // Ensure tenants is an array
    const tenants = formData.income?.tenants || [];
    if (!Array.isArray(tenants)) {
      incomeErrors.tenants = 'Invalid tenant data';
      return incomeErrors;
    }
    
    // Validate tenants - at least one must have both first initial and last name
    const hasValidTenant = tenants.some(tenant => 
      tenant?.firstInitial?.trim() && tenant?.lastName?.trim()
    );
    if (!hasValidTenant) {
      incomeErrors.tenants = 'At least one tenant with first initial and last name is required';
    }
    // Validate individual tenants
    tenants.forEach((tenant, index) => {
      if (tenants.length > 1) {
        // If multiple tenants, validate each has both fields or is empty
        const hasFirstInitial = tenant?.firstInitial?.trim();
        const hasLastName = tenant?.lastName?.trim();
        if ((hasFirstInitial && !hasLastName) || (!hasFirstInitial && hasLastName)) {
          if (!incomeErrors.tenants || typeof incomeErrors.tenants === 'string') {
            incomeErrors.tenants = {};
          }
          incomeErrors.tenants[index] = 'Both first initial and last name are required';
        }
      } else {
        // Single tenant must have both fields
        if (!tenant?.firstInitial?.trim() || !tenant?.lastName?.trim()) {
          incomeErrors.tenants = 'First initial and last name are required';
        }
      }
    });
    if (!formData.income.monthlyRent || parseFloat(formData.income.monthlyRent) <= 0) {
      incomeErrors.monthlyRent = 'Monthly rent is required and must be greater than 0';
    }
    if (!formData.income.leaseStartDate) {
      incomeErrors.leaseStartDate = 'Lease start date is required';
    }
    return incomeErrors;
  };

  const validateMortgage = () => {
    const mortgageErrors = {};
    if (!formData.mortgage.lender.trim()) {
      mortgageErrors.lender = 'Lender name is required';
    }
    if (!formData.mortgage.originalAmount || parseFloat(formData.mortgage.originalAmount) <= 0) {
      mortgageErrors.originalAmount = 'Original loan amount is required and must be greater than 0';
    }
    if (!formData.mortgage.interestRate || parseFloat(formData.mortgage.interestRate) <= 0) {
      mortgageErrors.interestRate = 'Interest rate is required and must be greater than 0';
    }
    if (!formData.mortgage.startDate) {
      mortgageErrors.startDate = 'Start date is required';
    }
    return mortgageErrors;
  };

  const validateExpenses = () => {
    const expenseErrors = {};
    if (!formData.expensesByYear) return expenseErrors;
    
    Object.keys(formData.expensesByYear).forEach((year) => {
      const yearData = formData.expensesByYear[year];
      if (!yearData) return;
      
      const yearErrors = {};
      
      // Validate revenue (optional but if provided should be a number)
      if (yearData.revenue && isNaN(parseFloat(yearData.revenue))) {
        yearErrors.revenue = 'Revenue must be a valid number';
      }
      
      // Validate expenses
      if (yearData.expenses) {
        Object.keys(yearData.expenses).forEach(category => {
          const amount = yearData.expenses[category];
          if (amount && isNaN(parseFloat(amount))) {
            if (!yearErrors.expenses) yearErrors.expenses = {};
            yearErrors.expenses[category] = 'Amount must be a valid number';
          }
        });
      }
      
      if (Object.keys(yearErrors).length > 0) {
        expenseErrors[year] = yearErrors;
      }
    });
    return expenseErrors;
  };

  // Check section completion
  // Check if section has been saved and has valid data
  const isIncomeComplete = () => {
    if (!sectionsSaved.income) return false;
    const errors = validateIncome();
    const tenants = formData.income?.tenants || [];
    const hasValidTenant = Array.isArray(tenants) && tenants.some(tenant => 
      tenant?.firstInitial?.trim() && tenant?.lastName?.trim()
    );
    return Object.keys(errors).length === 0 && 
           hasValidTenant && 
           formData.income.monthlyRent;
  };

  const isMortgageComplete = () => {
    if (!sectionsSaved.mortgage) return false;
    const errors = validateMortgage();
    return Object.keys(errors).length === 0 && 
           formData.mortgage.lender.trim() && 
           formData.mortgage.originalAmount && 
           formData.mortgage.interestRate;
  };

  const isExpensesComplete = () => {
    // Only return true if section has been saved AND has data
    if (!sectionsSaved.expenses) return false;
    if (!formData.expensesByYear || Object.keys(formData.expensesByYear).length === 0) return false; // Must have at least one year
    const errors = validateExpenses();
    return Object.keys(errors).length === 0;
  };

  // Submit handlers
  const handleSubmitIncome = async () => {
    const incomeErrors = validateIncome();
    if (Object.keys(incomeErrors).length > 0) {
      setErrors(prev => ({ ...prev, income: incomeErrors }));
      addToast("Please fix the errors in the lease details section", { type: "error" });
      return;
    }

    if (!property?.id) {
      addToast("Property not found", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const tenants = property.tenants || [];
      // Create tenant entries for each tenant (firstInitial and lastName)
      const tenantData = formData.income?.tenants || [];
      const validTenants = Array.isArray(tenantData) ? tenantData.filter(tenant => 
        tenant?.firstInitial?.trim() && tenant?.lastName?.trim()
      ) : [];
      const newTenants = validTenants.map(tenant => ({
        firstInitial: tenant.firstInitial.trim().charAt(0).toUpperCase(),
        lastName: tenant.lastName.trim(),
        rent: parseFloat(formData.income.monthlyRent),
        leaseStart: formData.income.leaseStartDate,
        leaseEnd: formData.income.leaseEndDate || null,
        status: formData.income.status,
      }));

      const updatedProperty = {
        ...property,
        tenants: [...tenants, ...newTenants],
        rent: {
          monthlyRent: parseFloat(formData.income.monthlyRent),
          annualRent: parseFloat(formData.income.monthlyRent) * 12,
        },
        propertyData: {
          ...(property.property_data || property.propertyData || {}),
          ...(formData.income.keyDeposit && {
            keyDeposit: parseFloat(formData.income.keyDeposit),
          }),
        },
      };

      const response = await apiClient.updateProperty(property.id, updatedProperty);

      if (response.success) {
        addToast("Lease details saved successfully!", { type: "success" });
        setErrors(prev => ({ ...prev, income: {} }));
        setSectionsSaved(prev => ({ ...prev, income: true }));
      } else {
        throw new Error(response.error || "Failed to save lease details");
      }
    } catch (error) {
      console.error("Error saving lease details:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save lease details";
      addToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMortgage = async () => {
    const mortgageErrors = validateMortgage();
    if (Object.keys(mortgageErrors).length > 0) {
      setErrors(prev => ({ ...prev, mortgage: mortgageErrors }));
      addToast("Please fix the errors in the mortgage section", { type: "error" });
      return;
    }

    if (!property?.id) {
      addToast("Property not found", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      // Convert interest rate from percentage to decimal (e.g., 2.69% -> 0.0269)
      const interestRatePercent = parseFloat(formData.mortgage.interestRate);
      const interestRateDecimal = interestRatePercent / 100;
      
      // Normalize payment frequency format (e.g., BIWEEKLY -> BI_WEEKLY, BI-WEEKLY -> BI_WEEKLY)
      const normalizedPaymentFrequency = normalizePaymentFrequency(formData.mortgage.paymentFrequency);
      
      // Build mortgageData object for additional fields (stored in JSONB)
      const mortgageData = {};
      if (formData.mortgage.currentBalance) {
        mortgageData.currentBalance = parseFloat(formData.mortgage.currentBalance);
      }

      const response = await apiClient.saveMortgage(property.id, {
        lender: formData.mortgage.lender,
        original_amount: parseFloat(formData.mortgage.originalAmount),
        interest_rate: interestRateDecimal,
        term_months: parseInt(formData.mortgage.termMonths),
        amortization_years: parseInt(formData.mortgage.amortizationYears),
        start_date: formData.mortgage.startDate,
        rate_type: formData.mortgage.rateType,
        payment_frequency: normalizedPaymentFrequency,
        ...(Object.keys(mortgageData).length > 0 && { mortgageData }),
      });

      if (response.success) {
        addToast("Mortgage saved successfully!", { type: "success" });
        setErrors(prev => ({ ...prev, mortgage: {} }));
        setSectionsSaved(prev => ({ ...prev, mortgage: true }));
      } else {
        throw new Error(response.error || "Failed to save mortgage");
      }
    } catch (error) {
      console.error("Error saving mortgage:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save mortgage";
      addToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExpenses = async () => {
    const expenseErrors = validateExpenses();
    if (Object.keys(expenseErrors).length > 0) {
      setErrors(prev => ({ ...prev, expenses: expenseErrors }));
      addToast("Please fix the errors in the expenses section", { type: "error" });
      return;
    }

    if (!property?.id) {
      addToast("Property not found", { type: "error" });
      return;
    }

    const years = getYears();
    if (years.length === 0) {
      addToast("No expense data to save", { type: "info" });
      return;
    }

    setLoading(true);
    try {
      // Save all expenses by year
      const promises = [];
      years.forEach(year => {
        const yearData = formData.expensesByYear?.[year];
        if (!yearData) return;
        
        // Save revenue if provided
        if (yearData.revenue && parseFloat(yearData.revenue) > 0) {
          // Revenue would be saved as income/rent data
          // This might need to be handled differently based on your API
        }
        
        // Save each expense category
        if (yearData.expenses) {
          Object.keys(yearData.expenses).forEach(category => {
            const amount = yearData.expenses[category];
            if (amount && parseFloat(amount) > 0) {
              promises.push(
                apiClient.createExpense(property.id, {
                  amount: parseFloat(amount),
                  category: category,
                  date: `${year}-01-01`, // Use first day of year
                  description: `${year} - ${category}`,
                })
              );
            }
          });
        }
      });

      await Promise.all(promises);
      const totalExpenses = years.reduce((sum, year) => {
        const yearData = formData.expensesByYear?.[year];
        if (!yearData?.expenses) return sum;
        return sum + Object.values(yearData.expenses).filter(v => v && parseFloat(v) > 0).length;
      }, 0);
      addToast(`Successfully saved ${totalExpenses} expense${totalExpenses !== 1 ? 's' : ''} for ${years.length} year${years.length !== 1 ? 's' : ''}!`, { type: "success" });
      setErrors(prev => ({ ...prev, expenses: {} }));
      setSectionsSaved(prev => ({ ...prev, expenses: true }));
    } catch (error) {
      console.error("Error saving expenses:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save expenses";
      addToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Submit all sections
  const handleSubmitAll = async () => {
    const incomeErrors = validateIncome();
    const mortgageErrors = validateMortgage();
    const expenseErrors = validateExpenses();

    setErrors({
      income: incomeErrors,
      mortgage: mortgageErrors,
      expenses: expenseErrors,
    });

    // Check if there are any errors
    const hasErrors = 
      Object.keys(incomeErrors).length > 0 ||
      Object.keys(mortgageErrors).length > 0 ||
      Object.keys(expenseErrors).length > 0;

    if (hasErrors) {
      addToast("Please fix all errors before submitting", { type: "error" });
      return;
    }

    // Submit all sections that have data
    setLoading(true);
    try {
      const submitPromises = [];

      // Submit income if it has data
      const tenantNames = formData.income?.tenantNames || [];
      const hasValidTenant = Array.isArray(tenantNames) && tenantNames.some(name => name && name.trim());
      if (hasValidTenant && formData.income.monthlyRent) {
        submitPromises.push(handleSubmitIncome());
      }

      // Submit mortgage if it has data
      if (formData.mortgage.lender.trim() && formData.mortgage.originalAmount && formData.mortgage.interestRate) {
        submitPromises.push(handleSubmitMortgage());
      }

      // Submit expenses if there are any
      if (Object.keys(formData.expensesByYear).length > 0) {
        submitPromises.push(handleSubmitExpenses());
      }

      // Wait for all submissions to complete
      if (submitPromises.length > 0) {
        await Promise.all(submitPromises);
      }

      // Clear draft after successful submission
      if (propertyId) {
        clearPropertyDraft(propertyId);
      }

      addToast("All financial data saved successfully!", { type: "success" });
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error submitting financial data:", error);
      addToast("Some data failed to save. Please try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const propertyName = property?.nickname || property?.name || property?.address || "Your Property";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Add Financial Data</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Complete the financial information for <strong className="text-gray-900 dark:text-white">{propertyName}</strong>.
            Your progress is automatically saved as you work.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {draftSaved && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-md">
              <Save className="w-3.5 h-3.5" />
              Draft saved
            </span>
          )}
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="text-xs"
          >
            {savingDraft ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3 h-3 mr-1" />
                Save Draft
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Section 1: Lease Details */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:opacity-95 transition-opacity bg-white dark:bg-gray-950">
        <button
          onClick={() => setExpandedSection(expandedSection === 'income' ? null : 'income')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg ${
              isIncomeComplete() 
                ? 'bg-emerald-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              1
            </div>
            <div className={`p-2.5 rounded-lg ${isIncomeComplete() ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <UserCheck className={`w-6 h-6 ${isIncomeComplete() ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                Lease Details
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add your lease details here using your existing and past leases for reference.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isIncomeComplete() && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                Complete
              </span>
            )}
            {expandedSection === 'income' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {expandedSection === 'income' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Tenant Name(s) <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {(formData.income?.tenants || [{ firstInitial: '', lastName: '' }]).map((tenant, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tenant?.firstInitial || ''}
                          onChange={(e) => updateTenantFirstInitial(index, e.target.value)}
                          maxLength={1}
                          className={`w-12 rounded-lg border ${
                            (errors.income.tenants && (typeof errors.income.tenants === 'string' || errors.income.tenants[index]))
                              ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' 
                              : 'border-gray-200 dark:border-gray-800'
                          } bg-white dark:bg-gray-900 px-3 py-2 text-center text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] transition-colors uppercase`}
                          placeholder={index === 0 ? "A" : "I"}
                        />
                        <input
                          type="text"
                          value={tenant?.lastName || ''}
                          onChange={(e) => updateTenantLastName(index, e.target.value)}
                          className={`flex-1 rounded-lg border ${
                            (errors.income.tenants && (typeof errors.income.tenants === 'string' || errors.income.tenants[index]))
                              ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' 
                              : 'border-gray-200 dark:border-gray-800'
                          } bg-white dark:bg-gray-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] transition-colors`}
                          placeholder={index === 0 ? "e.g., Smith" : "Last name"}
                        />
                        {(formData.income?.tenants || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTenant(index)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group flex-shrink-0"
                            title="Remove tenant"
                          >
                            <X className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
                          </button>
                        )}
                        {index === (formData.income?.tenants || []).length - 1 && (
                          <button
                            type="button"
                            onClick={addTenant}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group flex-shrink-0 border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400"
                            title="Add another tenant"
                          >
                            <Plus className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.income.tenants && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">
                      {typeof errors.income.tenants === 'string' 
                        ? errors.income.tenants 
                        : 'Please fill in all tenant names'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Monthly Rent <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 z-10">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.income.monthlyRent}
                      onChange={(e) => updateFormData('income', { monthlyRent: e.target.value })}
                      className={`w-full rounded-lg border ${
                        errors.income.monthlyRent 
                          ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' 
                          : 'border-gray-200 dark:border-gray-800'
                      } bg-white dark:bg-gray-900 pl-7 pr-4 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] transition-colors`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.income.monthlyRent && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.income.monthlyRent}</p>
                  )}
                </div>
                <DateInput
                  label="Lease Start Date *"
                  id="leaseStartDate"
                  value={formData.income.leaseStartDate}
                  onChange={(e) => updateFormData('income', { leaseStartDate: e.target.value })}
                  className={errors.income.leaseStartDate ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' : ''}
                />
                {errors.income.leaseStartDate && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.income.leaseStartDate}</p>
                )}
                <DateInput
                  label="Lease End Date (Optional)"
                  id="leaseEndDate"
                  value={formData.income.leaseEndDate}
                  onChange={(e) => updateFormData('income', { leaseEndDate: e.target.value })}
                />
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Key Deposit
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 z-10">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.income.keyDeposit}
                      onChange={(e) => updateFormData('income', { keyDeposit: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-7 pr-4 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <SelectInput
                  label="Status"
                  id="status"
                  value={formData.income.status}
                  onChange={(e) => updateFormData('income', { status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </SelectInput>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSubmitIncome}
                  loading={loading}
                  disabled={!isIncomeComplete()}
                  className="min-w-[140px] bg-[#205A3E] text-white hover:bg-[#1a4932]"
                >
                  Save Section 1
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Annual Revenue & Expenses */}
      <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:opacity-95 transition-opacity bg-white dark:bg-neutral-900">
        <button
          onClick={() => setExpandedSection(expandedSection === 'expenses' ? null : 'expenses')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg ${
              isExpensesComplete()
                ? 'bg-emerald-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              2
            </div>
            <div className={`p-2.5 rounded-lg ${isExpensesComplete() ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <BarChart3 className={`w-6 h-6 ${isExpensesComplete() ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                Annual Revenue & Expenses
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add your annual revenue & expenses for each year owning your investment property. Resources you can use include:
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 mt-2 ml-4 list-disc space-y-1">
                <li>T1, Statement of Real Estate Rentals, Part 3 - Income and Part 4 - Expenses</li>
                <li>Mortgage (Principal) per your annual mortgage statement</li>
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isExpensesComplete() && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                Complete
              </span>
            )}
            {expandedSection === 'expenses' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {expandedSection === 'expenses' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="space-y-5">
              {/* Add Year Column Button */}
              <div className="flex justify-end">
                <button
                  onClick={addYear}
                  className="flex items-center gap-2 px-4 py-2 bg-[#205A3E] hover:bg-[#1a4932] text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Year
                </button>
              </div>

              {/* Year-Column Table */}
              {getYears().length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-4 py-3 text-left text-xs font-bold text-gray-900 dark:text-white">
                            Category
                          </th>
                          <th className="sticky left-[200px] z-10 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-4 py-3 text-left text-xs font-bold text-gray-900 dark:text-white min-w-[140px]">
                            Payment Frequency
                          </th>
                          {getYears().map((year) => (
                            <th key={year} className="relative border border-gray-200 dark:border-gray-800 px-3 py-3 text-center text-xs font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 min-w-[140px]">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="number"
                                  min="2000"
                                  max="2100"
                                  value={year}
                                  onChange={(e) => {
                                    const newYear = e.target.value;
                                    if (newYear && newYear.length === 4) {
                                      updateYear(year, newYear);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const newYear = e.target.value;
                                    if (newYear && newYear.length === 4 && newYear !== year) {
                                      updateYear(year, newYear);
                                    } else if (!newYear || newYear.length !== 4) {
                                      e.target.value = year; // Reset if invalid
                                    }
                                  }}
                                  className="w-16 text-center font-bold bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#205A3E] dark:focus:border-[#66B894] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 transition-colors"
                                />
                                <button
                                  onClick={() => removeYear(year)}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors group flex-shrink-0"
                                >
                                  <X className="w-3 h-3 text-gray-500 group-hover:text-red-500" />
                                </button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-950">
                        {/* Revenue Row */}
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                          <td className="sticky left-0 z-10 bg-emerald-50 dark:bg-emerald-900/20 border-r border-gray-200 dark:border-gray-800 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                            Revenue
                          </td>
                          <td className="sticky left-[200px] z-10 bg-emerald-50 dark:bg-emerald-900/20 border-r border-gray-200 dark:border-gray-800 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {/* Empty cell for Revenue - Payment Frequency does not apply */}
                          </td>
                          {getYears().map((year) => (
                            <td key={year} className="border-r border-gray-200 dark:border-gray-800 px-2 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={(formData.expensesByYear?.[year]?.revenue) || ''}
                                onChange={(e) => updateRevenue(year, e.target.value)}
                                className={`w-full rounded-md border ${
                                  errors.expenses[year]?.revenue 
                                    ? 'border-red-500 dark:border-red-500' 
                                    : 'border-gray-200 dark:border-gray-800'
                                } bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] transition-colors`}
                                placeholder="0.00"
                              />
                              {errors.expenses[year]?.revenue && (
                                <p className="text-xs text-red-500 mt-0.5">{errors.expenses[year].revenue}</p>
                              )}
                            </td>
                          ))}
                        </tr>
                        {/* Expense Category Rows */}
                        {EXPENSE_CATEGORIES.map((category) => (
                          <tr key={category} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                            <td className="sticky left-0 z-10 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                              {category}
                            </td>
                            <td className="sticky left-[200px] z-10 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 px-2 py-2.5">
                              <select
                                value={(getYears().length > 0 && formData.expensesByYear?.[getYears()[0]]?.expensePaymentFrequencies?.[category]) || 'Annual'}
                                onChange={(e) => {
                                  // Update payment frequency for all years (same frequency applies to all years for this category)
                                  getYears().forEach(year => {
                                    updateExpensePaymentFrequency(year, category, e.target.value);
                                  });
                                }}
                                className="w-full rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] transition-colors"
                              >
                                <option value="Monthly">Monthly</option>
                                <option value="Annual">Annual</option>
                              </select>
                            </td>
                          {getYears().map((year) => (
                            <td key={year} className="border-r border-gray-200 dark:border-gray-800 px-2 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={(formData.expensesByYear?.[year]?.expenses?.[category]) || ''}
                                onChange={(e) => updateExpense(year, category, e.target.value)}
                                className={`w-full rounded-md border ${
                                  errors.expenses?.[year]?.expenses?.[category] 
                                    ? 'border-red-500 dark:border-red-500' 
                                    : 'border-gray-200 dark:border-gray-800'
                                } bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] transition-colors`}
                                placeholder="0.00"
                              />
                              {errors.expenses?.[year]?.expenses?.[category] && (
                                <p className="text-xs text-red-500 mt-0.5">{errors.expenses[year].expenses[category]}</p>
                              )}
                            </td>
                          ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">Click "Add Another Year" to start adding revenue and expense data</p>
                </div>
              )}

              {/* Save Expenses Button */}
              {getYears().length > 0 && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSubmitExpenses}
                    loading={loading}
                    disabled={!isExpensesComplete()}
                    className="min-w-[140px] bg-[#205A3E] text-white hover:bg-[#1a4932]"
                  >
                    Save Section 2
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Mortgage Details */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:opacity-95 transition-opacity bg-white dark:bg-gray-950">
        <button
          onClick={() => setExpandedSection(expandedSection === 'mortgage' ? null : 'mortgage')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg ${
              isMortgageComplete() 
                ? 'bg-emerald-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              3
            </div>
            <div className={`p-2.5 rounded-lg ${isMortgageComplete() ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Landmark className={`w-6 h-6 ${isMortgageComplete() ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                Mortgage Details
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add your current and historical mortgage details per your Annual Mortgage Statements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isMortgageComplete() && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                Complete
              </span>
            )}
            {expandedSection === 'mortgage' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {expandedSection === 'mortgage' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Lender Name *"
                  id="lender"
                  type="text"
                  value={formData.mortgage.lender}
                  onChange={(e) => updateFormData('mortgage', { lender: e.target.value })}
                  className={errors.mortgage.lender ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' : ''}
                  placeholder="e.g., Bank of Canada"
                />
                {errors.mortgage.lender && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.mortgage.lender}</p>
                )}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Original Loan Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mortgage.originalAmount}
                    onChange={(e) => updateFormData('mortgage', { originalAmount: e.target.value })}
                    className={`w-full rounded-lg border ${
                      errors.mortgage.originalAmount 
                        ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' 
                        : 'border-gray-200 dark:border-gray-800'
                    } bg-white dark:bg-gray-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] transition-colors`}
                    placeholder="0.00"
                  />
                  {errors.mortgage.originalAmount && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.mortgage.originalAmount}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Interest Rate (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mortgage.interestRate}
                    onChange={(e) => updateFormData('mortgage', { interestRate: e.target.value })}
                    className={`w-full rounded-lg border ${
                      errors.mortgage.interestRate 
                        ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' 
                        : 'border-gray-200 dark:border-gray-800'
                    } bg-white dark:bg-gray-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] transition-colors`}
                    placeholder="0.00"
                  />
                  {errors.mortgage.interestRate && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.mortgage.interestRate}</p>
                  )}
                </div>
                <SelectInput
                  label="Rate Type"
                  id="rateType"
                  value={formData.mortgage.rateType}
                  onChange={(e) => updateFormData('mortgage', { rateType: e.target.value })}
                >
                  {RATE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </SelectInput>
                <SelectInput
                  label="Term"
                  id="termMonths"
                  value={formData.mortgage.termMonths}
                  onChange={(e) => updateFormData('mortgage', { termMonths: e.target.value })}
                >
                  {TERM_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectInput>
                <SelectInput
                  label="Amortization Period"
                  id="amortizationYears"
                  value={formData.mortgage.amortizationYears}
                  onChange={(e) => updateFormData('mortgage', { amortizationYears: e.target.value })}
                >
                  {AMORTIZATION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectInput>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Current Balance (Optional)
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-normal">For existing mortgages</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mortgage.currentBalance || ''}
                    onChange={(e) => updateFormData('mortgage', { currentBalance: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] transition-colors"
                    placeholder="Leave empty for new mortgages"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    If your mortgage has already started, enter the current outstanding balance
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                    Note: For full amortization schedule accuracy, full payment history from the lender is required
                  </p>
                </div>
                <DateInput
                  label="Start Date *"
                  id="startDate"
                  value={formData.mortgage.startDate}
                  onChange={(e) => updateFormData('mortgage', { startDate: e.target.value })}
                  className={errors.mortgage.startDate ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' : ''}
                />
                {errors.mortgage.startDate && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.mortgage.startDate}</p>
                )}
                <SelectInput
                  label="Payment Frequency"
                  id="paymentFrequency"
                  value={formData.mortgage.paymentFrequency}
                  onChange={(e) => updateFormData('mortgage', { paymentFrequency: e.target.value })}
                >
                  {PAYMENT_FREQUENCY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectInput>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSubmitMortgage}
                  loading={loading}
                  disabled={!isMortgageComplete()}
                  className="min-w-[140px] bg-[#205A3E] text-white hover:bg-[#1a4932]"
                >
                  Save Section 3
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
        <Button variant="secondary" onClick={onBack} className="px-6">
          Back
        </Button>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="px-6"
          >
            {savingDraft ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Draft & Continue Later
              </>
            )}
          </Button>
          <Button onClick={handleSubmitAll} loading={loading} className="px-8 font-semibold">
            Submit All Sections
          </Button>
        </div>
      </div>
    </div>
  );
}

