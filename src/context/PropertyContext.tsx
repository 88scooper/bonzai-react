"use client";

// Property context for managing property data and calculations
import React, { createContext, useContext, useMemo, useCallback, ReactNode, useEffect, useState } from 'react';
import { getAllProperties, getPortfolioMetrics } from '@/data/properties';
import { useAccount } from '@/context/AccountContext';
import { 
  calculateAnnualOperatingExpenses, 
  calculateNOI, 
  calculateCapRate, 
  calculateMonthlyCashFlow, 
  calculateAnnualCashFlow, 
  calculateCashOnCashReturn,
  updatePropertyFinancialMetrics,
  calculateLandTransferTax
} from '@/utils/financialCalculations';
import { getMonthlyMortgagePayment, getMonthlyMortgageInterest, getMonthlyMortgagePrincipal } from '@/utils/mortgageCalculator';
import { generateSlug } from '@/utils/slug';

// Define TypeScript interfaces for better type safety
export interface Property {
  id: string;
  nickname: string;
  address: string;
  purchasePrice: number;
  purchaseDate: string;
  closingCosts: number;
  renovationCosts: number;
  initialRenovations?: number;
  currentMarketValue: number;
  yearBuilt: number;
  propertyType: string;
  size: number;
  unitConfig: string;
  mortgage: {
    lender: string;
    originalAmount: number;
    interestRate: number;
    rateType: string;
    termMonths: number;
    amortizationYears: number;
    paymentFrequency: string;
    startDate: string;
  };
  rent: {
    monthlyRent: number;
    annualRent: number;
  };
  expenses: {
    propertyTax: { amount: number; frequency: string };
    condoFees: { amount: number; frequency: string };
    insurance: { amount: number; frequency: string };
    maintenance: { amount: number; frequency: string };
    professionalFees: { amount: number; frequency: string };
    utilities?: { amount: number; frequency: string };
  };
  tenant: {
    name: string;
    leaseStartDate: string;
    leaseEndDate: string;
    rent: number;
    status: string;
  };
  totalInvestment: number;
  appreciation: number;
  monthlyPropertyTax: number;
  monthlyCondoFees: number;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  monthlyProfessionalFees: number;
  monthlyUtilities?: number;
  monthlyExpenses: {
    propertyTax: number;
    condoFees: number;
    insurance: number;
    maintenance: number;
    professionalFees: number;
    utilities?: number;
    advertising?: number;
    mortgageInterest?: number;
    officeExpenses?: number;
    management?: number;
    travel?: number;
    motorVehicle?: number;
    mortgagePrincipal?: number;
    mortgagePayment?: number;
    total: number;
  };
  monthlyCashFlow: number;
  annualCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  pricePerSquareFoot: number;
  occupancy: number;
  name: string;
  type: string;
  units: number;
  bedrooms: number[];
  bathrooms: number[];
  squareFootage: number;
  currentValue: number;
  tenants: Array<{
    firstInitial: string;
    lastName: string;
    unit: string;
    rent: number;
    leaseStart: string;
    leaseEnd: string;
    status: string;
  }>;
  expenseHistory?: Array<{
    year: number;
    propertyTax: number;
    insurance: number;
    maintenance: number;
    other: number;
    total: number;
  }>;
  imageUrl?: string;
  propertyData?: Record<string, any>;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalInvestment: number;
  totalEquity: number;
  totalMortgageBalance: number;
  totalMonthlyRent: number;
  totalMonthlyOperatingExpenses: number;
  totalMonthlyDebtService: number;
  totalMonthlyExpenses: number;
  totalMonthlyCashFlow: number;
  totalAnnualOperatingExpenses: number;
  totalAnnualDebtService: number;
  netOperatingIncome: number;
  totalAnnualDeductibleExpenses: number;
  totalProperties: number;
  averageCapRate: number;
  averageOccupancy: number;
  totalAnnualCashFlow: number;
  cashOnCashReturn: number;
}

export interface PropertyContextType {
  // All properties data
  properties: Property[];
  
  // Portfolio metrics
  portfolioMetrics: PortfolioMetrics;
  
  // Calculation state
  calculationsComplete: boolean;
  
  // Helper functions
  getPropertyById: (id: string) => Property | undefined;
  getPropertyBySlug: (slug: string) => Property | undefined;
  getPropertiesByType: (type: string) => Property[];
  getPropertiesByLocation: (location: string) => Property[];
  getPropertiesWithTenants: () => Property[];
  getVacantProperties: () => Property[];
  updateProperty: (id: string, updatedProperty: Property, skipSave?: boolean) => void;
  
