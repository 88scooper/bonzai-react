// Mortgage amortization calculator utility
// Compatible with existing property data structure

export interface MortgageData {
  lender: string;
  originalAmount: number;
  interestRate: number; // as decimal (e.g., 0.0269 for 2.69%)
  rateType: string;
  termMonths: number;
  amortizationYears: number;
  paymentFrequency: string;
  startDate: string;
}

export interface PaymentScheduleItem {
  paymentNumber: number;
  paymentDate: string;
  monthlyPayment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface AmortizationSchedule {
  payments: PaymentScheduleItem[];
  totalInterest: number;
  totalPayments: number;
  finalPaymentDate: string;
}

// -----------------------------
// Richmond St E (Mortgage #8963064.1)
// Custom amortization schedule sourced from lender CSV:
// "Mortgage Amortization_All_8963064_1.csv"
// -----------------------------

const RICHMOND_MORTGAGE_NUMBER = "8963064.1";

// Raw CSV exported from lender portal for remaining payments until renewal
// Columns: Date, Principal Paid, Interest Paid, Total Paid, Principal Balance
const richmondAmortizationCsv = `
Date,Principal Paid,Interest Paid,Total Paid,Principal Balance
"Thu, Dec 18, 2025",-$716.60,-$385.68,"-$1,102.28","$374,363.42"
"Thu, Jan 1, 2026",-$717.34,-$384.94,"-$1,102.28","$373,646.08"
"Thu, Jan 15, 2026",-$718.08,-$384.20,"-$1,102.28","$372,928.00"
"Thu, Jan 29, 2026",-$718.82,-$383.46,"-$1,102.28","$372,209.18"
"Thu, Feb 12, 2026",-$719.56,-$382.72,"-$1,102.28","$371,489.62"
"Thu, Feb 26, 2026",-$720.30,-$381.98,"-$1,102.28","$370,769.32"
"Thu, Mar 12, 2026",-$721.04,-$381.24,"-$1,102.28","$370,048.28"
"Thu, Mar 26, 2026",-$721.78,-$380.50,"-$1,102.28","$369,326.50"
"Thu, Apr 9, 2026",-$722.52,-$379.76,"-$1,102.28","$368,603.98"
"Thu, Apr 23, 2026",-$723.26,-$379.02,"-$1,102.28","$367,880.72"
"Thu, May 7, 2026",-$724.01,-$378.27,"-$1,102.28","$367,156.71"
"Thu, May 21, 2026",-$724.75,-$377.53,"-$1,102.28","$366,431.96"
"Thu, Jun 4, 2026",-$725.50,-$376.78,"-$1,102.28","$365,706.46"
"Thu, Jun 18, 2026",-$726.24,-$376.04,"-$1,102.28","$364,980.22"
"Thu, Jul 2, 2026",-$726.99,-$375.29,"-$1,102.28","$364,253.23"
"Thu, Jul 16, 2026",-$727.74,-$374.54,"-$1,102.28","$363,525.49"
"Thu, Jul 30, 2026",-$728.49,-$373.79,"-$1,102.28","$362,797.00"
"Thu, Aug 13, 2026",-$729.23,-$373.05,"-$1,102.28","$362,067.77"
"Thu, Aug 27, 2026",-$729.98,-$372.30,"-$1,102.28","$361,337.79"
"Thu, Sep 10, 2026",-$730.74,-$371.54,"-$1,102.28","$360,607.05"
"Thu, Sep 24, 2026",-$731.49,-$370.79,"-$1,102.28","$359,875.56"
"Thu, Oct 8, 2026",-$732.24,-$370.04,"-$1,102.28","$359,143.32"
"Thu, Oct 22, 2026",-$732.99,-$369.29,"-$1,102.28","$358,410.33"
"Thu, Nov 5, 2026",-$733.75,-$368.53,"-$1,102.28","$357,676.58"
"Thu, Nov 19, 2026",-$734.50,-$367.78,"-$1,102.28","$356,942.08"
"Thu, Dec 3, 2026",-$735.26,-$367.02,"-$1,102.28","$356,206.82"
"Thu, Dec 17, 2026",-$736.01,-$366.27,"-$1,102.28","$355,470.81"
"Thu, Dec 31, 2026",-$736.77,-$365.51,"-$1,102.28","$354,734.04"
"Thu, Jan 14, 2027",-$737.53,-$364.75,"-$1,102.28","$353,996.51"
"Thu, Jan 28, 2027",-$738.28,-$364.00,"-$1,102.28","$353,258.23"
`;

function parseMoney(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,",]/g, "").trim();
  if (!cleaned) return 0;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.abs(num) : 0;
}

function buildRichmondSchedule(): PaymentScheduleItem[] {
  const lines = richmondAmortizationCsv.trim().split("\n");
  const payments: PaymentScheduleItem[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    // CSV pattern: "Date",principal,interest,"total","balance"
    const match = raw.match(
      /^"([^"]+)",([^,]+),([^,]+),"([^"]+)","([^"]+)"$/
    );
    if (!match) {
      continue;
    }

