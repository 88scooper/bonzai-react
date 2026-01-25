/**
 * Centralized Financial Calculations for Real Estate Investment Analysis
 * 
 * This module provides accurate, standardized calculations for:
 * - Operating Expenses (excluding mortgage payments)
 * - Net Operating Income (NOI)
 * - Cap Rate
 * - Cash Flow (after debt service)
 * 
 * All calculations follow standard real estate investment principles.
 */

import { getMonthlyMortgagePayment, getMonthlyMortgageInterest, getAnnualMortgageInterest } from './mortgageCalculator';
import { calculateLTT as calculateLTTUnified, calculateIRR as calculateIRRUnified, buildProjectCashFlows } from './mathEngine';

/**
 * Calculate annual operating expenses for a property
 * EXCLUDES mortgage payments (principal and interest)
 * 
 * @param {Object} property - Property object with monthlyExpenses
 * @returns {number} Annual operating expenses
 */

/**
 * Calculate Land Transfer Tax (LTT) for Ontario/Toronto properties
 * 
 * NOTE: This function now uses the unified mathEngine for date-aware calculations.
 * For full warning support, use calculateLTT directly from mathEngine.
 * 
 * @param {number} purchasePrice - Purchase price of property
 * @param {string} city - City name (case-insensitive)
 * @param {string} province - Province code (default: 'ON')
 * @param {string|Date} closingDate - Closing date (YYYY-MM-DD or Date). If null, uses 2024 rates.
 * @param {number} manualOverride - Optional manual override value (if provided, returns this instead)
 * @returns {number} Total Land Transfer Tax in dollars
 */
export function calculateLandTransferTax(purchasePrice, city = '', province = 'ON', closingDate = null, manualOverride = null) {
  const result = calculateLTTUnified(purchasePrice, city, province, closingDate, manualOverride);
  
  // Log warning if present
  if (result.warning) {
    console.warn('LTT Calculation:', result.warning);
  }
  
  // Return number for backward compatibility
  // Note: Warnings are lost in this return. For full warning support, call calculateLTT directly from mathEngine
  return result.amount;
}

const deriveMonthlyMortgagePayment = (property) => {
  if (!property) {
    return 0;
  }

  const precomputed = property.monthlyExpenses?.mortgagePayment;
  if (typeof precomputed === 'number' && precomputed > 0) {
    return precomputed;
  }

  const mortgage = property.mortgage;
  if (!mortgage) {
    return 0;
  }

  try {
    const payment = getMonthlyMortgagePayment(mortgage);
    if (Number.isFinite(payment) && payment > 0) {
      return payment;
    }
  } catch (error) {
    // Fallback to manual calculation below
  }

  const principal = Number(mortgage.originalAmount) || 0;
  const annualRate = Number(mortgage.interestRate) || 0;
  const amortizationYears = Number(mortgage.amortizationYears) || 0;

  if (principal <= 0 || amortizationYears <= 0) {
    return 0;
  }

  const totalPayments = amortizationYears * 12;
  const monthlyRate = annualRate > 0 ? annualRate / 12 : 0;

  if (monthlyRate === 0) {
    return principal / totalPayments;
  }

  const factor = Math.pow(1 + monthlyRate, totalPayments);
  return principal * (monthlyRate * factor) / (factor - 1);
};

export function calculateAnnualOperatingExpenses(property) {
  if (!property || !property.monthlyExpenses) {
    return 0;
  }

  const monthlyOperatingExpenses = 
    (property.monthlyExpenses.propertyTax || 0) +
    (property.monthlyExpenses.condoFees || 0) +
    (property.monthlyExpenses.insurance || 0) +
    (property.monthlyExpenses.maintenance || 0) +
    (property.monthlyExpenses.professionalFees || 0) +
    (property.monthlyExpenses.utilities || 0);

  return monthlyOperatingExpenses * 12;
}

