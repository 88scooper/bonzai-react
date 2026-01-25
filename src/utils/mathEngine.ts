/**
 * Bonzai Math Engine
 * Unified financial calculation utilities for real estate investment analysis
 * 
 * Consolidates IRR, NPV, and LTT calculations to ensure consistency across the application
 */

/**
 * Land Transfer Tax rate schedules by effective date
 * 
 * Pre-April 1, 2026 rates (2024 rates):
 * - 0.5% on first $55,000
 * - 1.0% on $55,001 - $250,000
 * - 1.5% on $250,001 - $400,000
 * - 2.0% on $400,001 - $2,000,000
 * - 2.5% on $2,000,001 - $20,000,000
 * - 7.5% on amounts over $20,000,000
 * 
 * April 1, 2026 Toronto MLTT rates:
 * - 0.5% on first $55,000
 * - 1.0% on $55,001 - $250,000
 * - 1.5% on $250,001 - $400,000
 * - 2.0% on $400,001 - $2,000,000
 * - 2.5% on $2,000,001 - $3,000,000
 * - 4.40% on $3,000,001 - $4,000,000
 * - 5.45% on $4,000,001 - $5,000,000
 * - 6.0% on amounts over $5,000,000 (assumed - verify)
 */
const LTT_RATE_SCHEDULES = {
  // Pre-April 1, 2026 rates (2024 rates - default for null dates or dates before April 1, 2026)
  '2024-12-31': {
    provincial: [
      { threshold: 0, rate: 0.005 },      // 0.5% on first $55,000
      { threshold: 55000, rate: 0.01 },   // 1.0% on $55,001 - $250,000
      { threshold: 250000, rate: 0.015 },  // 1.5% on $250,001 - $400,000
      { threshold: 400000, rate: 0.02 },   // 2.0% on $400,001 - $2,000,000
      { threshold: 2000000, rate: 0.025 }, // 2.5% on $2,000,001 - $20,000,000
      { threshold: 20000000, rate: 0.075 }, // 7.5% on amounts over $20,000,000
    ],
    toronto: [
      { threshold: 0, rate: 0.005 },
      { threshold: 55000, rate: 0.01 },
      { threshold: 250000, rate: 0.015 },
      { threshold: 400000, rate: 0.02 },
      { threshold: 2000000, rate: 0.025 },
      { threshold: 20000000, rate: 0.075 }, // 7.5% on amounts over $20,000,000
    ],
  },
  // April 1, 2026 rates (NEW)
  '2026-04-01': {
    provincial: [
      { threshold: 0, rate: 0.005 },        // 0.5% on first $55,000
      { threshold: 55000, rate: 0.01 },     // 1.0% on $55,001 - $250,000
      { threshold: 250000, rate: 0.015 },   // 1.5% on $250,001 - $400,000
      { threshold: 400000, rate: 0.02 },     // 2.0% on $400,001 - $2,000,000
      { threshold: 2000000, rate: 0.025 },   // 2.5% on $2,000,001 - $3,000,000
    ],
    toronto: [
      { threshold: 0, rate: 0.005 },         // 0.5% on first $55,000
      { threshold: 55000, rate: 0.01 },      // 1.0% on $55,001 - $250,000
      { threshold: 250000, rate: 0.015 },     // 1.5% on $250,001 - $400,000
      { threshold: 400000, rate: 0.02 },     // 2.0% on $400,001 - $2,000,000
      { threshold: 2000000, rate: 0.025 },   // 2.5% on $2,000,001 - $3,000,000
      { threshold: 3000000, rate: 0.044 },   // 4.40% on $3,000,001 - $4,000,000
      { threshold: 4000000, rate: 0.0545 },  // 5.45% on $4,000,001 - $5,000,000
      { threshold: 5000000, rate: 0.06 },    // 6.0% on amounts over $5,000,000 (ASSUMED - VERIFY)
    ],
  },
};

/**
 * Get the appropriate LTT rate schedule based on closing date
 * DEFAULT: If date is null or before April 1, 2026, use 2024 rates
 */
function getLTTRateSchedule(closingDate: string | Date | null): typeof LTT_RATE_SCHEDULES['2026-04-01'] {
  // Default to 2024 rates if no date provided or date is before April 1, 2026
  if (!closingDate) {
    return LTT_RATE_SCHEDULES['2024-12-31'];
  }

  const date = typeof closingDate === 'string' ? new Date(closingDate) : closingDate;
  const cutoffDate = new Date('2026-04-01');
  cutoffDate.setHours(0, 0, 0, 0);
  
  // Normalize input date to start of day for comparison
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  
  // Use 2026 rates only if date is on or after April 1, 2026
  if (normalizedDate >= cutoffDate) {
    return LTT_RATE_SCHEDULES['2026-04-01'];
  } else {
    // Use 2024 rates for dates before April 1, 2026
    return LTT_RATE_SCHEDULES['2024-12-31'];
  }
}