    const [, dateStr, principalStr, interestStr, totalStr, balanceStr] = match;

    const jsDate = new Date(dateStr);
    const isoDate = isNaN(jsDate.getTime())
      ? dateStr
      : jsDate.toISOString().split("T")[0];

    payments.push({
      paymentNumber: i,
      paymentDate: isoDate,
      monthlyPayment: parseMoney(totalStr),
      principal: parseMoney(principalStr),
      interest: parseMoney(interestStr),
      remainingBalance: parseMoney(balanceStr),
    });
  }

  return payments;
}

const richmondMortgageSchedule: PaymentScheduleItem[] = buildRichmondSchedule();

export interface MortgageYearlySummary {
  /**
   * Year number in the projection horizon starting at 1.
   */
  year: number;
  /**
   * Total payment (principal + interest) made during the year.
   */
  totalPayment: number;
  /**
   * Principal portion of payments during the year.
   */
  totalPrincipal: number;
  /**
   * Interest portion of payments during the year.
   */
  totalInterest: number;
  /**
   * Remaining balance after the final payment of the year.
   */
  endingBalance: number;
  /**
   * Number of payments made during the year.
   */
  payments: number;
}

/**
 * Calculate mortgage payment amount based on payment frequency
 */
function calculatePaymentAmount(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  paymentFrequency: string
): number {
  const totalPayments = getTotalPayments(amortizationYears, paymentFrequency);
  const periodicRate = getPeriodicRate(annualRate, paymentFrequency);
  
  if (periodicRate === 0) {
    return principal / totalPayments;
  }
  
  return principal * (periodicRate * Math.pow(1 + periodicRate, totalPayments)) / 
         (Math.pow(1 + periodicRate, totalPayments) - 1);
}

/**
 * Get total number of payments based on frequency
 */
function getTotalPayments(amortizationYears: number, paymentFrequency: string): number {
  switch (paymentFrequency.toLowerCase()) {
    case 'monthly':
      return amortizationYears * 12;
    case 'semi-monthly':
      return amortizationYears * 24;
    case 'bi-weekly':
    case 'accelerated bi-weekly':
      return amortizationYears * 26;
    case 'weekly':
    case 'accelerated weekly':
      return amortizationYears * 52;
    default:
      return amortizationYears * 12; // Default to monthly
  }
}

/**
 * Get the number of payments made each year based on payment frequency.
 */
function getPaymentsPerYear(paymentFrequency: string): number {
  switch (paymentFrequency.toLowerCase()) {
    case 'monthly':
      return 12;
    case 'semi-monthly':
      return 24;
    case 'bi-weekly':
    case 'accelerated bi-weekly':
      return 26;
    case 'weekly':
    case 'accelerated weekly':
      return 52;
    default:
      return 12;
  }
}

/**
 * Get periodic interest rate based on payment frequency
 */
