/**
 * Mortgage Calculation Service
 * Implements Canadian mortgage calculation standards with semi-annual compounding
 * 
 * ⚠️ DEPRECATED: This file is deprecated and should not be used for new code.
 * 
 * Please use `src/utils/mortgageCalculator.ts` instead, which is the primary
 * and actively maintained mortgage calculation system.
 * 
 * This legacy file is kept for backward compatibility but may be removed in a future version.
 * If you're writing new code or updating existing code, please migrate to mortgageCalculator.ts.
 * 
 * Migration guide:
 * - Replace `calculateMortgagePayment()` with `calculatePaymentAmount()` from mortgageCalculator.ts
 * - Replace `generateAmortizationSchedule()` with `calculateAmortizationSchedule()` from mortgageCalculator.ts
 * - Replace `calculatePeriodicRate()` with `getPeriodicRate()` from mortgageCalculator.ts (private function, use through public APIs)
 */

/**
 * Calculate the periodic interest rate for Canadian mortgages
 * Fixed rates are compounded semi-annually, variable rates are compounded monthly
 * @param {number} annualRate - Annual interest rate (as decimal, e.g., 0.05 for 5%)
 * @param {string} rateType - 'FIXED' or 'VARIABLE'
 * @param {string} paymentFrequency - 'MONTHLY', 'SEMI_MONTHLY', 'BI_WEEKLY', 'ACCELERATED_BI_WEEKLY', 'WEEKLY', 'ACCELERATED_WEEKLY'
 * @returns {number} Periodic interest rate
 */
export function calculatePeriodicRate(annualRate, rateType, paymentFrequency) {
  if (rateType === 'FIXED') {
    // Canadian fixed rates are compounded semi-annually
    const semiAnnualRate = annualRate / 2;
    const effectiveAnnualRate = Math.pow(1 + semiAnnualRate, 2) - 1;
    
    switch (paymentFrequency) {
      case 'MONTHLY':
        return Math.pow(1 + effectiveAnnualRate, 1/12) - 1;
      case 'SEMI_MONTHLY':
        return Math.pow(1 + effectiveAnnualRate, 1/24) - 1;
      case 'BI_WEEKLY':
      case 'ACCELERATED_BI_WEEKLY':
        return Math.pow(1 + effectiveAnnualRate, 1/26) - 1;
      case 'WEEKLY':
      case 'ACCELERATED_WEEKLY':
        return Math.pow(1 + effectiveAnnualRate, 1/52) - 1;
      default:
        throw new Error('Invalid payment frequency');
    }
  } else {
    // Variable rates are compounded monthly
    const monthlyRate = annualRate / 12;
    
    switch (paymentFrequency) {
      case 'MONTHLY':
        return monthlyRate;
      case 'SEMI_MONTHLY':
        return Math.pow(1 + monthlyRate, 12/24) - 1;
      case 'BI_WEEKLY':
      case 'ACCELERATED_BI_WEEKLY':
        return Math.pow(1 + monthlyRate, 12/26) - 1;
      case 'WEEKLY':
      case 'ACCELERATED_WEEKLY':
        return Math.pow(1 + monthlyRate, 12/52) - 1;
      default:
        throw new Error('Invalid payment frequency');
    }
  }
}

/**
 * Calculate the number of payments based on amortization period and frequency
 * @param {number} amortizationYears - Amortization period in years
 * @param {string} paymentFrequency - 'MONTHLY', 'SEMI_MONTHLY', 'BI_WEEKLY', 'ACCELERATED_BI_WEEKLY', 'WEEKLY', 'ACCELERATED_WEEKLY'
 * @returns {number} Total number of payments
 */
export function calculateNumberOfPayments(amortizationYears, paymentFrequency) {
  switch (paymentFrequency) {
    case 'MONTHLY':
      return amortizationYears * 12;
    case 'SEMI_MONTHLY':
      return amortizationYears * 24;
    case 'BI_WEEKLY':
    case 'ACCELERATED_BI_WEEKLY':
      return amortizationYears * 26;
    case 'WEEKLY':
    case 'ACCELERATED_WEEKLY':
      return amortizationYears * 52;
    default:
      throw new Error('Invalid payment frequency');
  }
}

/**
 * Calculate mortgage payment using Canadian standard formula
 * P = L * [c(1+c)^n] / [(1+c)^n - 1]
 * Where:
 * P = Payment amount
 * L = Loan amount
 * c = Periodic interest rate
 * n = Number of payments
 * @param {number} loanAmount - Principal loan amount
 * @param {number} annualRate - Annual interest rate (as decimal)
 * @param {string} rateType - 'FIXED' or 'VARIABLE'
 * @param {number} amortizationYears - Amortization period in years
 * @param {string} paymentFrequency - 'MONTHLY', 'SEMI_MONTHLY', 'BI_WEEKLY', 'ACCELERATED_BI_WEEKLY', 'WEEKLY', 'ACCELERATED_WEEKLY'
 * @returns {number} Payment amount
 */
