/**
 * Sensitivity Analysis Utility Functions
 * 
 * This module provides functions for:
 * - 10-year financial forecasts
 * - IRR (Internal Rate of Return) calculations
 * - Scenario modeling with variable assumptions
 */

import { getCurrentMortgageBalance, getMonthlyMortgagePayment, getMortgageYearlySummary } from '@/utils/mortgageCalculator';
import { calculateIRR as calculateIRRUnified, calculateNPV as calculateNPVUnified } from '@/utils/mathEngine';

/**
 * Default assumptions for cash flow analysis
 */
export const CASH_FLOW_DEFAULT_ASSUMPTIONS = {
  annualRentIncrease: 2.0, // 2% per year
  annualExpenseInflation: 2.5, // 2.5% per year
  vacancyRate: 5.0, // 5% vacancy allowance
  futureInterestRate: 5.0, // 5% for mortgage renewals
};

/**
 * Default assumptions for equity analysis
 */
export const EQUITY_DEFAULT_ASSUMPTIONS = {
  annualPropertyAppreciation: 3.0, // 3% per year
  exitCapRate: 5.0, // 5% for calculating future sale price
  futureInterestRate: 5.0, // 5% for mortgage renewals
};

/**
 * Default assumptions (backward compatibility - defaults to cash flow)
 */
export const DEFAULT_ASSUMPTIONS = CASH_FLOW_DEFAULT_ASSUMPTIONS;

/**
 * Scenario presets for quick assumption adjustments
 */
export const SCENARIO_PRESETS = {
  conservative: {
    annualRentIncrease: 1.5, // Lower rent growth
    annualExpenseInflation: 3.0, // Higher expense inflation
    vacancyRate: 7.0, // Higher vacancy
  },
  standard: {
    ...DEFAULT_ASSUMPTIONS, // Same as default
  },
  aggressive: {
    annualRentIncrease: 3.0, // Higher rent growth
    annualExpenseInflation: 2.0, // Lower expense inflation
    vacancyRate: 3.0, // Lower vacancy
  },
};

/**
 * Calculate IRR using unified mathEngine
 * @param {Array<number>} cashFlows - Array of cash flows (Year 0 = negative initial investment, positive for returns)
 * @returns {number} IRR as a percentage
 */
export function calculateIRR(cashFlows) {
  // Validate Year 0 is negative
  if (!cashFlows || cashFlows.length < 2) {
    return 0;
  }
  
  if (cashFlows[0] >= 0) {
    console.warn('sensitivity-analysis.calculateIRR: Year 0 should be negative (initial investment). Got:', cashFlows[0]);
  }
  
  return calculateIRRUnified(cashFlows, {
    maxIterations: 1000,
    tolerance: 0.000001,
    allowNegativeIRR: true,
  });
}

/**
 * Calculate NPV (Net Present Value) using unified mathEngine
 * @param {Array<number>} cashFlows - Array of cash flows
 * @param {number} discountRate - Discount rate as decimal (e.g., 0.08 for 8%)
 * @returns {number} NPV
 */
export function calculateNPV(cashFlows, discountRate) {
  return calculateNPVUnified(cashFlows, discountRate);
}

/**
 * Generate forecast for a property
 * @param {Object} property - Property object
 * @param {Object} assumptions - Forecast assumptions
 * @param {number} years - Number of years to forecast (default: 10)
 * @param {string} analysisMode - 'cash-flow' | 'equity' (default: 'cash-flow')
 * @returns {Object} Forecast data with yearly projections
 */