function getPeriodicRate(annualRate: number, paymentFrequency: string): number {
  // Canadian mortgage calculation uses semi-annual compounding
  // Step 1: Calculate effective semi-annual rate
  const semiAnnualRate = annualRate / 2;
  
  // Step 2: Convert to equivalent periodic rate using Canadian method
  // For monthly: r = (1 + semiAnnualRate)^(1/6) - 1
  // For bi-weekly: r = (1 + semiAnnualRate)^(1/13) - 1  
  // For weekly: r = (1 + semiAnnualRate)^(1/26) - 1
  
  switch (paymentFrequency.toLowerCase()) {
    case 'monthly':
    case 'semi-monthly':
      return Math.pow(1 + semiAnnualRate, 1/6) - 1;
    case 'bi-weekly':
    case 'accelerated bi-weekly':
      return Math.pow(1 + semiAnnualRate, 1/13) - 1;
    case 'weekly':
    case 'accelerated weekly':
      return Math.pow(1 + semiAnnualRate, 1/26) - 1;
    default:
      return Math.pow(1 + semiAnnualRate, 1/6) - 1; // Default to monthly
  }
}

/**
 * Calculate the number of days to add for next payment based on frequency
 */
function getPaymentIntervalDays(paymentFrequency: string): number {
  switch (paymentFrequency.toLowerCase()) {
    case 'monthly':
      return 30; // Approximate
    case 'semi-monthly':
      return 15; // Approximate
    case 'bi-weekly':
    case 'accelerated bi-weekly':
      return 14;
    case 'weekly':
    case 'accelerated weekly':
      return 7;
    default:
      return 30;
  }
}

/**
 * Calculate complete amortization schedule for a mortgage
 */