  // Loading and error states (for future use)
  loading: boolean;
  error: string | null;
}

const cloneData = <T,>(value: T): T => {
  const structuredCloneFn = (globalThis as any).structuredClone;
  if (typeof structuredCloneFn === "function") {
    return structuredCloneFn(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const ensureNumber = (value: unknown): number => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const MONTHLY_EXPENSE_KEYS = [
  "propertyTax",
  "condoFees",
  "insurance",
  "maintenance",
  "professionalFees",
  "utilities",
  "advertising",
  "mortgageInterest",
  "officeExpenses",
  "management",
  "travel",
  "motorVehicle",
  "mortgagePrincipal",
  "mortgagePayment"
] as const;

const OPERATING_EXPENSE_KEYS = [
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
  "condoFees"
] as const;

const createDefaultMonthlyExpenses = (): Property["monthlyExpenses"] => ({
  propertyTax: 0,
  condoFees: 0,
  insurance: 0,
  maintenance: 0,
  professionalFees: 0,
  utilities: 0,
  advertising: 0,
  mortgageInterest: 0,
  officeExpenses: 0,
  management: 0,
  travel: 0,
  motorVehicle: 0,
  mortgagePrincipal: 0,
  mortgagePayment: 0,
  total: 0,
});

const preparePropertyData = (property: Property): Property => {
  const cloned = cloneData(property);

  cloned.rent = {
    ...cloned.rent,
    monthlyRent: ensureNumber(cloned.rent?.monthlyRent),
    annualRent: ensureNumber(cloned.rent?.annualRent),
  };

  if (!cloned.rent.annualRent && cloned.rent.monthlyRent) {
    cloned.rent.annualRent = cloned.rent.monthlyRent * 12;
  } else if (!cloned.rent.monthlyRent && cloned.rent.annualRent) {
    cloned.rent.monthlyRent = cloned.rent.annualRent / 12;
  }

  const defaultMonthlyExpenses = createDefaultMonthlyExpenses();
  cloned.monthlyExpenses = {
    ...defaultMonthlyExpenses,
    ...(cloned.monthlyExpenses || {}),
  };

  const monthlyExpensesRecord = cloned.monthlyExpenses as Record<string, number>;
  MONTHLY_EXPENSE_KEYS.forEach((key) => {
    monthlyExpensesRecord[key] = ensureNumber(monthlyExpensesRecord[key]);
  });

  const operatingExpensesTotal = OPERATING_EXPENSE_KEYS.reduce((sum, key) => {
    return sum + ensureNumber(monthlyExpensesRecord[key]);
  }, 0);
  const existingMortgagePayment = ensureNumber(monthlyExpensesRecord.mortgagePayment);
  let derivedMortgagePayment = existingMortgagePayment;

  if (derivedMortgagePayment <= 0 && cloned.mortgage && cloned.mortgage.originalAmount) {
    try {
      derivedMortgagePayment = getMonthlyMortgagePayment(cloned.mortgage as any) || 0;
    } catch (error) {
      const principal = ensureNumber(cloned.mortgage.originalAmount);
      const annualRate = ensureNumber(cloned.mortgage.interestRate);
      const amortizationYears = ensureNumber(cloned.mortgage.amortizationYears);

      if (principal > 0 && amortizationYears > 0) {
        const totalPayments = amortizationYears * 12;
        const monthlyRate = annualRate > 0 ? annualRate / 12 : 0;

        if (monthlyRate === 0) {
          derivedMortgagePayment = principal / totalPayments;
        } else {
          const factor = Math.pow(1 + monthlyRate, totalPayments);
          derivedMortgagePayment = principal * (monthlyRate * factor) / (factor - 1);
        }
      }
    }

    derivedMortgagePayment = Number.isFinite(derivedMortgagePayment) ? Number(derivedMortgagePayment.toFixed(2)) : 0;
  }

  monthlyExpensesRecord.mortgagePayment = derivedMortgagePayment;

  // Calculate mortgage interest
  let derivedMortgageInterest = ensureNumber(monthlyExpensesRecord.mortgageInterest);
  if (derivedMortgageInterest <= 0 && cloned.mortgage && cloned.mortgage.originalAmount) {
    try {
      derivedMortgageInterest = getMonthlyMortgageInterest(cloned.mortgage as any) || 0;
    } catch (error) {
      // Fallback calculation: approximate monthly interest
      const principal = ensureNumber(cloned.mortgage.originalAmount);
      const annualRate = ensureNumber(cloned.mortgage.interestRate);
      if (principal > 0 && annualRate > 0) {
        derivedMortgageInterest = (principal * annualRate) / 12;
      }
    }
    derivedMortgageInterest = Number.isFinite(derivedMortgageInterest) ? Number(derivedMortgageInterest.toFixed(2)) : 0;
  }
  monthlyExpensesRecord.mortgageInterest = derivedMortgageInterest;

  // Calculate mortgage principal
  let derivedMortgagePrincipal = ensureNumber(monthlyExpensesRecord.mortgagePrincipal);
  if (derivedMortgagePrincipal <= 0 && cloned.mortgage && cloned.mortgage.originalAmount) {
    try {
      derivedMortgagePrincipal = getMonthlyMortgagePrincipal(cloned.mortgage as any) || 0;
    } catch (error) {
      // Fallback calculation: approximate monthly principal
      // Principal = Payment - Interest
      const principal = ensureNumber(cloned.mortgage.originalAmount);
      const annualRate = ensureNumber(cloned.mortgage.interestRate);
      if (principal > 0 && annualRate > 0 && derivedMortgagePayment > 0) {
        const monthlyInterest = (principal * annualRate) / 12;
        derivedMortgagePrincipal = Math.max(0, derivedMortgagePayment - monthlyInterest);
      }
    }
    derivedMortgagePrincipal = Number.isFinite(derivedMortgagePrincipal) ? Number(derivedMortgagePrincipal.toFixed(2)) : 0;
  }
  monthlyExpensesRecord.mortgagePrincipal = derivedMortgagePrincipal;

  const mortgagePayment = ensureNumber(monthlyExpensesRecord.mortgagePayment);
  monthlyExpensesRecord.total = Number((operatingExpensesTotal + mortgagePayment).toFixed(2));

  cloned.monthlyPropertyTax = monthlyExpensesRecord.propertyTax || 0;
  cloned.monthlyCondoFees = monthlyExpensesRecord.condoFees || 0;
  cloned.monthlyInsurance = monthlyExpensesRecord.insurance || 0;
  cloned.monthlyMaintenance = monthlyExpensesRecord.maintenance || 0;
  cloned.monthlyProfessionalFees = monthlyExpensesRecord.professionalFees || 0;
  cloned.monthlyUtilities = monthlyExpensesRecord.utilities || 0;

  const purchasePrice = ensureNumber(cloned.purchasePrice);
  const closingCosts = ensureNumber(cloned.closingCosts);
  // Type assertion needed because initialRenovations is optional and may not be present in all property data
  const initialRenovations = ensureNumber('initialRenovations' in cloned ? (cloned as any).initialRenovations : undefined);
  const renovationCosts = ensureNumber((cloned as any).renovationCosts);
  
  // Normalize core mortgage fields while preserving any additional metadata
  // Do this BEFORE calculating downPayment to ensure we use the normalized mortgage values
  const originalMortgage: any = cloned.mortgage || {};

  // Special-case fix for SC property 403-311 Richmond St E to ensure
  // the current RMG 2.69% bi-weekly mortgage is always reflected,
  // even if older account data was seeded with outdated values.
  let normalizedMortgage: any = {
    ...originalMortgage,
    lender: originalMortgage.lender || "",
    originalAmount: ensureNumber(originalMortgage.originalAmount),
    interestRate: typeof originalMortgage.interestRate === "number"
      ? originalMortgage.interestRate
      : ensureNumber(originalMortgage.interestRate),
    rateType: originalMortgage.rateType || "",
    termMonths: ensureNumber(originalMortgage.termMonths),
    amortizationYears: ensureNumber(originalMortgage.amortizationYears),
    paymentFrequency: originalMortgage.paymentFrequency || "Monthly",
    startDate: originalMortgage.startDate || "",
  };

  if (cloned.id === 'richmond-st-e-403') {
    normalizedMortgage = {
      ...normalizedMortgage,
      lender: 'RMG',
      originalAmount: 492000,
      interestRate: 0.0269,
      rateType: 'Fixed',
      termMonths: 60,
      amortizationYears: 25,
      paymentFrequency: 'Bi-Weekly',
      startDate: '2019-02-04',
      mortgageNumber: '8963064.1',
      currentBalance: 375080.02,
      paymentAmount: 1102.28,
      renewalDate: '2027-01-28',
      remainingAmortization: '16 Years 1 Month',
    };
  }

  cloned.mortgage = normalizedMortgage;

  // Calculate down payment using normalized mortgage
  const downPayment = Math.max(0, purchasePrice - cloned.mortgage.originalAmount);
  
  // Calculate Land Transfer Tax
  const city = cloned.address?.includes('Toronto') ? 'Toronto' : '';
  const province = 'ON';
  const landTransferTax = calculateLandTransferTax(
    purchasePrice,
    city,
    province,
    (cloned as any).landTransferTax // Manual override if provided
  );
  
  // Calculate total investment
  cloned.totalInvestment = Number((downPayment + closingCosts + initialRenovations + renovationCosts + landTransferTax).toFixed(2));
  (cloned as any).landTransferTax = landTransferTax;

  const prepared = updatePropertyFinancialMetrics
    ? updatePropertyFinancialMetrics(cloned as any)
    : cloned;

  prepared.pricePerSquareFoot = prepared.squareFootage > 0
    ? prepared.purchasePrice / prepared.squareFootage
    : 0;

  return prepared as Property;
};

// Create the context
const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

// Provider component
export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get account-specific properties from AccountContext
  // PropertyProvider is wrapped by AccountProvider, so this should always work
  const accountContext = useAccount();
  const accountProperties = accountContext?.properties;
  const saveProperties = useMemo(() => accountContext?.saveProperties || (() => {}), [accountContext?.saveProperties]);
  
  const [propertiesState, setPropertiesState] = useState<Property[]>(() => {
    // Start with empty array to avoid blocking render
    // Properties will be loaded asynchronously via useEffect
    return [];
  });
  // Start as true to prevent blocking homepage render
  const [calculationsComplete, setCalculationsComplete] = useState(true);
  
  // Update properties when account properties change
  useEffect(() => {
    // Defer property loading to prevent blocking initial render
    const timeoutId = setTimeout(() => {
      try {
        // Use account properties if defined (even if empty array for new accounts)
        // Only fall back to default properties if accountProperties is undefined/null (not loaded yet)
        const initialProperties = (accountProperties !== undefined && accountProperties !== null)
          ? accountProperties 
          : (getAllProperties() as unknown as Property[]);
        
        const preparedProperties = initialProperties.map((property) => preparePropertyData(property));
        setPropertiesState(preparedProperties);
      } catch (error) {
        console.warn('Error preparing properties:', error);
        // Set empty array as fallback
        setPropertiesState([]);
      }
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [accountProperties]);
  
  // Get all properties and portfolio metrics
  const allProperties = propertiesState;

  const updateProperty = useCallback((id: string, updatedProperty: Property, skipSave = false) => {
    setPropertiesState(prevProperties => {
      const updated = prevProperties.map(property => {
        if (property.id !== id) {
          return property;
        }

        const mergedProperty = {
          ...property,
          ...updatedProperty,
          id: property.id,
          rent: {
            ...property.rent,
            ...(updatedProperty.rent || {}),
          },
          mortgage: {
            ...property.mortgage,
            ...(updatedProperty.mortgage || {}),
          },
          monthlyExpenses: {
            ...property.monthlyExpenses,
            ...(updatedProperty.monthlyExpenses || {}),
          },
          tenant: {
            ...property.tenant,
            ...(updatedProperty.tenant || {}),
          },
          expenses: {
            ...property.expenses,
            ...(updatedProperty.expenses || {}),
          },
          tenants: updatedProperty.tenants || property.tenants,
          expenseHistory: updatedProperty.expenseHistory || property.expenseHistory,
          // Properly merge propertyData to preserve imageUrls
          propertyData: {
            ...property.propertyData,
            ...(updatedProperty.propertyData || {}),
          },
        } as Property;

        return preparePropertyData(mergedProperty);
      });
      
      // Only save to account storage if not skipping (e.g., when already saved via API)
      // Defer save to prevent blocking
      if (!skipSave && saveProperties) {
        setTimeout(() => {
          try {
            saveProperties(updated);
          } catch (error) {
            console.warn('Error saving properties:', error);
          }
        }, 0);
      }
      
      return updated;
    });
  }, [saveProperties]);
  
  // Calculate mortgage payments and update property data in browser environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Ensure calculations are completed before setting calculationsComplete to true
      // Use a timeout to allow calculations to complete, but always set to true eventually
      let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
      
      const timeoutId = setTimeout(() => {
        // Verify that calculations have been applied
        // If there are no properties, we can still mark as complete
        const hasCalculations = allProperties.length === 0 || allProperties.some(property => 
          property.cashOnCashReturn !== undefined && 
          property.monthlyCashFlow !== undefined &&
          property.capRate !== undefined
        );
        
        if (hasCalculations) {
          setCalculationsComplete(true);
        } else {
          // If calculations aren't ready, set to true anyway after a short delay
          // This prevents infinite loading states
          fallbackTimeoutId = setTimeout(() => {
            setCalculationsComplete(true);
          }, 300);
        }
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        if (fallbackTimeoutId) {
          clearTimeout(fallbackTimeoutId);
        }
      };
    } else {
      setCalculationsComplete(true);
    }
  }, [allProperties]);
  
  // Ensure all properties have calculated financial metrics
  // Memoize to prevent expensive recalculations on every render
  const propertiesWithCalculations = useMemo(() => {
    if (!allProperties || allProperties.length === 0) {
      return [];
    }
    
    return allProperties.map(property => {
      // Calculate price per square foot
      const pricePerSquareFoot = property.squareFootage > 0 
        ? property.purchasePrice / property.squareFootage 
        : 0;
      
      // If calculations are missing, calculate them on the fly
      if (property.cashOnCashReturn === undefined || property.monthlyCashFlow === undefined) {
        const annualOperatingExpenses = calculateAnnualOperatingExpenses(property);
        const noi = calculateNOI(property);
        const capRate = calculateCapRate(property);
        const monthlyCashFlow = calculateMonthlyCashFlow(property);
        const annualCashFlow = calculateAnnualCashFlow(property);
        const cashOnCashReturn = calculateCashOnCashReturn(property);
        
        return {
          ...property,
          annualOperatingExpenses,
          netOperatingIncome: noi,
          capRate,
          monthlyCashFlow,
          annualCashFlow,
          cashOnCashReturn,
          pricePerSquareFoot
        };
      }
      
      // Always ensure pricePerSquareFoot is calculated
      return {
        ...property,
        pricePerSquareFoot
      };
    });
  }, [allProperties]);
  
  const metrics = useMemo(() => {
    return getPortfolioMetrics(allProperties as any);
  }, [allProperties]);

  // Memoized helper functions for performance
  const contextValue = useMemo(() => ({
    properties: propertiesWithCalculations,
    portfolioMetrics: metrics,
    calculationsComplete,
    
    // Helper functions
    getPropertyById: (id: string) => propertiesWithCalculations.find(p => p.id === id),
    getPropertyBySlug: (slug: string) => {
      const slugLower = slug.toLowerCase();
      return propertiesWithCalculations.find(p => {
        const propertySlug = generateSlug(p.nickname || p.name || '');
        return propertySlug.toLowerCase() === slugLower;
      });
    },
    getPropertiesByType: (type: string) => 
      propertiesWithCalculations.filter(property => property.propertyType.toLowerCase() === type.toLowerCase()),
    getPropertiesByLocation: (location: string) => 
      propertiesWithCalculations.filter(property => 
        property.address.toLowerCase().includes(location.toLowerCase())
      ),
    getPropertiesWithTenants: () => 
      propertiesWithCalculations.filter(property => 
        property.tenant && property.tenant.name && property.tenant.name.trim() !== ''
      ),
    getVacantProperties: () => 
      propertiesWithCalculations.filter(property => 
        !property.tenant || !property.tenant.name || property.tenant.name.trim() === ''
      ),
    updateProperty,
    
    // Loading and error states (currently static, can be enhanced later)
    loading: false,
    error: null,
  }), [propertiesWithCalculations, metrics, calculationsComplete, updateProperty]);

  return (
    <PropertyContext.Provider value={contextValue}>
      {children}
    </PropertyContext.Provider>
  );
};

// Custom hook to use the PropertyContext
export const usePropertyContext = (): PropertyContextType => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
};

// Additional convenience hooks for specific use cases
export const useProperties = (): Property[] => {
  const { properties } = usePropertyContext();
  return properties;
};

export const useProperty = (id: string): Property | undefined => {
  const { getPropertyById } = usePropertyContext();
  return getPropertyById(id);
};

export const usePortfolioMetrics = (): PortfolioMetrics => {
  const { portfolioMetrics } = usePropertyContext();
  return portfolioMetrics;
};

export const usePropertiesByType = (type: string): Property[] => {
  const { getPropertiesByType } = usePropertyContext();
  return getPropertiesByType(type);
};

export const usePropertiesWithTenants = (): Property[] => {
  const { getPropertiesWithTenants } = usePropertyContext();
  return getPropertiesWithTenants();
};

export const useVacantProperties = (): Property[] => {
  const { getVacantProperties } = usePropertyContext();
  return getVacantProperties();
};

// Export the context for direct use if needed
export { PropertyContext };

// Backward compatibility - export the old hook name
export const usePropertyData = usePropertyContext;