/**
 * Calculate Net Operating Income (NOI) for a property
 * 
 * MATH PROOF:
 * NOI = Effective Gross Income - Operating Expenses
 * Where:
 *   Effective Gross Income = Potential Gross Income × (1 - Vacancy Rate)
 *   Potential Gross Income = Annual Rental Income
 *   Operating Expenses = Property Tax + Insurance + Maintenance + Utilities + Condo Fees + Professional Fees
 * 
 * Industry Standard: NOI excludes debt service (mortgage payments) and CapEx
 * 
 * Example: $1,200,000 property, $60,000 annual rent, 5% vacancy, $18,000 operating expenses
 * Effective Gross Income = $60,000 × (1 - 0.05) = $57,000
 * NOI = $57,000 - $18,000 = $39,000
 * 
 * @param {Object} property - Property object
 * @param {number} vacancyRate - Vacancy rate as decimal (e.g., 0.05 for 5%). Defaults to property.vacancyRate or 0
 * @returns {number} Annual NOI
 */
export function calculateNOI(property, vacancyRate = null) {
  if (!property || !property.rent) {
    return 0;
  }

  // Get vacancy rate from parameter, property, or default to 0
  const effectiveVacancyRate = vacancyRate !== null 
    ? vacancyRate 
    : (property.vacancyRate !== undefined ? property.vacancyRate : 0);
  
  // Ensure vacancy rate is between 0 and 1
  const normalizedVacancyRate = Math.max(0, Math.min(1, effectiveVacancyRate));

  // Prefer annualRent if available, otherwise calculate from monthlyRent
  const potentialGrossIncome = property.rent.annualRent || 
    (property.rent.monthlyRent ? property.rent.monthlyRent * 12 : 0);
  
  // Apply vacancy adjustment: Effective Gross Income = Potential × (1 - Vacancy)
  const effectiveGrossIncome = potentialGrossIncome * (1 - normalizedVacancyRate);
  
  const annualOperatingExpenses = calculateAnnualOperatingExpenses(property);
  
  // NOI = Effective Gross Income - Operating Expenses
  return effectiveGrossIncome - annualOperatingExpenses;
}

/**
 * Calculate Cap Rate for a property
 * Cap Rate = NOI / Current Market Value
 * 
 * @param {Object} property - Property object
 * @returns {number} Cap Rate as a percentage (e.g., 5.5 for 5.5%)
 */
export function calculateCapRate(property) {
  if (!property || !property.currentMarketValue || property.currentMarketValue <= 0) {
    return 0;
  }

  const noi = calculateNOI(property);
  return (noi / property.currentMarketValue) * 100;
}

/**
 * Calculate monthly cash flow for a property
 * Cash Flow = Monthly Rent - Monthly Operating Expenses - Monthly Mortgage Payment
 * 
 * @param {Object} property - Property object
 * @returns {number} Monthly cash flow
 */
export function calculateMonthlyCashFlow(property) {
  if (!property || !property.rent || !property.rent.monthlyRent) {
    return 0;
  }

  const monthlyRent = property.rent.monthlyRent;
  const monthlyOperatingExpenses = calculateAnnualOperatingExpenses(property) / 12;
  const monthlyMortgagePayment = deriveMonthlyMortgagePayment(property);

  return monthlyRent - monthlyOperatingExpenses - monthlyMortgagePayment;
}

/**
 * Calculate annual cash flow for a property
 * 
 * @param {Object} property - Property object
 * @returns {number} Annual cash flow
 */
export function calculateAnnualCashFlow(property) {
  return calculateMonthlyCashFlow(property) * 12;
}

/**
 * Calculate Cash-on-Cash Return for a property
 * Cash-on-Cash = Annual Cash Flow / Total Cash Invested
 * 
 * @param {Object} property - Property object
 * @returns {number} Cash-on-Cash return as a percentage
 */
export function calculateCashOnCashReturn(property) {
  if (!property || !property.totalInvestment || property.totalInvestment <= 0) {
    return 0;
  }

  const annualCashFlow = calculateAnnualCashFlow(property);
  return (annualCashFlow / property.totalInvestment) * 100;
}

/**
 * Calculate Annual Debt Service (mortgage payments)
 * 
 * @param {Object} property - Property object with mortgage
 * @returns {number} Annual debt service
 */
export function calculateAnnualDebtService(property) {
  if (!property) {
    return 0;
  }

  const monthlyMortgagePayment = deriveMonthlyMortgagePayment(property);
  return monthlyMortgagePayment * 12;
}