export function generateForecast(property, assumptions = DEFAULT_ASSUMPTIONS, years = 10, analysisMode = 'cash-flow') {
  // Validate inputs
  if (!property) {
    throw new Error('Property is required for forecast generation');
  }

  // Validate assumptions - prevent negative inflation rates
  if (assumptions.annualRentIncrease < 0 || assumptions.annualExpenseInflation < 0) {
    throw new Error('Inflation rates cannot be negative');
  }

  // Validate property value exists (required for calculations)
  if (!property.purchasePrice && !property.currentMarketValue) {
    throw new Error('Property must have purchase price or market value');
  }

  // Initialize forecast structure based on mode
  const forecast = analysisMode === 'equity' ? {
    years: [],
    propertyValue: [],
    mortgageBalance: [],
    equity: [],
    equityFromAppreciation: [],
    equityFromPaydown: [],
    equityGrowthRate: [],
    originalPropertyValue: property.currentMarketValue || property.purchasePrice || 0,
    originalMortgageBalance: 0,
  } : {
    years: [],
    netCashFlow: [],
    mortgageBalance: [],
    cumulativeCashFlow: [],
    noi: [], // Net Operating Income (before debt service)
    rentalIncome: [],
    operatingExpenses: [],
    debtService: [],
    debtServicePrincipal: [],
    debtServiceInterest: [],
  };

  // Handle properties without mortgages (rental-only or paid-off)
  const hasMortgage = property.mortgage && property.mortgage.originalAmount && property.mortgage.originalAmount > 0;

  // Get current mortgage details (only if mortgage exists)
  let currentMortgageBalance = 0;
  let monthlyMortgagePayment = 0;
  let mortgageYearSummaries = [];

  if (hasMortgage) {
    try {
      currentMortgageBalance = getCurrentMortgageBalance(property.mortgage);
    } catch (error) {
      console.warn('Error getting mortgage balance, using original amount:', error);
      currentMortgageBalance = property.mortgage?.originalAmount || 0;
    }

    // Store original values for equity calculations
    if (analysisMode === 'equity') {
      forecast.originalMortgageBalance = property.mortgage.originalAmount || currentMortgageBalance;
    }

    try {
      monthlyMortgagePayment = getMonthlyMortgagePayment(property.mortgage);
    } catch (error) {
      console.warn('Error calculating mortgage payment:', error);
      // Fallback calculation (only if mortgage data is valid)
      if (property.mortgage.interestRate && property.mortgage.amortizationYears) {
        const monthlyRate = (property.mortgage.interestRate / 12);
        const numPayments = property.mortgage.amortizationYears * 12;
        monthlyMortgagePayment = property.mortgage.originalAmount * 
          (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
          (Math.pow(1 + monthlyRate, numPayments) - 1);
      }
    }

    // Pre-compute forward-looking mortgage schedule summaries (fallback to empty on error)
    try {
      mortgageYearSummaries = getMortgageYearlySummary(property.mortgage, years);
    } catch (error) {
      console.warn('Error building mortgage yearly summary:', error);
    }
  }

  // Starting values
  let currentRent = property.rent?.monthlyRent || 0;
  let mortgageBalance = currentMortgageBalance;
  let cumulativeCashFlow = 0;
  let currentPropertyValue = forecast.originalPropertyValue || property.currentMarketValue || property.purchasePrice || 0;
  
  // Calculate current monthly operating expenses (excluding mortgage) - only for cash-flow mode
  const currentMonthlyOperatingExpenses = analysisMode === 'cash-flow' ? 
    ((property.monthlyExpenses?.propertyTax || 0) +
    (property.monthlyExpenses?.condoFees || 0) +
    (property.monthlyExpenses?.insurance || 0) +
    (property.monthlyExpenses?.maintenance || 0) +
    (property.monthlyExpenses?.professionalFees || 0) +
    (property.monthlyExpenses?.utilities || 0)) : 0;

  // Project years into the future
  for (let year = 1; year <= years; year++) {
    forecast.years.push(year);

    if (analysisMode === 'equity') {
      // EQUITY MODE CALCULATIONS
      
      // Calculate property value using appreciation model
      // For final year, use Exit Cap Rate formula if provided
      if (year === years && assumptions.exitCapRate && assumptions.exitCapRate > 0) {
        // Calculate NOI for exit cap rate (simplified - using current rent and expenses)
        const currentRentAnnual = (property.rent?.monthlyRent || 0) * 12;
        const currentExpensesAnnual = currentMonthlyOperatingExpenses * 12;
        const finalNOI = currentRentAnnual - currentExpensesAnnual;
        currentPropertyValue = finalNOI / (assumptions.exitCapRate / 100);
      } else {
        // Use appreciation model
        currentPropertyValue = forecast.originalPropertyValue * 
          Math.pow(1 + (assumptions.annualPropertyAppreciation || 0) / 100, year);
      }

      // Determine mortgage balance using schedule-driven values when available
      const mortgageSummary = mortgageYearSummaries[year - 1];
      if (mortgageSummary) {
        mortgageBalance = mortgageSummary.endingBalance;
      } else if (mortgageBalance > 0 && monthlyMortgagePayment > 0 && hasMortgage) {
        const annualMortgagePayment = monthlyMortgagePayment * 12;
        const mortgageInterestRate = property.mortgage?.interestRate || 0;
        const estimatedAnnualInterest = mortgageBalance * (assumptions.futureInterestRate || mortgageInterestRate) / 100;
        const annualPrincipal = Math.min(annualMortgagePayment - estimatedAnnualInterest, mortgageBalance);
        mortgageBalance = Math.max(0, mortgageBalance - annualPrincipal);
      } else {
        mortgageBalance = 0;
      }

      // Calculate equity
      const equity = currentPropertyValue - mortgageBalance;

      // Calculate equity sources
      const equityFromAppreciation = currentPropertyValue - forecast.originalPropertyValue;
      const equityFromPaydown = forecast.originalMortgageBalance - mortgageBalance;

      // Calculate equity growth rate (year-over-year)
      let equityGrowthRate = 0;
      if (year > 1 && forecast.equity[year - 2] > 0) {
        equityGrowthRate = ((equity - forecast.equity[year - 2]) / forecast.equity[year - 2]) * 100;
      }

      // Store equity values
      forecast.propertyValue.push(currentPropertyValue);
      forecast.mortgageBalance.push(mortgageBalance);
      forecast.equity.push(equity);
      forecast.equityFromAppreciation.push(equityFromAppreciation);
      forecast.equityFromPaydown.push(equityFromPaydown);
      forecast.equityGrowthRate.push(equityGrowthRate);

    } else {
      // CASH FLOW MODE CALCULATIONS

    // Calculate rent with vacancy allowance
      const effectiveRent = currentRent * (1 - (assumptions.vacancyRate || 0) / 100);
    const annualRentalIncome = effectiveRent * 12;

    // Calculate operating expenses (grows with inflation)
    const annualOperatingExpenses = currentMonthlyOperatingExpenses * 12 * 
        Math.pow(1 + (assumptions.annualExpenseInflation || 0) / 100, year - 1);

    // Calculate NOI (Net Operating Income - before debt service)
    const noi = annualRentalIncome - annualOperatingExpenses;

    // Determine debt service using schedule-driven values when available
    let annualDebtService = 0;
    let annualPrincipalPaid = 0;
    let annualInterestPaid = 0;

    const mortgageSummary = mortgageYearSummaries[year - 1];

    if (mortgageSummary) {
      annualDebtService = mortgageSummary.totalPayment;
      annualPrincipalPaid = mortgageSummary.totalPrincipal;
      annualInterestPaid = mortgageSummary.totalInterest;
      mortgageBalance = mortgageSummary.endingBalance;
    } else if (mortgageBalance > 0 && monthlyMortgagePayment > 0 && hasMortgage) {
      const annualMortgagePayment = monthlyMortgagePayment * 12;
      const mortgageInterestRate = property.mortgage?.interestRate || 0;
      const estimatedAnnualInterest = mortgageBalance * mortgageInterestRate;
      const annualPrincipal = Math.min(annualMortgagePayment - estimatedAnnualInterest, mortgageBalance);
      annualDebtService = annualMortgagePayment;
      annualPrincipalPaid = annualPrincipal;
      annualInterestPaid = estimatedAnnualInterest;
      mortgageBalance = Math.max(0, mortgageBalance - annualPrincipal);
    } else {
      mortgageBalance = 0;
    }

    // Calculate net cash flow (after debt service)
    const netCashFlow = annualRentalIncome - annualOperatingExpenses - annualDebtService;
    cumulativeCashFlow += netCashFlow;

      // Store values (cash flow metrics only)
    forecast.netCashFlow.push(netCashFlow);
    forecast.mortgageBalance.push(mortgageBalance);
    forecast.cumulativeCashFlow.push(cumulativeCashFlow);
    forecast.noi.push(noi);
    forecast.rentalIncome.push(annualRentalIncome);
    forecast.operatingExpenses.push(annualOperatingExpenses);
    forecast.debtService.push(annualDebtService);
    forecast.debtServicePrincipal.push(annualPrincipalPaid);
    forecast.debtServiceInterest.push(annualInterestPaid);

    // Update rent for next year
      currentRent = currentRent * (1 + (assumptions.annualRentIncrease || 0) / 100);
    }
  }

  return forecast;
}

/**
 * Calculate key return metrics for a property over specified years
 * @param {Object} property - Property object
 * @param {Object} assumptions - Forecast assumptions
 * @param {number} years - Number of years to forecast (default: 10)
 * @returns {Object} Return metrics (IRR, average annual cash flow, total profit)
 */
export function calculateReturnMetrics(property, assumptions = DEFAULT_ASSUMPTIONS, years = 10) {
  const forecast = generateForecast(property, assumptions, years);

  // Calculate average annual cash flow
  const averageAnnualCashFlow = forecast.netCashFlow.reduce((sum, cf) => sum + cf, 0) / years;

  // Total cumulative cash flow
  const totalCumulativeCashFlow = forecast.cumulativeCashFlow[years - 1] || 0;

  // Calculate cash flow growth rate (year-over-year average)
  let cashFlowGrowthRate = 0;
  if (forecast.netCashFlow.length > 1 && forecast.netCashFlow[0] !== 0) {
    const firstYear = forecast.netCashFlow[0];
    const lastYear = forecast.netCashFlow[years - 1];
    cashFlowGrowthRate = ((lastYear - firstYear) / Math.abs(firstYear)) * 100;
  }

  // Calculate operating margin (average NOI / average operating income)
  const avgNOI = forecast.noi.reduce((sum, n) => sum + n, 0) / years;
  const avgOperatingIncome = forecast.rentalIncome.reduce((sum, r) => sum + r, 0) / years;
  const operatingMargin = avgOperatingIncome > 0 ? (avgNOI / avgOperatingIncome) * 100 : 0;

  // Calculate debt service coverage ratio (average NOI / average debt service)
  const avgDebtService = forecast.debtService.reduce((sum, d) => sum + d, 0) / years;
  const debtServiceCoverageRatio = avgDebtService > 0 ? avgNOI / avgDebtService : 0;

  return {
    averageAnnualCashFlow,
    totalCumulativeCashFlow,
    cashFlowGrowthRate,
    operatingMargin,
    debtServiceCoverageRatio,
    forecast
  };
}

const sumArray = (values = []) =>
  Array.isArray(values)
    ? values.reduce((sum, value) => sum + (Number.isFinite(Number(value)) ? Number(value) : 0), 0)
    : 0;

/**
 * Prepare Sankey chart data describing capital inflows and outflows across the forecast horizon.
 *
 * The structure highlights how initial equity, operating income, and sale proceeds are allocated
 * between operating costs, debt service, and investor returns.
 *
 * @param {Object} property Property details (requires totalInvestment and mortgage info)
 * @param {Object} forecast Forecast object produced by generateForecast
 * @returns {{nodes: Array, links: Array, meta: Object} | null}
 */
export function buildCapitalFlowSankeyData(property, forecast) {
  if (!property || !forecast) {
    return null;
  }

  const initialEquity = Number(property.totalInvestment) || 0;
  const originalDebt = Number(property.mortgage?.originalAmount) || 0;

  const totalRentalIncome = sumArray(forecast.rentalIncome);
  const totalOperatingExpenses = sumArray(forecast.operatingExpenses);
  const totalDebtService = sumArray(forecast.debtService);
  const totalNetCashFlow = sumArray(forecast.netCashFlow);

  const lastIndex = Math.max(forecast.propertyValue.length - 1, 0);
  const propertyValueAtExit = Number(forecast.propertyValue[lastIndex]) || 0;
  const remainingDebtAtExit = Number(forecast.mortgageBalance[lastIndex]) || 0;

  const saleProceedsGross = Math.max(propertyValueAtExit, 0);
  const saleDebtPayoff = Math.min(remainingDebtAtExit, saleProceedsGross);
  const saleEquityProceeds = Math.max(saleProceedsGross - saleDebtPayoff, 0);

  const operatingCoveredByRent = Math.min(totalOperatingExpenses, totalRentalIncome);
  const remainingAfterOperating = totalRentalIncome - operatingCoveredByRent;
  const debtCoveredByRent = Math.min(totalDebtService, Math.max(remainingAfterOperating, 0));
  const remainingAfterDebtFromRent = remainingAfterOperating - debtCoveredByRent;

  const positiveNetCashFlow = Math.max(totalNetCashFlow, 0);
  const rentToNetCashFlow = Math.max(Math.min(positiveNetCashFlow, Math.max(remainingAfterDebtFromRent, 0)), 0);

  const operatingShortfall = Math.max(totalOperatingExpenses - operatingCoveredByRent, 0);
  const debtShortfall = Math.max(totalDebtService - debtCoveredByRent, 0);
  const netCashFlowShortfall = Math.max(-totalNetCashFlow, 0);

  let remainingEquity = initialEquity;
  const equityToOperating = Math.min(remainingEquity, operatingShortfall);
  remainingEquity -= equityToOperating;
  const equityToDebt = Math.min(remainingEquity, debtShortfall);
  remainingEquity -= equityToDebt;
  const equityToNetCash = Math.min(remainingEquity, netCashFlowShortfall);
  remainingEquity -= equityToNetCash;
  const equityReturnedDirect = Math.max(remainingEquity, 0);

  const nodes = [
    { name: 'Initial Equity' },    // 0
    { name: 'Rental Income' },     // 1
    { name: 'Sale Proceeds' },     // 2
    { name: 'Operating Expenses' },// 3
    { name: 'Debt Service' },      // 4
    { name: 'Net Cash Flow' },     // 5
    { name: 'Equity Returned' },   // 6
  ];

  const links = [];

  const pushLink = (source, target, value, label) => {
    if (value > 0) {
      links.push({
        source,
        target,
        value,
        label,
      });
    }
  };

  // Rental income allocations
  pushLink(1, 3, operatingCoveredByRent, 'Income → OpEx');
  pushLink(1, 4, debtCoveredByRent, 'Income → Debt');
  pushLink(1, 5, rentToNetCashFlow, 'Income → Net Cash');

  // Equity used to cover shortfalls and returned directly
  pushLink(0, 3, equityToOperating, 'Equity → OpEx');
  pushLink(0, 4, equityToDebt, 'Equity → Debt');
  pushLink(0, 5, equityToNetCash, 'Equity → Cash (Support)');
  pushLink(0, 6, equityReturnedDirect, 'Equity Returned');

  // Sale proceeds allocations
  pushLink(2, 4, saleDebtPayoff, 'Sale → Debt Payoff');
  pushLink(2, 6, saleEquityProceeds, 'Sale → Investor');

  // Net cash flow distributed to investor
  pushLink(5, 6, positiveNetCashFlow, 'Cash to Investor');

  const totalDebtPaid = debtCoveredByRent + equityToDebt + saleDebtPayoff;

  return {
    nodes,
    links,
    meta: {
      initialEquity,
      originalDebt,
      totalRentalIncome,
      totalOperatingExpenses,
      totalDebtService,
      totalDebtPaid,
      totalNetCashFlow,
      saleProceedsGross,
      saleEquityProceeds,
    },
  };
}

/**
 * Compare two scenarios and calculate percentage differences
 * @param {Object} baseline - Baseline metrics
 * @param {Object} newScenario - New scenario metrics
 * @returns {Object} Comparison with differences
 */
export function compareScenarios(baseline, newScenario) {
  return {
    averageAnnualCashFlow: {
      baseline: baseline.averageAnnualCashFlow,
      newScenario: newScenario.averageAnnualCashFlow,
      difference: newScenario.averageAnnualCashFlow - baseline.averageAnnualCashFlow,
      percentChange: baseline.averageAnnualCashFlow !== 0 ? 
        ((newScenario.averageAnnualCashFlow - baseline.averageAnnualCashFlow) / Math.abs(baseline.averageAnnualCashFlow)) * 100 : 0
    },
    totalCumulativeCashFlow: {
      baseline: baseline.totalCumulativeCashFlow,
      newScenario: newScenario.totalCumulativeCashFlow,
      difference: newScenario.totalCumulativeCashFlow - baseline.totalCumulativeCashFlow,
      percentChange: baseline.totalCumulativeCashFlow !== 0 ? 
        ((newScenario.totalCumulativeCashFlow - baseline.totalCumulativeCashFlow) / Math.abs(baseline.totalCumulativeCashFlow)) * 100 : 0
    },
    cashFlowGrowthRate: {
      baseline: baseline.cashFlowGrowthRate,
      newScenario: newScenario.cashFlowGrowthRate,
      difference: newScenario.cashFlowGrowthRate - baseline.cashFlowGrowthRate,
      percentChange: baseline.cashFlowGrowthRate !== 0 ? 
        ((newScenario.cashFlowGrowthRate - baseline.cashFlowGrowthRate) / Math.abs(baseline.cashFlowGrowthRate)) * 100 : 0
    },
    operatingMargin: {
      baseline: baseline.operatingMargin,
      newScenario: newScenario.operatingMargin,
      difference: newScenario.operatingMargin - baseline.operatingMargin,
      percentChange: baseline.operatingMargin !== 0 ? 
        ((newScenario.operatingMargin - baseline.operatingMargin) / Math.abs(baseline.operatingMargin)) * 100 : 0
    },
    debtServiceCoverageRatio: {
      baseline: baseline.debtServiceCoverageRatio,
      newScenario: newScenario.debtServiceCoverageRatio,
      difference: newScenario.debtServiceCoverageRatio - baseline.debtServiceCoverageRatio,
      percentChange: baseline.debtServiceCoverageRatio !== 0 ? 
        ((newScenario.debtServiceCoverageRatio - baseline.debtServiceCoverageRatio) / Math.abs(baseline.debtServiceCoverageRatio)) * 100 : 0
    }
  };
}

/**
 * Format forecast data for chart display
 * @param {Object} forecast - Forecast object from generateForecast
 * @param {string} analysisMode - 'cash-flow' | 'equity' (default: 'cash-flow')
 * @returns {Array} Array of data points for charting
 */
export function formatForecastForChart(forecast, analysisMode = 'cash-flow') {
  if (analysisMode === 'equity') {
    return forecast.years.map((year, index) => ({
      year,
      totalEquity: Math.round(forecast.equity[index] || 0),
      propertyValue: Math.round(forecast.propertyValue[index] || 0),
      mortgageBalance: Math.round(forecast.mortgageBalance[index] || 0),
      equityFromAppreciation: Math.round(forecast.equityFromAppreciation[index] || 0),
      equityFromPaydown: Math.round(forecast.equityFromPaydown[index] || 0),
      equityGrowthRate: forecast.equityGrowthRate[index] || 0
    }));
  } else {
  return forecast.years.map((year, index) => ({
    year,
      netCashFlow: Math.round(forecast.netCashFlow[index] || 0),
      mortgageBalance: Math.round(forecast.mortgageBalance[index] || 0),
      cumulativeCashFlow: Math.round(forecast.cumulativeCashFlow[index] || 0),
      operatingIncome: Math.round(forecast.rentalIncome[index] || 0),
      operatingExpenses: Math.round(forecast.operatingExpenses[index] || 0),
      noi: Math.round(forecast.noi[index] || 0),
      debtService: Math.round(forecast.debtService[index] || 0)
  }));
  }
}

/**
 * Calculate current year values from expenseHistory
 * Sums all expenses for the current calendar year from expenseHistory
 * @param {Object} property - Property object with expenseHistory
 * @param {number} year - Year to calculate for (defaults to current year)
 * @returns {Object} Current year income, expenses, and cashFlow
 */
function calculateCurrentYearValues(property, year = null) {
  if (!property) return { income: 0, operatingExpenses: 0, totalExpenses: 0, cashFlow: 0 };
  
  const currentYear = year || new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);
  
  // Calculate annual income (prefer annualRent if available)
  const annualIncome = property.rent?.annualRent || (property.rent?.monthlyRent ? property.rent.monthlyRent * 12 : 0);
  
  // Sum expenses from expenseHistory for the current year
  let annualOperatingExpenses = 0;
  if (property.expenseHistory && Array.isArray(property.expenseHistory)) {
    annualOperatingExpenses = property.expenseHistory
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= yearStart && expenseDate <= yearEnd;
      })
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);
  }
  
  // If no expenseHistory data, fall back to monthlyExpenses calculation
  if (annualOperatingExpenses === 0 && property.monthlyExpenses) {
    const monthlyOperatingExpenses = 
      (property.monthlyExpenses.propertyTax || 0) +
      (property.monthlyExpenses.condoFees || 0) +
      (property.monthlyExpenses.insurance || 0) +
      (property.monthlyExpenses.maintenance || 0) +
      (property.monthlyExpenses.professionalFees || 0) +
      (property.monthlyExpenses.utilities || 0);
    annualOperatingExpenses = monthlyOperatingExpenses * 12;
    
    // Add mortgage interest if available
    if (property.monthlyExpenses.mortgageInterest) {
      annualOperatingExpenses += property.monthlyExpenses.mortgageInterest * 12;
    }
  }
  
  // Add annual mortgage payment
  const annualMortgagePayment = property.monthlyExpenses?.mortgagePayment 
    ? property.monthlyExpenses.mortgagePayment * 12 
    : 0;
  
  const totalExpenses = annualOperatingExpenses + annualMortgagePayment;
  const cashFlow = annualIncome - totalExpenses;
  
  return {
    income: annualIncome,
    operatingExpenses: annualOperatingExpenses,
    totalExpenses: totalExpenses,
    cashFlow
  };
}