/**
 * Calculate LTT for a single jurisdiction using graduated brackets
 */
function calculateSingleLTTWithBrackets(price: number, brackets: Array<{threshold: number, rate: number}>): number {
  let tax = 0;
  let remaining = price;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const nextBracket = brackets[i + 1];
    
    // Skip if price is below this bracket's threshold
    if (remaining <= bracket.threshold) {
      break;
    }

    // Calculate taxable amount in this bracket
    const taxableAmount = nextBracket
      ? Math.min(remaining - bracket.threshold, nextBracket.threshold - bracket.threshold)
      : remaining - bracket.threshold;

    if (taxableAmount > 0) {
      tax += taxableAmount * bracket.rate;
    }
  }

  return tax;
}

/**
 * Calculate Land Transfer Tax (LTT) for Ontario/Toronto properties
 * DATE-AWARE: Uses April 1, 2026 rates ONLY for deals closing on/after that date
 * DEFAULT: Uses 2024 rates (with 7.5% bracket for $20M+) for null dates or dates before April 1, 2026
 * 
 * @param purchasePrice - Purchase price of property
 * @param city - City name (case-insensitive)
 * @param province - Province code (default: 'ON')
 * @param closingDate - Closing date (YYYY-MM-DD or Date). If null or before April 1, 2026, uses 2024 rates.
 * @param manualOverride - Optional manual override value
 * @returns Object with tax amount, warning, and rate schedule used
 */
export function calculateLTT(
  purchasePrice: number,
  city: string = '',
  province: string = 'ON',
  closingDate: string | Date | null = null,
  manualOverride: number | null = null
): { amount: number; warning: string | null; rateSchedule: string } {
  // If manual override provided, use it
  if (manualOverride !== null && manualOverride !== undefined && manualOverride >= 0) {
    return { amount: manualOverride, warning: null, rateSchedule: 'manual' };
  }

  if (!purchasePrice || purchasePrice <= 0) {
    return { amount: 0, warning: null, rateSchedule: 'none' };
  }

  // Only calculate for Ontario properties
  if (province.toUpperCase() !== 'ON' && province.toUpperCase() !== 'ONTARIO') {
    return { amount: 0, warning: null, rateSchedule: 'none' };
  }

  // Get rate schedule based on closing date
  const rateSchedule = getLTTRateSchedule(closingDate);
  let warning: string | null = null;
  let rateScheduleName: string;
  
  if (!closingDate) {
    warning = 'No closing date provided. Using 2024 tax rates (pre-April 1, 2026). Verify property closing date to ensure correct tax calculation.';
    rateScheduleName = '2024';
  } else {
    const date = typeof closingDate === 'string' ? new Date(closingDate) : closingDate;
    const cutoffDate = new Date('2026-04-01');
    cutoffDate.setHours(0, 0, 0, 0);
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    if (normalizedDate >= cutoffDate) {
      rateScheduleName = '2026';
      warning = null; // No warning for valid 2026 dates
    } else {
      rateScheduleName = '2024';
      warning = `Closing date (${typeof closingDate === 'string' ? closingDate : closingDate.toISOString().split('T')[0]}) is before April 1, 2026. Using 2024 tax rates.`;
    }
  }

  // Calculate Provincial LTT (always for Ontario)
  const provincialLTT = calculateSingleLTTWithBrackets(
    purchasePrice,
    rateSchedule.provincial
  );

  // Calculate Municipal LTT (only for Toronto)
  const isToronto = city && city.toUpperCase().includes('TORONTO');
  const municipalLTT = isToronto
    ? calculateSingleLTTWithBrackets(purchasePrice, rateSchedule.toronto)
    : 0;

  const totalLTT = provincialLTT + municipalLTT;

  return { amount: totalLTT, warning, rateSchedule: rateScheduleName };
}

/**
 * Calculate Net Present Value (NPV)
 * 
 * @param cashFlows - Array of cash flows (Year 0 = initial investment as negative)
 * @param discountRate - Discount rate as decimal (e.g., 0.08 for 8%)
 * @returns NPV
 */