/**
 * Calculate Debt Service Coverage Ratio (DSCR)
 * DSCR = NOI / Annual Debt Service
 * 
 * @param {Object} property - Property object
 * @returns {number} DSCR ratio
 */
export function calculateDSCR(property) {
  if (!property) {
    return 0;
  }

  const noi = calculateNOI(property);
  const annualDebtService = calculateAnnualDebtService(property);

  if (annualDebtService <= 0) {
    return 0;
  }

  return noi / annualDebtService;
}

/**
 * Calculate Internal Rate of Return (IRR) for a property
 * 
 * MATH PROOF:
 * IRR is the discount rate that makes NPV = 0:
 * 0 = -Initial Investment + Σ(Annual Cash Flow / (1+IRR)^t) + Net Sale Proceeds / (1+IRR)^n
 * 
 * Where:
 * - Initial Investment = Down Payment + Closing Costs + LTT + Immediate CapEx
 * - Annual Cash Flow = (Rent - Operating Expenses - Debt Service) × 12
 * - Net Sale Proceeds = Future Sale Price - Remaining Mortgage - Selling Costs
 * - Future Sale Price = Final Year NOI / Exit Cap Rate (if provided) OR Purchase Price × (1 + Appreciation)^n
 * 
 * Exit Cap Rate Method (Preferred):
 * Future Sale Price = NOI_final / (Exit Cap Rate / 100)
 * This is more accurate than appreciation as it reflects income-based valuation
 * 
 * Example: $1,200,000 property, $39,000 NOI, 5% exit cap rate
 * Future Sale Price = $39,000 / 0.05 = $780,000
 * 
 * Newton-Raphson Method:
 * IRR_new = IRR_old - NPV(IRR_old) / NPV'(IRR_old)
 * Where NPV' is the derivative of NPV with respect to IRR
 * 
 * @param {Object} property - Property object
 * @param {number} years - Holding period in years (default 5)
 * @param {number} exitCapRate - Exit cap rate as percentage (e.g., 5.0 for 5%). If not provided, uses 3% appreciation
 * @param {number} sellingCostsPercent - Selling costs as percentage (e.g., 5.0 for 5%). Default 5%
 * @returns {number} IRR as a percentage
 */
export function calculateIRR(property, years = 5, exitCapRate = null, sellingCostsPercent = 5.0) {
  if (!property || !property.totalInvestment || property.totalInvestment <= 0) {
    return 0;
  }

  // Build cash flow array using unified function
  // This ensures Year 0 is properly set as negative initial investment
  const cashFlows = buildProjectCashFlows(property, {
    years,
    exitCapRate,
    sellingCostsPercent,
    calculateAnnualCashFlow: calculateAnnualCashFlow,
    calculateNOI: calculateNOI,
    getMonthlyMortgagePayment: (mortgage) => {
      if (!mortgage) return 0;
      try {
        return getMonthlyMortgagePayment(mortgage);
      } catch (e) {
        return deriveMonthlyMortgagePayment({ mortgage });
      }
    },
    getMonthlyMortgageInterest: (mortgage) => {
      if (!mortgage) return 0;
      try {
        return getMonthlyMortgageInterest(mortgage);
      } catch (e) {
        return 0;
      }
    },
  });
  
  if (cashFlows.length < 2) {
    return 0;
  }

  // Use unified IRR calculation from mathEngine
  return calculateIRRUnified(cashFlows, {
    maxIterations: 1000,
    tolerance: 0.000001,
    allowNegativeIRR: true,
  });
}

/**
 * Calculate portfolio-level metrics
 * 
 * @param {Array} properties - Array of property objects
 * @returns {Object} Portfolio metrics
 */