/**
 * Check if a year has complete data (full calendar year)
 * @param {Object} property - Property object
 * @param {string} year - Year to check
 * @param {Array} historicalData - Historical data array
 * @returns {Object} Validation result with isComplete flag and reason
 */
function validateYearCompleteness(property, year, historicalData) {
  const currentYear = new Date().getFullYear();
  const yearNum = parseInt(year);
  
  // Future years are always projections
  if (yearNum > currentYear) {
    return {
      isComplete: false,
      isProjected: true,
      reason: 'future_year',
      message: `Year ${year} is in the future and contains projected data`
    };
  }
  
  // Current year: check if we have data for all 12 months
  if (yearNum === currentYear) {
    const now = new Date();
    const monthsElapsed = now.getMonth() + 1; // 1-12
    const isYearEnd = now.getMonth() === 11 && now.getDate() >= 31;
    
    if (!isYearEnd && monthsElapsed < 12) {
      // Check expenseHistory for data across months
      const yearStart = new Date(yearNum, 0, 1);
      const yearEnd = new Date(yearNum, now.getMonth(), now.getDate());
      const expenseMonths = new Set();
      
      if (property.expenseHistory && Array.isArray(property.expenseHistory)) {
        property.expenseHistory.forEach(expense => {
          const expenseDate = new Date(expense.date);
          if (expenseDate >= yearStart && expenseDate <= yearEnd) {
            expenseMonths.add(expenseDate.getMonth());
          }
        });
      }
      
      return {
        isComplete: false,
        isProjected: false,
        isPartial: true,
        monthsElapsed,
        expenseMonthsFound: expenseMonths.size,
        reason: 'incomplete_current_year',
        message: `Year ${year} is incomplete (${monthsElapsed}/12 months elapsed, ${expenseMonths.size} months of expense data)`
      };
    }
  }
  
  // Past years: check if we have historical data entry
  if (yearNum < currentYear) {
    const hasHistoricalEntry = historicalData.some(d => d.year === year);
    if (!hasHistoricalEntry) {
      return {
        isComplete: false,
        isProjected: false,
        reason: 'missing_data',
        message: `No historical data available for year ${year}`
      };
    }
  }
  
  return {
    isComplete: true,
    isProjected: false,
    reason: 'complete',
    message: `Year ${year} has complete data`
  };
}