export function calculateNPV(cashFlows: number[], discountRate: number): number {
  if (!cashFlows || cashFlows.length === 0) {
    return 0;
  }

  return cashFlows.reduce((npv, cashFlow, period) => {
    return npv + cashFlow / Math.pow(1 + discountRate, period);
  }, 0);
}

/**
 * IRR Calculation Options
 */
export interface IRRCalculationOptions {
  maxIterations?: number;
  tolerance?: number;
  allowNegativeIRR?: boolean;
  minIRR?: number;
  maxIRR?: number;
}

const DEFAULT_IRR_OPTIONS: Required<IRRCalculationOptions> = {
  maxIterations: 1000,
  tolerance: 0.000001,
  allowNegativeIRR: true,
  minIRR: -0.99, // -99%
  maxIRR: 5.0,   // 500%
};

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson method
 * 
 * CRITICAL: cashFlows[0] MUST be the initial investment as a NEGATIVE value
 * Example: [-150000, 12000, 12000, 12000, 12000, 150000]
 *          ^Year 0 (investment)  ^Years 1-4 (cash flows)  ^Year 5 (sale proceeds)
 * 
 * @param cashFlows - Array of cash flows (Year 0 = negative initial investment)
 * @param options - Calculation options
 * @returns IRR as a percentage (e.g., 8.5 for 8.5%)
 */
export function calculateIRR(
  cashFlows: number[],
  options: IRRCalculationOptions = {}
): number {
  if (!cashFlows || cashFlows.length < 2) {
    return 0;
  }

  // Validate Year 0 is negative (initial investment)
  if (cashFlows[0] >= 0) {
    console.warn('IRR calculation: Year 0 cash flow should be negative (initial investment). Got:', cashFlows[0]);
  }

  const opts = { ...DEFAULT_IRR_OPTIONS, ...options };
  let rate = 0.1; // Starting guess of 10%

  for (let i = 0; i < opts.maxIterations; i++) {
    let npv = 0;
    let dnpv = 0; // Derivative of NPV

    // Calculate NPV and its derivative
    for (let j = 0; j < cashFlows.length; j++) {
      const discountFactor = Math.pow(1 + rate, j);
      npv += cashFlows[j] / discountFactor;
      dnpv += (-j * cashFlows[j]) / Math.pow(1 + rate, j + 1);
    }

    // Guard against division by zero
    if (Math.abs(dnpv) < opts.tolerance) {
      // Derivative is near zero - adjust rate guess
      rate = rate * 1.1;
      continue;
    }

    // Newton-Raphson update: rate_new = rate_old - NPV / NPV'
    const newRate = rate - npv / dnpv;

    // Guard against invalid rate (NaN or Infinity)
    if (!isFinite(newRate) || isNaN(newRate)) {
      rate = rate * 0.9;
      continue;
    }

    // Check convergence
    if (Math.abs(newRate - rate) < opts.tolerance) {
      const finalRate = newRate;
      
      // Apply bounds
      if (finalRate < opts.minIRR) {
        console.warn(`IRR calculation resulted in extreme negative value: ${(finalRate * 100).toFixed(2)}%. Capping at ${(opts.minIRR * 100).toFixed(2)}%.`);
        return opts.minIRR * 100;
      }
      if (finalRate > opts.maxIRR) {
        console.warn(`IRR calculation resulted in extreme value: ${(finalRate * 100).toFixed(2)}%. Capping at ${(opts.maxIRR * 100).toFixed(2)}%.`);
        return opts.maxIRR * 100;
      }
      
      return finalRate * 100; // Return as percentage
    }

    rate = newRate;
  }

  // If not converged, return best guess (capped)
  const cappedRate = Math.max(opts.minIRR, Math.min(opts.maxIRR, rate));
  console.warn(`IRR calculation did not converge after ${opts.maxIterations} iterations. Returning: ${(cappedRate * 100).toFixed(2)}%`);
  return cappedRate * 100;
}

/**
 * Build cash flow array for property IRR calculation
 * Ensures Year 0 is properly set as negative initial investment
 * 
 * @param property - Property object
 * @param options - Calculation options
 * @returns Cash flow array [Year0, Year1, ..., YearN]
 */
export interface BuildCashFlowsOptions {
  years?: number;
  exitCapRate?: number | null;
  sellingCostsPercent?: number;
  // Import these from financialCalculations - will need to be passed or imported
  calculateAnnualCashFlow?: (property: any) => number;
  calculateNOI?: (property: any) => number;
  getMonthlyMortgagePayment?: (mortgage: any) => number;
  getMonthlyMortgageInterest?: (mortgage: any) => number;
}

