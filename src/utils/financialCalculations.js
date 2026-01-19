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
 * MATH PROOF:
 * Ontario Provincial LTT (2024 rates):
 * - 0.5% on first $55,000
 * - 1.0% on $55,001 - $250,000
 * - 1.5% on $250,001 - $400,000
 * - 2.0% on amounts over $400,000
 * 
 * Toronto Municipal LTT (2024 rates):
 * - 0.5% on first $55,000
 * - 1.0% on $55,001 - $250,000
 * - 1.5% on $250,001 - $400,000
 * - 2.0% on amounts over $400,000
 * 
 * Total LTT = Provincial LTT + Municipal LTT (if Toronto)
 * 
 * Example: $1,200,000 purchase in Toronto
 * Provincial: 0.5%($55k) + 1.0%($195k) + 1.5%($150k) + 2.0%($800k) = $275 + $1,950 + $2,250 + $16,000 = $20,475
 * Municipal: Same calculation = $20,475
 * Total: $40,950
 * 
 * @param {number} purchasePrice - Purchase price of property
 * @param {string} city - City name (case-insensitive)
 * @param {string} province - Province code (default: 'ON')
 * @param {number} manualOverride - Optional manual override value (if provided, returns this instead)
 * @returns {number} Total Land Transfer Tax in dollars
 */
export function calculateLandTransferTax(purchasePrice, city = '', province = 'ON', manualOverride = null) {
  // If manual override provided, use it
  if (manualOverride !== null && manualOverride !== undefined && manualOverride >= 0) {
    return manualOverride;
  }

  if (!purchasePrice || purchasePrice <= 0) {
    return 0;
  }

  // Only calculate for Ontario properties
  if (province.toUpperCase() !== 'ON' && province.toUpperCase() !== 'ONTARIO') {
    return 0;
  }

  /**
   * Calculate LTT for a single jurisdiction (Provincial or Municipal)
   * Formula: Tiered tax brackets
   */
  const calculateSingleLTT = (price) => {
    let tax = 0;
    const remaining = price;

    // Tier 1: 0.5% on first $55,000
    if (remaining > 55000) {
      tax += 55000 * 0.005;
    } else {
      tax += remaining * 0.005;
      return tax;
    }

    // Tier 2: 1.0% on $55,001 - $250,000
    const tier2Amount = Math.min(remaining - 55000, 250000 - 55000);
    if (tier2Amount > 0) {
      tax += tier2Amount * 0.01;
    }

    // Tier 3: 1.5% on $250,001 - $400,000
    if (remaining > 250000) {
      const tier3Amount = Math.min(remaining - 250000, 400000 - 250000);
      if (tier3Amount > 0) {
        tax += tier3Amount * 0.015;
      }
    }

    // Tier 4: 2.0% on amounts over $400,000
    if (remaining > 400000) {
      tax += (remaining - 400000) * 0.02;
    }

    return tax;
  };

  // Calculate Provincial LTT (always for Ontario)
  const provincialLTT = calculateSingleLTT(purchasePrice);

  // Calculate Municipal LTT (only for Toronto)
  const isToronto = city && city.toUpperCase().includes('TORONTO');
  const municipalLTT = isToronto ? calculateSingleLTT(purchasePrice) : 0;

  return provincialLTT + municipalLTT;
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

  // Calculate annual cash flows
  const annualCashFlow = calculateAnnualCashFlow(property);
  
  // Get current property value
  const currentValue = property.currentMarketValue || property.currentValue || property.purchasePrice;
  
  // Calculate future sale price using Exit Cap Rate (preferred) or appreciation (fallback)
  let futureValue;
  
  if (exitCapRate !== null && exitCapRate > 0) {
    // EXIT CAP RATE METHOD (Preferred)
    // Future Sale Price = Final Year NOI / Exit Cap Rate
    // We use current NOI as proxy for final year NOI (in production, should project forward)
    const finalYearNOI = calculateNOI(property);
    futureValue = finalYearNOI / (exitCapRate / 100);
    
    // Ensure future value is reasonable (not negative or zero)
    if (futureValue <= 0 || !isFinite(futureValue)) {
      // Fallback to appreciation method if exit cap rate produces invalid result
      const appreciationRate = 0.03; // 3% annual appreciation
      futureValue = currentValue * Math.pow(1 + appreciationRate, years);
    }
  } else {
    // APPRECIATION METHOD (Fallback)
    // Future Sale Price = Current Value × (1 + Appreciation Rate)^Years
    const appreciationRate = 0.03; // 3% annual appreciation (hard-coded fallback)
    futureValue = currentValue * Math.pow(1 + appreciationRate, years);
  }
  
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
  
  // Sale proceeds = future value - remaining mortgage - selling costs
  const sellingCosts = futureValue * (sellingCostsPercent / 100);
  const netSaleProceeds = futureValue - futureMortgageBalance - sellingCosts;
  
  // Use Newton-Raphson method to find IRR
  // NPV = -Initial Investment + Σ(CF/(1+IRR)^t) + Sale Proceeds/(1+IRR)^n
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
    
    // Calculate derivative (NPV' with respect to IRR)
    let derivative = 0;
    for (let year = 1; year <= years; year++) {
      derivative -= (year * annualCashFlow) / Math.pow(1 + irr, year + 1);
    }
    derivative -= (years * netSaleProceeds) / Math.pow(1 + irr, years + 1);
    
    // Guard against division by zero
    if (Math.abs(derivative) < tolerance) {
      break;
    }
    
    // Newton-Raphson update: IRR_new = IRR_old - NPV / NPV'
    const newIrr = irr - npv / derivative;
    
    if (Math.abs(newIrr - irr) < tolerance) {
      irr = newIrr;
      break;
    }
    
    irr = newIrr;
    
    // Prevent extreme values but allow reasonable ranges
    if (irr < -0.99) {
      console.warn(`IRR calculation resulted in extreme negative value: ${(irr * 100).toFixed(2)}%. Capping at -99%.`);
      irr = -0.99;
    }
    if (irr > 1.0 && irr <= 5.0) {
      console.warn(`IRR calculation resulted in unusually high value: ${(irr * 100).toFixed(2)}%. Verify property data.`);
    }
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