/**
 * Calculate YoY (Year-over-Year) metrics for property analysis
 * @param {Object} property - Property object
 * @param {Object} assumptions - Forecast assumptions
 * @param {Object} baselineAssumptions - Baseline assumptions for comparison
 * @returns {Object} YoY metrics including historical and projected changes
 */
export function calculateYoYMetrics(property, assumptions = DEFAULT_ASSUMPTIONS, baselineAssumptions = DEFAULT_ASSUMPTIONS) {
  if (!property) return null;

  // Historical data for YoY calculations
  const historicalDataMap = {
    'first-st-1': [
      { year: '2021', income: 31200, expenses: 32368, cashFlow: -1168 }, // 2600 * 12
      { year: '2022', income: 31944, expenses: 35721, cashFlow: -3777 }, // 2662 * 12
      { year: '2023', income: 31920, expenses: 33305, cashFlow: -1385 }, // 2660 * 12
      { year: '2024', income: 32688, expenses: 33799, cashFlow: -1111 }, // 2724 * 12
      { year: '2025', income: 33468, expenses: 33799, cashFlow: -331 } // 2789 * 12 (projected)
    ],
    'second-dr-1': [
      { year: '2021', income: 31200, expenses: 39389, cashFlow: -8189 },
      { year: '2022', income: 31944, expenses: 42905, cashFlow: -10961 },
      { year: '2023', income: 32100, expenses: 40393, cashFlow: -8293 },
      { year: '2024', income: 32868, expenses: 40923, cashFlow: -8055 }
    ]
  };

  const historicalData = historicalDataMap[property.id] || [];
  const currentYear = new Date().getFullYear().toString();
  const previousYear = (new Date().getFullYear() - 1).toString();

  // Calculate current year values from actual property data (expenseHistory)
  const currentYearCalculated = calculateCurrentYearValues(property, parseInt(currentYear));
  
  // Find previous year data from historicalDataMap
  const previousYearData = historicalData.find(d => d.year === previousYear);
  
  // Use calculated current year or fall back to historicalDataMap
  const currentYearData = currentYearCalculated.income > 0 
    ? {
        year: currentYear,
        income: currentYearCalculated.income,
        expenses: currentYearCalculated.totalExpenses,
        cashFlow: currentYearCalculated.cashFlow
      }
    : historicalData.find(d => d.year === currentYear);

  // Validate year completeness
  const previousYearValidation = validateYearCompleteness(property, previousYear, historicalData);
  const currentYearValidation = validateYearCompleteness(property, currentYear, historicalData);

  // Calculate historical YoY changes
  const calculateYoYChange = (current, previous) => {
    if (!current || !previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // Require FULL prior year (not just 2 years of data, but complete prior year)
  const hasFullPriorYear = previousYearData && previousYearValidation.isComplete && !previousYearValidation.isProjected;
  const hasCurrentYearData = currentYearData && (currentYearValidation.isComplete || currentYearValidation.isPartial);
  
  // For YoY analysis, we need a complete prior year AND current year data
  const hasValidYoYData = hasFullPriorYear && hasCurrentYearData;
  
  const historicalYoY = {
    revenue: hasValidYoYData && currentYearData.income && previousYearData.income
      ? calculateYoYChange(currentYearData.income, previousYearData.income)
      : null,
    expenses: hasValidYoYData && currentYearData.expenses && previousYearData.expenses
      ? calculateYoYChange(currentYearData.expenses, previousYearData.expenses)
      : null,
    cashFlow: hasValidYoYData && currentYearData.cashFlow !== undefined && previousYearData.cashFlow !== undefined
      ? calculateYoYChange(currentYearData.cashFlow, previousYearData.cashFlow)
      : null
  };

  // Calculate current values for projections (use calculated or property data)
  const currentRent = currentYearData?.income || property.rent?.annualRent || (property.rent?.monthlyRent ? property.rent.monthlyRent * 12 : 0);
  
  // Get operating expenses separately from calculated values
  const currentExpensesOperating = currentYearCalculated.income > 0 
    ? currentYearCalculated.operatingExpenses
    : (property.monthlyExpenses ? 
        ((property.monthlyExpenses.propertyTax || 0) +
         (property.monthlyExpenses.condoFees || 0) +
         (property.monthlyExpenses.insurance || 0) +
         (property.monthlyExpenses.maintenance || 0) +
         (property.monthlyExpenses.professionalFees || 0) +
         (property.monthlyExpenses.utilities || 0)) * 12
      : 0);
  
  const annualMortgagePayment = property.monthlyExpenses?.mortgagePayment 
    ? property.monthlyExpenses.mortgagePayment * 12 
    : 0;
  const currentExpensesTotal = currentExpensesOperating + annualMortgagePayment;
  const currentCashFlow = currentYearData?.cashFlow !== undefined 
    ? currentYearData.cashFlow 
    : currentRent - currentExpensesTotal;
  
  // Project next year's values based on assumptions
  const projectedRent = currentRent * (1 + assumptions.annualRentIncrease / 100);
  const projectedExpensesOperating = currentExpensesOperating * (1 + assumptions.annualExpenseInflation / 100);
  const projectedExpensesTotal = projectedExpensesOperating + annualMortgagePayment;
  const projectedCashFlow = projectedRent - projectedExpensesTotal;

  const projectedYoY = {
    revenue: ((projectedRent - currentRent) / currentRent) * 100,
    expenses: ((projectedExpensesTotal - currentExpensesTotal) / currentExpensesTotal) * 100,
    cashFlow: currentCashFlow !== 0 ? ((projectedCashFlow - currentCashFlow) / Math.abs(currentCashFlow)) * 100 : 0
  };

  // Calculate baseline projected YoY for comparison
  const baselineProjectedRent = currentRent * (1 + baselineAssumptions.annualRentIncrease / 100);
  const baselineProjectedExpensesOperating = currentExpensesOperating * (1 + baselineAssumptions.annualExpenseInflation / 100);
  const baselineProjectedExpensesTotal = baselineProjectedExpensesOperating + annualMortgagePayment;
  const baselineProjectedCashFlow = baselineProjectedRent - baselineProjectedExpensesTotal;

  const baselineProjectedYoY = {
    revenue: ((baselineProjectedRent - currentRent) / currentRent) * 100,
    expenses: ((baselineProjectedExpensesTotal - currentExpensesTotal) / currentExpensesTotal) * 100,
    cashFlow: currentCashFlow !== 0 ? ((baselineProjectedCashFlow - currentCashFlow) / Math.abs(currentCashFlow)) * 100 : 0
  };

  // Determine warning messages
  let warningMessage = null;
  let reasonInsufficient = null;
  let dataQuality = 'complete'; // 'complete', 'partial', 'insufficient', 'projected'

  if (!hasFullPriorYear) {
    if (!previousYearData) {
      warningMessage = `No complete data for prior year (${previousYear}).`;
      reasonInsufficient = 'missing_prior_year';
      dataQuality = 'insufficient';
    } else if (previousYearValidation.isProjected) {
      warningMessage = `Prior year (${previousYear}) contains projected data, not actual results.`;
      reasonInsufficient = 'projected_prior_year';
      dataQuality = 'projected';
    } else if (!previousYearValidation.isComplete) {
      warningMessage = `Prior year (${previousYear}) data is incomplete: ${previousYearValidation.message}`;
      reasonInsufficient = 'incomplete_prior_year';
      dataQuality = 'partial';
    }
  }

  if (!hasCurrentYearData) {
    warningMessage = warningMessage 
      ? `${warningMessage} Current year data also unavailable.`
      : `Current year (${currentYear}) data is unavailable.`;
    reasonInsufficient = reasonInsufficient || 'missing_current_year';
    dataQuality = 'insufficient';
  } else if (currentYearValidation.isPartial) {
    const partialMsg = `Current year (${currentYear}) is incomplete (${currentYearValidation.monthsElapsed}/12 months).`;
    warningMessage = warningMessage 
      ? `${warningMessage} ${partialMsg}`
      : partialMsg;
    reasonInsufficient = reasonInsufficient || 'incomplete_current_year';
    if (dataQuality === 'complete') dataQuality = 'partial';
  } else if (currentYearValidation.isProjected) {
    const projectedMsg = `Current year (${currentYear}) contains projected values.`;
    warningMessage = warningMessage 
      ? `${warningMessage} ${projectedMsg}`
      : projectedMsg;
    reasonInsufficient = reasonInsufficient || 'projected_current_year';
    if (dataQuality === 'complete') dataQuality = 'projected';
  }

  return {
    historical: historicalYoY,
    projected: projectedYoY,
    baselineProjected: baselineProjectedYoY,
    hasHistoricalData: hasValidYoYData,
    hasMinimumData: hasValidYoYData,
    hasFullPriorYear,
    hasCurrentYearData,
    dataRequirement: {
      requiredYears: 2,
      requiredFullPriorYear: true, // Changed: require full prior year
      availableYears: historicalData.length,
      meetsRequirement: hasValidYoYData,
      meetsFullPriorYearRequirement: hasFullPriorYear
    },
    currentYearData,
    previousYearData,
    currentYearValidation,
    previousYearValidation,
    warningMessage,
    reasonInsufficient,
    dataQuality,
    currentValues: {
      rent: currentRent,
      expenses: currentExpensesTotal,
      cashFlow: currentCashFlow
    },
    projectedValues: {
      rent: projectedRent,
      expenses: projectedExpensesTotal,
      cashFlow: projectedCashFlow
    }
  };
}

/**
 * Calculate YoY growth rates for multiple years in forecast
 * @param {Object} forecast - Forecast object from generateForecast
 * @returns {Array} Array of YoY growth rates for each year
 */
export function calculateForecastYoYGrowth(forecast) {
  const yoyGrowth = [];
  
  for (let i = 1; i < forecast.years.length; i++) {
    const currentYear = i;
    const previousYear = i - 1;
    
    const cashFlowGrowth = forecast.netCashFlow[previousYear] !== 0 
      ? ((forecast.netCashFlow[currentYear] - forecast.netCashFlow[previousYear]) / Math.abs(forecast.netCashFlow[previousYear])) * 100
      : 0;
    
    const operatingIncomeGrowth = forecast.rentalIncome[previousYear] !== 0 
      ? ((forecast.rentalIncome[currentYear] - forecast.rentalIncome[previousYear]) / Math.abs(forecast.rentalIncome[previousYear])) * 100
      : 0;
    
    yoyGrowth.push({
      year: currentYear + 1, // Year 2, 3, 4, etc.
      cashFlowGrowth,
      operatingIncomeGrowth,
      netCashFlow: forecast.netCashFlow[currentYear],
      operatingIncome: forecast.rentalIncome[currentYear]
    });
  }
  
  return yoyGrowth;
}