export function calculateAmortizationSchedule(mortgage: MortgageData): AmortizationSchedule {
  // If we have a lender-provided custom schedule for this mortgage, use it directly.
  // Currently supported: Richmond St E (mortgage number 8963064.1).
  const mortgageAny = mortgage as any;
  if (mortgageAny.mortgageNumber === RICHMOND_MORTGAGE_NUMBER) {
    const payments = richmondMortgageSchedule;
    const totalInterest = payments.reduce((sum, p) => sum + p.interest, 0);
    const totalPayments = payments.length;
    const finalPaymentDate = payments[payments.length - 1]?.paymentDate || "";

    return {
      payments,
      totalInterest,
      totalPayments,
      finalPaymentDate,
    };
  }

  // Validate inputs
  if (!mortgage.originalAmount || mortgage.originalAmount <= 0) {
    throw new Error('Invalid mortgage amount');
  }
  
  if (mortgage.interestRate === undefined || mortgage.interestRate === null) {
    throw new Error('Invalid interest rate');
  }
  
  if (!mortgage.amortizationYears || mortgage.amortizationYears <= 0) {
    throw new Error('Invalid amortization period');
  }

  const principal = mortgage.originalAmount;
  const annualRate = mortgage.interestRate;
  const amortizationYears = mortgage.amortizationYears;
  const paymentFrequency = mortgage.paymentFrequency;
  const startDate = new Date(mortgage.startDate);

  // Calculate payment amount
  const paymentAmount = calculatePaymentAmount(principal, annualRate, amortizationYears, paymentFrequency);
  const totalPayments = getTotalPayments(amortizationYears, paymentFrequency);
  const periodicRate = getPeriodicRate(annualRate, paymentFrequency);
  const paymentIntervalDays = getPaymentIntervalDays(paymentFrequency);

  const payments: PaymentScheduleItem[] = [];
  let remainingBalance = principal;
  let totalInterest = 0;

  for (let i = 1; i <= totalPayments; i++) {
    const interestPayment = remainingBalance * periodicRate;
    const principalPayment = Math.min(paymentAmount - interestPayment, remainingBalance);
    const actualPayment = principalPayment + interestPayment;

    // Handle final payment
    if (i === totalPayments) {
      const finalPrincipal = remainingBalance;
      const finalInterest = finalPrincipal * periodicRate;
      remainingBalance = 0;
      totalInterest += finalInterest;
      
      payments.push({
        paymentNumber: i,
        paymentDate: new Date(startDate.getTime() + (i - 1) * paymentIntervalDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        monthlyPayment: finalPrincipal + finalInterest,
        principal: finalPrincipal,
        interest: finalInterest,
        remainingBalance: 0
      });
    } else {
      remainingBalance -= principalPayment;
      totalInterest += interestPayment;

      payments.push({
        paymentNumber: i,
        paymentDate: new Date(startDate.getTime() + (i - 1) * paymentIntervalDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        monthlyPayment: actualPayment,
        principal: principalPayment,
        interest: interestPayment,
        remainingBalance: remainingBalance
      });
    }
  }

  const finalPaymentDate = payments[payments.length - 1]?.paymentDate || '';

  return {
    payments,
    totalInterest,
    totalPayments,
    finalPaymentDate
  };
}

/**
 * Get current month's mortgage payment breakdown
 * Returns the principal and interest for the current payment period
 */
export function getCurrentMortgagePayment(mortgage: MortgageData): {
  principal: number;
  interest: number;
  totalPayment: number;
  paymentNumber: number;
} {
  const schedule = calculateAmortizationSchedule(mortgage);
  const currentDate = new Date();
  
  // Find the current payment period
  const currentPayment = schedule.payments.find(payment => {
    const paymentDate = new Date(payment.paymentDate);
    return paymentDate <= currentDate;
  });

  if (currentPayment) {
    return {
      principal: currentPayment.principal,
      interest: currentPayment.interest,
      totalPayment: currentPayment.monthlyPayment,
      paymentNumber: currentPayment.paymentNumber
    };
  }

  // Fallback to first payment if no current payment found
  const firstPayment = schedule.payments[0];
  return {
    principal: firstPayment.principal,
    interest: firstPayment.interest,
    totalPayment: firstPayment.monthlyPayment,
    paymentNumber: 1
  };
}

/**
 * Get monthly mortgage payment amount (converted to monthly equivalent for bi-weekly payments)
 */
export function getMonthlyMortgagePayment(mortgage: MortgageData): number {
  const paymentFrequency = (mortgage.paymentFrequency || "monthly").toLowerCase();

  // Richmond St E (RMG 2.69% bi-weekly) – use lender schedule + exact payment
  if ((mortgage as any).mortgageNumber === RICHMOND_MORTGAGE_NUMBER) {
    try {
      const schedule = calculateAmortizationSchedule(mortgage);
      const today = new Date();
      const nextPayment =
        schedule.payments.find(p => new Date(p.paymentDate) >= today) ||
        schedule.payments[schedule.payments.length - 1];

      if (!nextPayment) {
        return 0;
      }

      const periodicAmount = nextPayment.monthlyPayment;

      switch (paymentFrequency) {
        case "bi-weekly":
        case "accelerated bi-weekly":
          return periodicAmount * 26 / 12;
        case "weekly":
        case "accelerated weekly":
          return periodicAmount * 52 / 12;
        case "semi-monthly":
        case "monthly":
        default:
          return periodicAmount;
      }
    } catch (e) {
      // Fall through to generic calculation below if anything goes wrong
    }
  }

  // For accelerated payments, calculate based on monthly payment
  const monthlyPayment = calculatePaymentAmount(
    mortgage.originalAmount,
    mortgage.interestRate,
    mortgage.amortizationYears,
    'monthly'
  );

  // Convert to monthly equivalent based on payment frequency
  switch (mortgage.paymentFrequency.toLowerCase()) {
    case 'monthly':
      return calculatePaymentAmount(
        mortgage.originalAmount,
        mortgage.interestRate,
        mortgage.amortizationYears,
        'monthly'
      );
    case 'semi-monthly':
      return calculatePaymentAmount(
        mortgage.originalAmount,
        mortgage.interestRate,
        mortgage.amortizationYears,
        'monthly'
      );
    case 'bi-weekly':
      return calculatePaymentAmount(
        mortgage.originalAmount,
        mortgage.interestRate,
        mortgage.amortizationYears,
        'bi-weekly'
      ) * 26 / 12; // 26 bi-weekly payments per year / 12 months
    case 'accelerated bi-weekly':
      return (monthlyPayment / 2) * 26 / 12; // Monthly payment / 2, paid 26 times per year
    case 'weekly':
      return calculatePaymentAmount(
        mortgage.originalAmount,
        mortgage.interestRate,
        mortgage.amortizationYears,
        'weekly'
      ) * 52 / 12; // 52 weekly payments per year / 12 months
    case 'accelerated weekly':
      return (monthlyPayment / 4) * 52 / 12; // Monthly payment / 4, paid 52 times per year
    default:
      return monthlyPayment;
  }
}

/**
 * Get monthly mortgage interest payment (converted to monthly equivalent)
 */
export function getMonthlyMortgageInterest(mortgage: MortgageData): number {
  const currentPayment = getCurrentMortgagePayment(mortgage);
  const paymentFrequency = (mortgage.paymentFrequency || "monthly").toLowerCase();

  // Richmond St E – use schedule and convert to monthly equivalent
  if ((mortgage as any).mortgageNumber === RICHMOND_MORTGAGE_NUMBER) {
    try {
      const schedule = calculateAmortizationSchedule(mortgage);
      const today = new Date();
      const nextPayment =
        schedule.payments.find(p => new Date(p.paymentDate) >= today) ||
        schedule.payments[schedule.payments.length - 1];

      if (!nextPayment) {
        return 0;
      }

      const periodicInterest = nextPayment.interest;

      switch (paymentFrequency) {
        case "bi-weekly":
        case "accelerated bi-weekly":
          return periodicInterest * 26 / 12;
        case "weekly":
        case "accelerated weekly":
          return periodicInterest * 52 / 12;
        case "semi-monthly":
        case "monthly":
        default:
          return periodicInterest;
      }
    } catch (e) {
      // Fall through to generic conversion below
    }
  }
  
  // Convert to monthly equivalent based on payment frequency
  switch (paymentFrequency) {
    case 'monthly':
      return currentPayment.interest;
    case 'semi-monthly':
      return currentPayment.interest * 24 / 12; // 24 semi-monthly payments per year / 12 months
    case 'bi-weekly':
      return currentPayment.interest * 26 / 12; // 26 bi-weekly payments per year / 12 months
    case 'accelerated bi-weekly':
      // For accelerated, use monthly payment interest equivalent
      const monthlyMortgage = { ...mortgage, paymentFrequency: 'monthly' };
      const monthlyPayment = getCurrentMortgagePayment(monthlyMortgage);
      return (monthlyPayment.interest / 2) * 26 / 12;
    case 'weekly':
      return currentPayment.interest * 52 / 12; // 52 weekly payments per year / 12 months
    case 'accelerated weekly':
      // For accelerated, use monthly payment interest equivalent
      const monthlyMortgageWeekly = { ...mortgage, paymentFrequency: 'monthly' };
      const monthlyPaymentWeekly = getCurrentMortgagePayment(monthlyMortgageWeekly);
      return (monthlyPaymentWeekly.interest / 4) * 52 / 12;
    default:
      return currentPayment.interest;
  }
}

/**
 * Get monthly mortgage principal payment (converted to monthly equivalent)
 */
export function getMonthlyMortgagePrincipal(mortgage: MortgageData): number {
  const currentPayment = getCurrentMortgagePayment(mortgage);
  const paymentFrequency = (mortgage.paymentFrequency || "monthly").toLowerCase();

  // Richmond St E – use schedule principal and convert to monthly equivalent
  if ((mortgage as any).mortgageNumber === RICHMOND_MORTGAGE_NUMBER) {
    try {
      const schedule = calculateAmortizationSchedule(mortgage);
      const today = new Date();
      const nextPayment =
        schedule.payments.find(p => new Date(p.paymentDate) >= today) ||
        schedule.payments[schedule.payments.length - 1];

      if (!nextPayment) {
        return 0;
      }

      const periodicPrincipal = nextPayment.principal;

      switch (paymentFrequency) {
        case "bi-weekly":
        case "accelerated bi-weekly":
          return periodicPrincipal * 26 / 12;
        case "weekly":
        case "accelerated weekly":
          return periodicPrincipal * 52 / 12;
        case "semi-monthly":
        case "monthly":
        default:
          return periodicPrincipal;
      }
    } catch (e) {
      // Fall through to generic conversion below
    }
  }
  
  // Convert to monthly equivalent based on payment frequency
  switch (paymentFrequency) {
    case 'monthly':
      return currentPayment.principal;
    case 'semi-monthly':
      return currentPayment.principal * 24 / 12; // 24 semi-monthly payments per year / 12 months
    case 'bi-weekly':
      return currentPayment.principal * 26 / 12; // 26 bi-weekly payments per year / 12 months
    case 'accelerated bi-weekly':
      // For accelerated, use monthly payment principal equivalent
      const monthlyMortgage = { ...mortgage, paymentFrequency: 'monthly' };
      const monthlyPayment = getCurrentMortgagePayment(monthlyMortgage);
      return (monthlyPayment.principal / 2) * 26 / 12;
    case 'weekly':
      return currentPayment.principal * 52 / 12; // 52 weekly payments per year / 12 months
    case 'accelerated weekly':
      // For accelerated, use monthly payment principal equivalent
      const monthlyMortgageWeekly = { ...mortgage, paymentFrequency: 'monthly' };
      const monthlyPaymentWeekly = getCurrentMortgagePayment(monthlyMortgageWeekly);
      return (monthlyPaymentWeekly.principal / 4) * 52 / 12;
    default:
      return currentPayment.principal;
  }
}

/**
 * Calculate current mortgage balance based on payments made to date
 */
export function getCurrentMortgageBalance(mortgage: MortgageData): number {
  try {
    const schedule = calculateAmortizationSchedule(mortgage);
    const currentDate = new Date();
    
    // Find the most recent payment that has occurred
    const pastPayments = schedule.payments.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate <= currentDate;
    });

    if (pastPayments.length === 0) {
      // No payments made yet, return original amount
      return mortgage.originalAmount;
    }

    // Return the remaining balance from the most recent payment
    const mostRecentPayment = pastPayments[pastPayments.length - 1];
    return mostRecentPayment.remainingBalance;
  } catch (error) {
    console.warn(`Error calculating current mortgage balance for ${mortgage.lender}:`, error);
    // Fallback to original amount if calculation fails
    return mortgage.originalAmount;
  }
}