export function calculateMortgagePayment(loanAmount, annualRate, rateType, amortizationYears, paymentFrequency) {
  if (loanAmount <= 0) return 0;
  if (annualRate === 0) return loanAmount / calculateNumberOfPayments(amortizationYears, paymentFrequency);
  
  // First calculate the standard monthly payment as baseline
  const monthlyRate = calculatePeriodicRate(annualRate, rateType, 'MONTHLY');
  const monthlyPayments = amortizationYears * 12;
  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, monthlyPayments)) / 
    (Math.pow(1 + monthlyRate, monthlyPayments) - 1);

  // Determine actual payment based on frequency
  let actualPayment;
  let paymentsPerYear;

  switch (paymentFrequency) {
    case 'SEMI_MONTHLY':
      actualPayment = monthlyPayment / 2;
      paymentsPerYear = 24;
      break;
    
    case 'BI_WEEKLY':
      // Recalculate based on 26 periods per year
      const biWeeklyRate = calculatePeriodicRate(annualRate, rateType, 'BI_WEEKLY');
      const biWeeklyPayments = amortizationYears * 26;
      actualPayment = loanAmount * 
        (biWeeklyRate * Math.pow(1 + biWeeklyRate, biWeeklyPayments)) / 
        (Math.pow(1 + biWeeklyRate, biWeeklyPayments) - 1);
      paymentsPerYear = 26;
      break;
    
    case 'ACCELERATED_BI_WEEKLY':
      actualPayment = monthlyPayment / 2;
      paymentsPerYear = 26;
      break;
      
    case 'WEEKLY':
      // Recalculate based on 52 periods per year
      const weeklyRate = calculatePeriodicRate(annualRate, rateType, 'WEEKLY');
      const weeklyPayments = amortizationYears * 52;
      actualPayment = loanAmount * 
        (weeklyRate * Math.pow(1 + weeklyRate, weeklyPayments)) / 
        (Math.pow(1 + weeklyRate, weeklyPayments) - 1);
      paymentsPerYear = 52;
      break;
      
    case 'ACCELERATED_WEEKLY':
      actualPayment = monthlyPayment / 4;
      paymentsPerYear = 52;
      break;
      
    case 'MONTHLY':
    default:
      actualPayment = monthlyPayment;
      paymentsPerYear = 12;
      break;
  }

  return Math.round(actualPayment * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate complete amortization schedule
 * @param {Object} mortgageData - Mortgage details
 * @param {number} mortgageData.originalAmount - Original loan amount
 * @param {number} mortgageData.interestRate - Annual interest rate (as decimal)
 * @param {string} mortgageData.rateType - 'FIXED' or 'VARIABLE'
 * @param {number} mortgageData.amortizationPeriodYears - Amortization period
 * @param {string} mortgageData.paymentFrequency - Payment frequency
 * @param {Date} mortgageData.startDate - Start date of mortgage
 * @param {number} mortgageData.termYears - Term length in years
 * @returns {Array} Array of payment objects
 */
export function generateAmortizationSchedule(mortgageData) {
  const {
    originalAmount,
    interestRate,
    rateType,
    amortizationPeriodYears,
    paymentFrequency,
    startDate,
    termYears
  } = mortgageData;

  const schedule = [];
  const periodicRate = calculatePeriodicRate(interestRate, rateType, paymentFrequency);
  const numberOfPayments = calculateNumberOfPayments(amortizationPeriodYears, paymentFrequency);
  const termPayments = calculateNumberOfPayments(termYears, paymentFrequency);
  
  let remainingBalance = originalAmount;
  let currentDate = new Date(startDate);
  
  for (let paymentNumber = 1; paymentNumber <= Math.min(numberOfPayments, termPayments); paymentNumber++) {
    const interestPayment = remainingBalance * periodicRate;
    const principalPayment = calculateMortgagePayment(originalAmount, interestRate, rateType, amortizationPeriodYears, paymentFrequency) - interestPayment;
    
    // Ensure we don't overpay on the last payment
    const actualPrincipalPayment = Math.min(principalPayment, remainingBalance);
    const actualInterestPayment = remainingBalance * periodicRate;
    const actualTotalPayment = actualPrincipalPayment + actualInterestPayment;
    
    remainingBalance -= actualPrincipalPayment;
    
    // Ensure remaining balance doesn't go negative
    if (remainingBalance < 0.01) {
      remainingBalance = 0;
    }
    
    schedule.push({
      paymentNumber,
      date: new Date(currentDate),
      principalPayment: Math.round(actualPrincipalPayment * 100) / 100,
      interestPayment: Math.round(actualInterestPayment * 100) / 100,
      totalPayment: Math.round(actualTotalPayment * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100
    });
    
    // Increment date based on payment frequency
    switch (paymentFrequency) {
      case 'MONTHLY':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'BIWEEKLY':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'WEEKLY':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
    }
  }
  
  return schedule;
}

/**
 * Calculate prepayment analysis with lump sum payment
 * @param {Object} mortgageData - Original mortgage details
 * @param {number} lumpSumAmount - Lump sum payment amount
 * @param {number} lumpSumPaymentNumber - Payment number when lump sum is made (1-based)
 * @returns {Object} Analysis results
 */
export function calculateLumpSumPrepayment(mortgageData, lumpSumAmount, lumpSumPaymentNumber) {
  const originalSchedule = generateAmortizationSchedule(mortgageData);
  const lumpSumPayment = originalSchedule[lumpSumPaymentNumber - 1];
  
  if (!lumpSumPayment) {
    throw new Error('Invalid lump sum payment number');
  }
  
  // Calculate new balance after lump sum payment
  const newBalance = lumpSumPayment.remainingBalance - lumpSumAmount;
  
  if (newBalance <= 0) {
    // Mortgage is paid off
    const totalSavings = originalSchedule
      .slice(lumpSumPaymentNumber)
      .reduce((sum, payment) => sum + payment.totalPayment, 0);
    
    return {
      mortgagePaidOff: true,
      totalSavings,
      interestSavings: originalSchedule
        .slice(lumpSumPaymentNumber)
        .reduce((sum, payment) => sum + payment.interestPayment, 0),
      paymentsEliminated: originalSchedule.length - lumpSumPaymentNumber,
      newAmortizationSchedule: originalSchedule.slice(0, lumpSumPaymentNumber)
    };
  }
  
  // Create new mortgage data with reduced balance
  const newMortgageData = {
    ...mortgageData,
    originalAmount: newBalance,
    startDate: lumpSumPayment.date
  };
  
  // Generate new schedule from the lump sum payment point
  const newSchedule = generateAmortizationSchedule(newMortgageData);
  
  // Calculate savings
  const originalRemainingPayments = originalSchedule.slice(lumpSumPaymentNumber);
  const totalOriginalPayments = originalRemainingPayments.reduce((sum, payment) => sum + payment.totalPayment, 0);
  const totalNewPayments = newSchedule.reduce((sum, payment) => sum + payment.totalPayment, 0);
  const totalSavings = totalOriginalPayments - totalNewPayments - lumpSumAmount;
  
  const originalInterest = originalRemainingPayments.reduce((sum, payment) => sum + payment.interestPayment, 0);
  const newInterest = newSchedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
  const interestSavings = originalInterest - newInterest;
  
  return {
    mortgagePaidOff: false,
    totalSavings,
    interestSavings,
    paymentsEliminated: originalRemainingPayments.length - newSchedule.length,
    newAmortizationSchedule: [
      ...originalSchedule.slice(0, lumpSumPaymentNumber),
      ...newSchedule
    ],
    lumpSumPayment: {
      paymentNumber: lumpSumPaymentNumber,
      amount: lumpSumAmount,
      date: lumpSumPayment.date
    }
  };
}

/**
 * Calculate prepayment analysis with increased regular payments
 * @param {Object} mortgageData - Original mortgage details
 * @param {number} additionalPayment - Additional amount per payment
 * @param {number} startPaymentNumber - Payment number to start additional payments (1-based)
 * @returns {Object} Analysis results
 */
export function calculateIncreasedPaymentPrepayment(mortgageData, additionalPayment, startPaymentNumber = 1) {
  const originalSchedule = generateAmortizationSchedule(mortgageData);
  const periodicRate = calculatePeriodicRate(mortgageData.interestRate, mortgageData.rateType, mortgageData.paymentFrequency);
  
  const newSchedule = [];
  let remainingBalance = mortgageData.originalAmount;
  let currentDate = new Date(mortgageData.startDate);
  let paymentNumber = 1;
  
  while (remainingBalance > 0.01 && paymentNumber <= originalSchedule.length) {
    const interestPayment = remainingBalance * periodicRate;
    const basePayment = calculateMortgagePayment(mortgageData.originalAmount, mortgageData.interestRate, mortgageData.rateType, mortgageData.amortizationPeriodYears, mortgageData.paymentFrequency);
    const additionalPaymentAmount = paymentNumber >= startPaymentNumber ? additionalPayment : 0;
    const totalPayment = basePayment + additionalPaymentAmount;
    
    const principalPayment = Math.min(totalPayment - interestPayment, remainingBalance);
    const actualTotalPayment = principalPayment + interestPayment;
    
    remainingBalance -= principalPayment;
    
    if (remainingBalance < 0.01) {
      remainingBalance = 0;
    }
    
    newSchedule.push({
      paymentNumber,
      date: new Date(currentDate),
      principalPayment: Math.round(principalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100,
      totalPayment: Math.round(actualTotalPayment * 100) / 100,
      additionalPayment: Math.round(additionalPaymentAmount * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100
    });
    
    // Increment date
    switch (mortgageData.paymentFrequency) {
      case 'MONTHLY':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'BIWEEKLY':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'WEEKLY':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
    }
    
    paymentNumber++;
  }
  
  // Calculate savings
  const totalOriginalPayments = originalSchedule.reduce((sum, payment) => sum + payment.totalPayment, 0);
  const totalNewPayments = newSchedule.reduce((sum, payment) => sum + payment.totalPayment, 0);
  const totalSavings = totalOriginalPayments - totalNewPayments;
  
  const originalInterest = originalSchedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
  const newInterest = newSchedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
  const interestSavings = originalInterest - newInterest;
  
  return {
    totalSavings,
    interestSavings,
    paymentsEliminated: originalSchedule.length - newSchedule.length,
    newAmortizationSchedule: newSchedule,
    additionalPaymentInfo: {
      amount: additionalPayment,
      startPaymentNumber,
      totalAdditionalPayments: newSchedule
        .slice(startPaymentNumber - 1)
        .reduce((sum, payment) => sum + (payment.additionalPayment || 0), 0)
    }
  };
}

/**
 * Calculate mortgage summary statistics
 * @param {Object} mortgageData - Mortgage details
 * @returns {Object} Summary statistics
 */
export function calculateMortgageSummary(mortgageData) {
  const schedule = generateAmortizationSchedule(mortgageData);
  const totalPayments = schedule.reduce((sum, payment) => sum + payment.totalPayment, 0);
  const totalInterest = schedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
  const totalPrincipal = schedule.reduce((sum, payment) => sum + payment.principalPayment, 0);
  
  return {
    originalAmount: mortgageData.originalAmount,
    totalPayments,
    totalInterest,
    totalPrincipal,
    interestToPrincipalRatio: totalInterest / totalPrincipal,
    averagePayment: totalPayments / schedule.length,
    paymentCount: schedule.length,
    finalPaymentDate: schedule[schedule.length - 1]?.date
  };
}

/**
 * Calculate refinance analysis
 * @param {Object} currentMortgage - Current mortgage details
 * @param {Object} newMortgage - New mortgage details
 * @param {number} remainingBalance - Current remaining balance
 * @returns {Object} Refinance analysis
 */
export function calculateRefinanceAnalysis(currentMortgage, newMortgage, remainingBalance) {
  const currentSchedule = generateAmortizationSchedule({
    ...currentMortgage,
    originalAmount: remainingBalance
  });
  
  const newSchedule = generateAmortizationSchedule(newMortgage);
  
  const currentTotalPayments = currentSchedule.reduce((sum, payment) => sum + payment.totalPayment, 0);
  const newTotalPayments = newSchedule.reduce((sum, payment) => sum + payment.totalPayment, 0);
  
  const currentInterest = currentSchedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
  const newInterest = newSchedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
  
  return {
    currentMortgage: {
      totalPayments: currentTotalPayments,
      totalInterest: currentInterest,
      paymentCount: currentSchedule.length
    },
    newMortgage: {
      totalPayments: newTotalPayments,
      totalInterest: newInterest,
      paymentCount: newSchedule.length
    },
    savings: {
      totalSavings: currentTotalPayments - newTotalPayments,
      interestSavings: currentInterest - newInterest,
      paymentsEliminated: currentSchedule.length - newSchedule.length
    },
    breakEvenPoint: calculateBreakEvenPoint(currentMortgage, newMortgage, remainingBalance)
  };
}

/**
 * Calculate break-even point for refinancing
 * @param {Object} currentMortgage - Current mortgage details
 * @param {Object} newMortgage - New mortgage details
 * @param {number} remainingBalance - Current remaining balance
 * @returns {number} Break-even point in months
 */
function calculateBreakEvenPoint(currentMortgage, newMortgage, remainingBalance) {
  const currentPayment = calculateMortgagePayment(
    remainingBalance,
    currentMortgage.interestRate,
    currentMortgage.rateType,
    currentMortgage.amortizationPeriodYears,
    currentMortgage.paymentFrequency
  );
  
  const newPayment = calculateMortgagePayment(
    newMortgage.originalAmount,
    newMortgage.interestRate,
    newMortgage.rateType,
    newMortgage.amortizationPeriodYears,
    newMortgage.paymentFrequency
  );
  
  const monthlySavings = currentPayment - newPayment;
  
  if (monthlySavings <= 0) {
    return Infinity; // No savings, never breaks even
  }
  
  // Assuming $2000 in refinancing costs
  const refinancingCosts = 2000;
  return Math.ceil(refinancingCosts / monthlySavings);
}
