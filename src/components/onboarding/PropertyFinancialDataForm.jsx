"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import apiClient from "@/lib/api-client";
import { savePropertyDraft, getPropertyDraft, clearPropertyDraft } from "@/lib/onboarding-draft-storage";
import { normalizePaymentFrequency } from "@/lib/mortgage-validation";
import Button from "@/components/Button";
import { 
  Home, 
  User,
  Receipt, 
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
  onBack
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null); // 'income' | 'mortgage' | 'expenses' | null
  const autoSaveTimeoutRef = useRef(null);

  // Form state structure
  const [formData, setFormData] = useState({
    income: {
      tenantNames: [''], // Array of tenant names
      monthlyRent: '',
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

  // Restore draft on mount and initialize current year if needed
  useEffect(() => {
    if (propertyId) {
      const draft = getPropertyDraft(propertyId);
      if (draft) {
        // Migrate old tenantName to tenantNames array if needed
        if (draft.income) {
          if (draft.income.tenantName && !draft.income.tenantNames) {
            draft.income.tenantNames = [draft.income.tenantName];
            delete draft.income.tenantName;
          }
          // Ensure tenantNames is always an array
          if (!draft.income.tenantNames || !Array.isArray(draft.income.tenantNames)) {
            draft.income.tenantNames = [''];
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
        
        // If no years exist in expensesByYear, initialize with current year
        if (!draft.expensesByYear || Object.keys(draft.expensesByYear).length === 0) {
          const defaultYear = getDefaultYear();
          draft.expensesByYear = {
            [defaultYear]: initializeYearData(defaultYear)
          };
        }
        
        setFormData(draft);
        addToast("Draft restored", { type: "success", duration: 2000 });
      } else {
        // No draft exists - initialize with current year
        const defaultYear = getDefaultYear();
        setFormData(prev => ({
          ...prev,
          expensesByYear: {
            [defaultYear]: initializeYearData(defaultYear)
          }
        }));
      }
    } else {
      // No propertyId yet - initialize with current year
      const defaultYear = getDefaultYear();
      setFormData(prev => ({
        ...prev,
        expensesByYear: {
          [defaultYear]: initializeYearData(defaultYear)
        }
      }));
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

  // Manual save draft handler
  const handleSaveDraft = () => {
    saveDraft();
    addToast("Draft saved", { type: "success", duration: 2000 });
  };

  // Update form data helper
  const updateFormData = (section, updates) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  };

  // Add tenant name field
  const addTenantName = () => {
    setFormData(prev => ({
      ...prev,
      income: {
        ...prev.income,
        tenantNames: [...prev.income.tenantNames, '']
      }
    }));
  };

  // Remove tenant name field
  const removeTenantName = (index) => {
    setFormData(prev => ({
      ...prev,
      income: {
        ...prev.income,
        tenantNames: prev.income.tenantNames.filter((_, i) => i !== index)
      }
    }));
  };

  // Update tenant name at specific index
  const updateTenantName = (index, value) => {
    setFormData(prev => ({
      ...prev,
      income: {
        ...prev.income,
        tenantNames: prev.income.tenantNames.map((name, i) => i === index ? value : name)
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
    // Ensure tenantNames is an array
    const tenantNames = formData.income?.tenantNames || [];
    if (!Array.isArray(tenantNames)) {
      incomeErrors.tenantNames = 'Invalid tenant names data';
      return incomeErrors;
    }
    
    // Validate tenant names - at least one must be filled
    const hasValidTenant = tenantNames.some(name => name && name.trim());
    if (!hasValidTenant) {
      incomeErrors.tenantNames = 'At least one tenant name is required';
    }
    // Validate individual tenant names
    tenantNames.forEach((name, index) => {
      if (name && name.trim() === '' && tenantNames.length > 1) {
        // Empty tenant names are only invalid if there are multiple fields
        if (!incomeErrors.tenantNames || typeof incomeErrors.tenantNames === 'string') {
          incomeErrors.tenantNames = {};
        }
        incomeErrors.tenantNames[index] = 'Tenant name cannot be empty';
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
  const isIncomeComplete = () => {
    const errors = validateIncome();
    const tenantNames = formData.income?.tenantNames || [];
    const hasValidTenant = Array.isArray(tenantNames) && tenantNames.some(name => name && name.trim());
    return Object.keys(errors).length === 0 && 
           hasValidTenant && 
           formData.income.monthlyRent;
  };

  const isMortgageComplete = () => {
    const errors = validateMortgage();
    return Object.keys(errors).length === 0 && 
           formData.mortgage.lender.trim() && 
           formData.mortgage.originalAmount && 
           formData.mortgage.interestRate;
  };

  const isExpensesComplete = () => {
    if (!formData.expensesByYear || Object.keys(formData.expensesByYear).length === 0) return true; // Empty is valid
    const errors = validateExpenses();
    return Object.keys(errors).length === 0;
  };

  // Submit handlers
  const handleSubmitIncome = async () => {
    const incomeErrors = validateIncome();
    if (Object.keys(incomeErrors).length > 0) {
      setErrors(prev => ({ ...prev, income: incomeErrors }));
      addToast("Please fix the errors in the income section", { type: "error" });
      return;
    }

    if (!property?.id) {
      addToast("Property not found", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const tenants = property.tenants || [];
      // Create tenant entries for each tenant name
      const tenantNames = formData.income?.tenantNames || [];
      const validTenantNames = Array.isArray(tenantNames) ? tenantNames.filter(name => name && name.trim()) : [];
      const newTenants = validTenantNames.map(tenantName => ({
        name: tenantName.trim(),
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
      };

      const response = await apiClient.updateProperty(property.id, updatedProperty);

      if (response.success) {
        addToast("Tenant information saved successfully!", { type: "success" });
        setErrors(prev => ({ ...prev, income: {} }));
      } else {
        throw new Error(response.error || "Failed to save tenant information");
      }
    } catch (error) {
      console.error("Error saving tenant information:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save tenant information";
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

      {/* Section 1: Tenant Information */}
      <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:opacity-95 transition-opacity bg-white dark:bg-neutral-900">
        <button
          onClick={() => setExpandedSection(expandedSection === 'income' ? null : 'income')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg ${
              isIncomeComplete() 
                ? 'bg-emerald-500 text-white' 
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            }`}>
              1
            </div>
            <div className={`p-2.5 rounded-lg ${isIncomeComplete() ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              <User className={`w-6 h-6 ${isIncomeComplete() ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                Tenant Information
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add tenant and monthly rent. Use your existing and past leases for reference
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
          <div className="p-6 border-t border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Tenant Name(s) <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {(formData.income?.tenantNames || ['']).map((tenantName, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tenantName}
                          onChange={(e) => updateTenantName(index, e.target.value)}
                          className={`flex-1 rounded-lg border ${
                            (errors.income.tenantNames && (typeof errors.income.tenantNames === 'string' || errors.income.tenantNames[index]))
                              ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' 
                              : 'border-black/15 dark:border-white/15'
                          } bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors`}
                          placeholder={index === 0 ? "e.g., John Smith" : "Additional tenant name"}
                        />
                        {(formData.income?.tenantNames || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTenantName(index)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group flex-shrink-0"
                            title="Remove tenant"
                          >
                            <X className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
                          </button>
                        )}
                        {index === (formData.income?.tenantNames || []).length - 1 && (
                          <button
                            type="button"
                            onClick={addTenantName}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group flex-shrink-0 border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400"
                            title="Add another tenant"
                          >
                            <Plus className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.income.tenantNames && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">
                      {typeof errors.income.tenantNames === 'string' 
                        ? errors.income.tenantNames 
                        : 'Please fill in all tenant names'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Monthly Rent <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.income.monthlyRent}
                    onChange={(e) => updateFormData('income', { monthlyRent: e.target.value })}
                    className={`w-full rounded-lg border ${
                      errors.income.monthlyRent 
                        ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' 
                        : 'border-black/15 dark:border-white/15'
                    } bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors`}
                    placeholder="0.00"
                  />
                  {errors.income.monthlyRent && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.income.monthlyRent}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Lease Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.income.leaseStartDate}
                    onChange={(e) => updateFormData('income', { leaseStartDate: e.target.value })}
                    className={`w-full rounded-lg border ${
                      errors.income.leaseStartDate 
                        ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' 
                        : 'border-black/15 dark:border-white/15'
                    } bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors`}
                  />
                  {errors.income.leaseStartDate && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.income.leaseStartDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Lease End Date <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.income.leaseEndDate}
                    onChange={(e) => updateFormData('income', { leaseEndDate: e.target.value })}
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    value={formData.income.status}
                    onChange={(e) => updateFormData('income', { status: e.target.value })}
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSubmitIncome}
                  loading={loading}
                  disabled={!isIncomeComplete()}
                  className="min-w-[140px]"
                >
                  Save Section 1
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Property Annual Revenue & Expenses */}
      <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:opacity-95 transition-opacity bg-white dark:bg-neutral-900">
        <button
          onClick={() => setExpandedSection(expandedSection === 'expenses' ? null : 'expenses')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg ${
              isExpensesComplete() && Object.keys(formData.expensesByYear || {}).length > 0
                ? 'bg-emerald-500 text-white' 
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
            }`}>
              2
            </div>
            <div className={`p-2.5 rounded-lg ${isExpensesComplete() && Object.keys(formData.expensesByYear).length > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
              <Receipt className={`w-6 h-6 ${isExpensesComplete() && Object.keys(formData.expensesByYear).length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                Property Annual Revenue & Expenses
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use your records or your T1, Statement of Real Estate Rentals, Part 3 - Income & Part 4 - Expenses. Mortgage (Principal) can be populated per the Annual Mortgage Statement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isExpensesComplete() && Object.keys(formData.expensesByYear).length > 0 && (
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
          <div className="p-6 border-t border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50">
            <div className="space-y-5">
              {/* Add Year Column Button */}
              <div className="flex justify-end">
                <button
                  onClick={addYear}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
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
                          <th className="sticky left-0 z-10 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 px-4 py-3 text-left text-xs font-bold text-gray-900 dark:text-white">
                            Category
                          </th>
                          <th className="sticky left-[200px] z-10 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 px-4 py-3 text-left text-xs font-bold text-gray-900 dark:text-white min-w-[140px]">
                            Payment Frequency
                          </th>
                          {getYears().map((year) => (
                            <th key={year} className="relative border border-black/10 dark:border-white/10 px-3 py-3 text-center text-xs font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 min-w-[140px]">
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
                                  className="w-16 text-center font-bold bg-transparent border border-transparent hover:border-orange-300 dark:hover:border-orange-600 focus:border-orange-500 dark:focus:border-orange-400 rounded px-1 py-0.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
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
                      <tbody className="bg-white dark:bg-gray-800">
                        {/* Revenue Row */}
                        <tr className="border-b border-black/10 dark:border-white/10">
                          <td className="sticky left-0 z-10 bg-emerald-50 dark:bg-emerald-900/20 border-r border-black/10 dark:border-white/10 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                            Revenue
                          </td>
                          <td className="sticky left-[200px] z-10 bg-emerald-50 dark:bg-emerald-900/20 border-r border-black/10 dark:border-white/10 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {/* Empty cell for Revenue - Payment Frequency does not apply */}
                          </td>
                          {getYears().map((year) => (
                            <td key={year} className="border-r border-black/10 dark:border-white/10 px-2 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={(formData.expensesByYear?.[year]?.revenue) || ''}
                                onChange={(e) => updateRevenue(year, e.target.value)}
                                className={`w-full rounded-md border ${
                                  errors.expenses[year]?.revenue 
                                    ? 'border-red-500 dark:border-red-500' 
                                    : 'border-black/15 dark:border-white/15'
                                } bg-white dark:bg-gray-800 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors`}
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
                          <tr key={category} className="border-b border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-black/10 dark:border-white/10 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                              {category}
                            </td>
                            <td className="sticky left-[200px] z-10 bg-white dark:bg-gray-800 border-r border-black/10 dark:border-white/10 px-2 py-2.5">
                              <select
                                value={(getYears().length > 0 && formData.expensesByYear?.[getYears()[0]]?.expensePaymentFrequencies?.[category]) || 'Annual'}
                                onChange={(e) => {
                                  // Update payment frequency for all years (same frequency applies to all years for this category)
                                  getYears().forEach(year => {
                                    updateExpensePaymentFrequency(year, category, e.target.value);
                                  });
                                }}
                                className="w-full rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                              >
                                <option value="Monthly">Monthly</option>
                                <option value="Annual">Annual</option>
                              </select>
                            </td>
                          {getYears().map((year) => (
                            <td key={year} className="border-r border-black/10 dark:border-white/10 px-2 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={(formData.expensesByYear?.[year]?.expenses?.[category]) || ''}
                                onChange={(e) => updateExpense(year, category, e.target.value)}
                                className={`w-full rounded-md border ${
                                  errors.expenses?.[year]?.expenses?.[category] 
                                    ? 'border-red-500 dark:border-red-500' 
                                    : 'border-black/15 dark:border-white/15'
                                } bg-white dark:bg-gray-800 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors`}
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
                    className="min-w-[140px]"
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
      <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:opacity-95 transition-opacity bg-white dark:bg-neutral-900">
        <button
          onClick={() => setExpandedSection(expandedSection === 'mortgage' ? null : 'mortgage')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg ${
              isMortgageComplete() 
                ? 'bg-emerald-500 text-white' 
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            }`}>
              3
            </div>
            <div className={`p-2.5 rounded-lg ${isMortgageComplete() ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
              <Home className={`w-6 h-6 ${isMortgageComplete() ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`} />
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
          <div className="p-6 border-t border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Lender Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.mortgage.lender}
                    onChange={(e) => updateFormData('mortgage', { lender: e.target.value })}
                    className={`w-full rounded-lg border ${
                      errors.mortgage.lender 
                        ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' 
                        : 'border-black/15 dark:border-white/15'
                    } bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors`}
                    placeholder="e.g., Bank of Canada"
                  />
                  {errors.mortgage.lender && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.mortgage.lender}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
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
                        : 'border-black/15 dark:border-white/15'
                    } bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors`}
                    placeholder="0.00"
                  />
                  {errors.mortgage.originalAmount && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.mortgage.originalAmount}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
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
                        : 'border-black/15 dark:border-white/15'
                    } bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors`}
                    placeholder="0.00"
                  />
                  {errors.mortgage.interestRate && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.mortgage.interestRate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Rate Type</label>
                  <select
                    value={formData.mortgage.rateType}
                    onChange={(e) => updateFormData('mortgage', { rateType: e.target.value })}
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                  >
                    {RATE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Term</label>
                  <select
                    value={formData.mortgage.termMonths}
                    onChange={(e) => updateFormData('mortgage', { termMonths: e.target.value })}
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                  >
                    {TERM_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Amortization Period</label>
                  <select
                    value={formData.mortgage.amortizationYears}
                    onChange={(e) => updateFormData('mortgage', { amortizationYears: e.target.value })}
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                  >
                    {AMORTIZATION_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Current Balance (Optional)
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-normal">For existing mortgages</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mortgage.currentBalance || ''}
                    onChange={(e) => updateFormData('mortgage', { currentBalance: e.target.value })}
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                    placeholder="Leave empty for new mortgages"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    If your mortgage has already started, enter the current outstanding balance
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                    Note: For full amortization schedule accuracy, full payment history from the lender is required
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.mortgage.startDate}
                    onChange={(e) => updateFormData('mortgage', { startDate: e.target.value })}
                    className={`w-full rounded-lg border ${
                      errors.mortgage.startDate 
                        ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-400' 
                        : 'border-black/15 dark:border-white/15'
                    } bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors`}
                  />
                  {errors.mortgage.startDate && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.mortgage.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Payment Frequency</label>
                  <select
                    value={formData.mortgage.paymentFrequency}
                    onChange={(e) => updateFormData('mortgage', { paymentFrequency: e.target.value })}
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-gray-800 px-4 py-2.5 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                  >
                    {PAYMENT_FREQUENCY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSubmitMortgage}
                  loading={loading}
                  disabled={!isMortgageComplete()}
                  className="min-w-[140px]"
                >
                  Save Section 3
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 mt-6 border-t border-black/10 dark:border-white/10">
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

