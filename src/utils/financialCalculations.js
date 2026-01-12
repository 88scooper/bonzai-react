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

/**
 * Calculate annual operating expenses for a property
 * EXCLUDES mortgage payments (principal and interest)
 * 
 * @param {Object} property - Property object with monthlyExpenses
 * @returns {number} Annual operating expenses
 */
import { getMonthlyMortgagePayment, getMonthlyMortgageInterest, getAnnualMortgageInterest } from './mortgageCalculator';

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
 * NOI = Annual Rental Income - Annual Operating Expenses
 * 
 * @param {Object} property - Property object
 * @returns {number} Annual NOI
 */
export function calculateNOI(property) {
  if (!property || !property.rent) {
    return 0;
  }

  // Prefer annualRent if available, otherwise calculate from monthlyRent
  const annualRentalIncome = property.rent.annualRent || (property.rent.monthlyRent ? property.rent.monthlyRent * 12 : 0);
  const annualOperatingExpenses = calculateAnnualOperatingExpenses(property);
  
  return annualRentalIncome - annualOperatingExpenses;
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
 * Simplified calculation based on 5-year holding period
 * 
 * @param {Object} property - Property object
 * @param {number} years - Holding period in years (default 5)
 * @returns {number} IRR as a percentage
 */
export function calculateIRR(property, years = 5) {
  if (!property || !property.totalInvestment || property.totalInvestment <= 0) {
    return 0;
  }

  // Calculate annual cash flows
  const annualCashFlow = calculateAnnualCashFlow(property);
  
  // Estimate sale proceeds at end of holding period
  // Assume modest appreciation (3% annually)
  const currentValue = property.currentMarketValue || property.currentValue || property.purchasePrice;
  const appreciationRate = 0.03; // 3% annual appreciation
  const futureValue = currentValue * Math.pow(1 + appreciationRate, years);
  
  // Estimate remaining mortgage balance (simplified - assumes linear amortization)
  const mortgagePayment = deriveMonthlyMortgagePayment(property);
  let monthlyInterest = 0;
  if (property.mortgage) {
    try {
      monthlyInterest = getMonthlyMortgageInterest(property.mortgage);
    } catch (e) {
      // Fallback calculation
      const annualRate = property.mortgage.interestRate || 0;
      const currentBalance = property.mortgage.remainingBalance || property.mortgage.originalAmount || 0;
      monthlyInterest = (currentBalance * annualRate) / 12;
    }
  }
  const annualPrincipalPayment = (mortgagePayment * 12) - (monthlyInterest * 12);
  const currentMortgageBalance = property.mortgage?.remainingBalance || property.mortgage?.originalAmount || 0;
  const futureMortgageBalance = Math.max(0, currentMortgageBalance - (annualPrincipalPayment * years));
  
  // Sale proceeds = future value - remaining mortgage - selling costs (assume 5%)
  const sellingCosts = futureValue * 0.05;
  const netSaleProceeds = futureValue - futureMortgageBalance - sellingCosts;
  
  // Use Newton-Raphson method to find IRR
  // NPV = -Initial Investment + Sum(CF/(1+IRR)^t) + Sale Proceeds/(1+IRR)^n
  let irr = 0.1; // Starting guess of 10%
  const tolerance = 0.0001;
  const maxIterations = 100;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = -property.totalInvestment;
    
    // Add annual cash flows
    for (let year = 1; year <= years; year++) {
      npv += annualCashFlow / Math.pow(1 + irr, year);
    }
    
    // Add sale proceeds
    npv += netSaleProceeds / Math.pow(1 + irr, years);
    
    // Calculate derivative
    let derivative = 0;
    for (let year = 1; year <= years; year++) {
      derivative -= (year * annualCashFlow) / Math.pow(1 + irr, year + 1);
    }
    derivative -= (years * netSaleProceeds) / Math.pow(1 + irr, years + 1);
    
    // Newton-Raphson update
    const newIrr = irr - npv / derivative;
    
    if (Math.abs(newIrr - irr) < tolerance) {
      irr = newIrr;
      break;
    }
    
    irr = newIrr;
    
    // Prevent extreme values but allow reasonable ranges
    // Cap at reasonable extremes: -99% (total loss) to 1000% (exceptional returns)
    // Values outside this range typically indicate calculation errors
    if (irr < -0.99) {
      console.warn(`IRR calculation resulted in extreme negative value: ${(irr * 100).toFixed(2)}%. Capping at -99%.`);
      irr = -0.99;
    }
    // Allow high IRR values (up to 500% = 5.0 decimal) without issue
    // Warn if unusually high (100-500%) but allow it
    if (irr > 1.0 && irr <= 5.0) { // 100% to 500% - warn but allow
      console.warn(`IRR calculation resulted in unusually high value: ${(irr * 100).toFixed(2)}%. Verify property data.`);
    }
    // Cap at extremely unrealistic values (>500% = 5.0 decimal = 500%)
    // Values this high typically indicate calculation errors or incorrect data
    if (irr > 5.0) {
      console.warn(`IRR calculation resulted in extreme value: ${(irr * 100).toFixed(2)}%. Capping at 500%. Verify property data inputs.`);
      irr = 5.0;
    }
  }
  
  return irr * 100; // Convert to percentage
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