export function buildProjectCashFlows(
  property: any,
  options: BuildCashFlowsOptions = {}
): number[] {
  const {
    years = 5,
    exitCapRate = null,
    sellingCostsPercent = 5.0,
    calculateAnnualCashFlow,
    calculateNOI,
    getMonthlyMortgagePayment,
    getMonthlyMortgageInterest,
  } = options;

  if (!property || !property.totalInvestment || property.totalInvestment <= 0) {
    return [];
  }

  // Validate required functions are provided
  if (!calculateAnnualCashFlow || !calculateNOI || !getMonthlyMortgagePayment || !getMonthlyMortgageInterest) {
    throw new Error('buildProjectCashFlows requires calculation functions to be provided');
  }

  const cashFlows: number[] = [];
  
  // Year 0: Initial investment (NEGATIVE)
  // Total Investment = Down Payment + LTT + Closing Costs + Renovations
  // This should already be calculated in property.totalInvestment
  cashFlows.push(-property.totalInvestment);

  // Calculate annual cash flow
  const annualCashFlow = calculateAnnualCashFlow(property);
  
  // Years 1 to N: Annual cash flows
  for (let year = 1; year <= years; year++) {
    cashFlows.push(annualCashFlow);
  }

  // Final year: Add sale proceeds
  const currentValue = property.currentMarketValue || property.currentValue || property.purchasePrice;
  let futureValue: number;

  if (exitCapRate !== null && exitCapRate > 0) {
    // Exit Cap Rate method
    const finalYearNOI = calculateNOI(property);
    
    // Guard against division by zero
    if (exitCapRate <= 0) {
      console.warn('Exit cap rate must be greater than 0. Using appreciation method.');
      futureValue = currentValue * Math.pow(1.03, years);
    } else {
      futureValue = finalYearNOI / (exitCapRate / 100);
      
      if (futureValue <= 0 || !isFinite(futureValue)) {
        // Fallback to appreciation
        futureValue = currentValue * Math.pow(1.03, years);
      }
    }
  } else {
    // Appreciation method
    futureValue = currentValue * Math.pow(1.03, years);
  }

  // Calculate remaining mortgage balance (simplified)
  const mortgageBalance = property.mortgage?.remainingBalance || property.mortgage?.originalAmount || 0;
  const monthlyMortgagePayment = getMonthlyMortgagePayment(property.mortgage) || 0;
  const monthlyInterest = getMonthlyMortgageInterest(property.mortgage) || 0;
  const annualMortgagePayment = monthlyMortgagePayment * 12;
  const annualInterest = monthlyInterest * 12;
  const annualPrincipal = annualMortgagePayment - annualInterest;
  const futureMortgageBalance = Math.max(0, mortgageBalance - (annualPrincipal * years));

  const sellingCosts = futureValue * (sellingCostsPercent / 100);
  const netSaleProceeds = futureValue - futureMortgageBalance - sellingCosts;

  // Replace last year's cash flow with cash flow + sale proceeds
  cashFlows[cashFlows.length - 1] = annualCashFlow + netSaleProceeds;

  return cashFlows;
}

/**
 * Validate custom mortgage schedule
 * Checks if the final remaining balance is $0 (within $10 tolerance)
 * 
 * @param schedule - Array of payment schedule items
 * @returns Validation result with warning if balance is not zero
 */
export interface ScheduleValidationResult {
  isValid: boolean;
  warning: string | null;
  finalBalance: number;
}

export function validateCustomSchedule(
  schedule: Array<{ remainingBalance?: number; balance?: number }>
): ScheduleValidationResult {
  if (!schedule || schedule.length === 0) {
    return {
      isValid: false,
      warning: 'Schedule is empty or invalid',
      finalBalance: 0,
    };
  }

  // Get the last payment's remaining balance
  const lastPayment = schedule[schedule.length - 1];
  const finalBalance = lastPayment.remainingBalance ?? lastPayment.balance ?? 0;
  const tolerance = 10; // $10 tolerance

  if (Math.abs(finalBalance) > tolerance) {
    return {
      isValid: false,
      warning: `Mortgage schedule does not fully amortize. Final remaining balance is $${finalBalance.toFixed(2)} (expected $0.00 within $${tolerance} tolerance). Please verify the schedule is complete.`,
      finalBalance,
    };
  }

  return {
    isValid: true,
    warning: null,
    finalBalance,
  };
}