/**
 * Calculate total annual mortgage interest for the next 12 months
 * This is used for deductible expenses calculations
 */
export function getAnnualMortgageInterest(mortgage: MortgageData): number {
  try {
    const schedule = calculateAmortizationSchedule(mortgage);
    const currentDate = new Date();
    
    // Find the current payment period
    const currentPaymentIndex = schedule.payments.findIndex(payment => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate <= currentDate;
    });

    if (currentPaymentIndex === -1) {
      // No payments made yet, use first 12 payments
      const first12Payments = schedule.payments.slice(0, 12);
      return first12Payments.reduce((sum, payment) => sum + payment.interest, 0);
    }

    // Get the next 12 payments from current position
    const next12Payments = schedule.payments.slice(currentPaymentIndex, currentPaymentIndex + 12);
    
    // If we don't have 12 payments remaining, use what we have
    const paymentsToUse = next12Payments.length > 0 ? next12Payments : schedule.payments.slice(-12);
    
    return paymentsToUse.reduce((sum, payment) => sum + payment.interest, 0);
  } catch (error) {
    console.warn(`Error calculating annual mortgage interest for ${mortgage.lender}:`, error);
    // Fallback: estimate annual interest as 12 months of current interest
    try {
      const currentPayment = getCurrentMortgagePayment(mortgage);
      return currentPayment.interest * 12;
    } catch (fallbackError) {
      // Final fallback: estimate based on original amount and rate
      return mortgage.originalAmount * mortgage.interestRate;
    }
  }
}