export function calculatePortfolioMetrics(properties) {
  if (!properties || properties.length === 0) {
    return {
      totalValue: 0,
      totalInvestment: 0,
      totalEquity: 0,
      totalMortgageBalance: 0,
      totalMonthlyRent: 0,
      totalAnnualOperatingExpenses: 0,
      netOperatingIncome: 0,
      totalMonthlyCashFlow: 0,
      totalAnnualCashFlow: 0,
      averageCapRate: 0,
      averageCashOnCashReturn: 0,
      totalProperties: 0
    };
  }

  const totalValue = properties.reduce((sum, property) => sum + (property.currentMarketValue || 0), 0);
  const totalInvestment = properties.reduce((sum, property) => sum + (property.totalInvestment || 0), 0);
  const totalMortgageBalance = properties.reduce((sum, property) => sum + (property.mortgage?.remainingBalance || 0), 0);
  const totalEquity = totalValue - totalMortgageBalance;
  
  const totalMonthlyRent = properties.reduce((sum, property) => sum + (property.rent?.monthlyRent || 0), 0);
  const totalAnnualOperatingExpenses = properties.reduce((sum, property) => sum + calculateAnnualOperatingExpenses(property), 0);
  const netOperatingIncome = (totalMonthlyRent * 12) - totalAnnualOperatingExpenses;
  
  const totalMonthlyCashFlow = properties.reduce((sum, property) => sum + calculateMonthlyCashFlow(property), 0);
  const totalAnnualCashFlow = totalMonthlyCashFlow * 12;
  
  const averageCapRate = properties.reduce((sum, property) => sum + calculateCapRate(property), 0) / properties.length;
  const averageCashOnCashReturn = properties.reduce((sum, property) => sum + calculateCashOnCashReturn(property), 0) / properties.length;

  return {
    totalValue,
    totalInvestment,
    totalEquity,
    totalMortgageBalance,
    totalMonthlyRent,
    totalAnnualOperatingExpenses,
    netOperatingIncome,
    totalMonthlyCashFlow,
    totalAnnualCashFlow,
    averageCapRate,
    averageCashOnCashReturn,
    totalProperties: properties.length
  };
}

/**
 * Update property financial metrics using standardized calculations
 * 
 * @param {Object} property - Property object to update
 * @returns {Object} Updated property object
 */
export function updatePropertyFinancialMetrics(property) {
  if (!property) {
    return property;
  }

  // Calculate and update all financial metrics
  const annualOperatingExpenses = calculateAnnualOperatingExpenses(property);
  const noi = calculateNOI(property);
  const capRate = calculateCapRate(property);
  const monthlyCashFlow = calculateMonthlyCashFlow(property);
  const annualCashFlow = calculateAnnualCashFlow(property);
  const cashOnCashReturn = calculateCashOnCashReturn(property);

  // Update property object
  return {
    ...property,
    annualOperatingExpenses,
    netOperatingIncome: noi,
    capRate,
    monthlyCashFlow,
    annualCashFlow,
    cashOnCashReturn
  };
}

/**
 * Calculate annual tax savings from mortgage interest deduction
 * Mortgage interest is tax-deductible for rental properties in Canada
 * 
 * @param {Object} property - Property object with mortgage
 * @param {number} marginalTaxRate - Optional marginal tax rate as decimal (e.g., 0.40 for 40%)
 *                                   If not provided, will estimate based on typical investor income
 * @returns {number} Annual tax savings in dollars
 */
export function calculateAnnualTaxSavings(property, marginalTaxRate = null) {
  if (!property || !property.mortgage) {
    return 0;
  }

  try {
    const annualInterest = getAnnualMortgageInterest(property.mortgage);
    
    // If tax rate not provided, estimate based on typical investor income
    // Assume $150k annual income (middle-high bracket)
    // Using simplified estimation - 40% combined federal + provincial (typical for $150k income)
    const taxRate = marginalTaxRate ?? 0.40;
    
    return annualInterest * taxRate;
  } catch (error) {
    console.warn('Error calculating tax savings:', error);
    return 0;
  }
}

/**
 * Calculate after-tax cash flow (cash flow + tax savings)
 * 
 * @param {Object} property - Property object
 * @param {number} marginalTaxRate - Optional marginal tax rate as decimal
 * @returns {number} After-tax annual cash flow
 */
export function calculateAfterTaxCashFlow(property, marginalTaxRate = null) {
  const annualCashFlow = calculateAnnualCashFlow(property);
  const taxSavings = calculateAnnualTaxSavings(property, marginalTaxRate);
  
  return annualCashFlow + taxSavings;
}