/**
 * Generate forward-looking yearly mortgage payment summaries starting from the next payment.
 *
 * @param mortgage Mortgage data
 * @param yearsAhead Maximum number of years to project forward
 * @returns Array of yearly summaries including payments, principal, interest, and ending balance
 */
export function getMortgageYearlySummary(
  mortgage: MortgageData,
  yearsAhead = 30
): MortgageYearlySummary[] {
  if (!mortgage || yearsAhead <= 0) {
    return [];
  }

  const schedule = calculateAmortizationSchedule(mortgage);
  const paymentsPerYear = getPaymentsPerYear(mortgage.paymentFrequency || 'monthly');
  if (paymentsPerYear <= 0) {
    return [];
  }

  const today = new Date();
  const summaries: MortgageYearlySummary[] = [];

  const startIndex = schedule.payments.findIndex(payment => {
    const paymentDate = new Date(payment.paymentDate);
    return paymentDate >= today;
  });

  if (startIndex === -1) {
    return [];
  }

  let currentBalance: number;
  try {
    currentBalance = getCurrentMortgageBalance(mortgage);
  } catch (error) {
    console.warn(`Error getting current mortgage balance for ${mortgage.lender}:`, error);
    currentBalance = schedule.payments[startIndex - 1]
      ? schedule.payments[startIndex - 1].remainingBalance
      : mortgage.originalAmount;
  }

  let paymentIndex = startIndex;

  for (let year = 1; year <= yearsAhead && paymentIndex < schedule.payments.length; year++) {
    let totalPayment = 0;
    let totalPrincipal = 0;
    let totalInterest = 0;
    let paymentsThisYear = 0;
    let endingBalance = currentBalance;

    while (paymentIndex < schedule.payments.length && paymentsThisYear < paymentsPerYear) {
      const payment = schedule.payments[paymentIndex];
      totalPayment += payment.monthlyPayment;
      totalPrincipal += payment.principal;
      totalInterest += payment.interest;
      endingBalance = payment.remainingBalance;
      paymentIndex++;
      paymentsThisYear++;

      if (endingBalance <= 0) {
        break;
      }
    }

    summaries.push({
      year,
      totalPayment,
      totalPrincipal,
      totalInterest,
      endingBalance,
      payments: paymentsThisYear,
    });

    currentBalance = endingBalance;

    if (endingBalance <= 0) {
      break;
    }
  }

  return summaries;
}

/**
 * Get the remaining mortgage balance after a given number of future years.
 *
 * @param mortgage Mortgage data
 * @param yearsAhead Number of years into the future (0 returns the current balance)
 * @returns Remaining balance after the specified number of years
 */
export function getMortgageBalanceAtYear(mortgage: MortgageData, yearsAhead: number): number {
  if (!mortgage || yearsAhead === undefined || yearsAhead === null) {
    return 0;
  }

  if (yearsAhead <= 0) {
    try {
      return getCurrentMortgageBalance(mortgage);
    } catch (error) {
      console.warn(`Error getting current mortgage balance for ${mortgage.lender}:`, error);
      return mortgage.originalAmount;
    }
  }

  const targetYear = Math.floor(yearsAhead);
  const summaries = getMortgageYearlySummary(mortgage, targetYear);
  const summary = summaries.find(item => item.year === targetYear);

  if (summary) {
    return summary.endingBalance;
  }

  const lastSummary = summaries[summaries.length - 1];
  if (lastSummary) {
    return lastSummary.endingBalance;
  }

  return 0;
}
