/**
 * Canadian Mortgage Constants
 * These values should be updated periodically to reflect current market conditions
 */

// Current Canadian Prime Rate (Bank of Canada)
// This should be updated when the Bank of Canada changes the prime rate
// Last updated: January 2025
export const CANADIAN_PRIME_RATE = 6.95; // Percentage (e.g., 6.95 for 6.95%)

// Default tax brackets for Canadian investors (2024 rates)
export const CANADIAN_TAX_BRACKETS = {
  federal: {
    '0-53359': 0.15,      // 15% on first $53,359
    '53359-106717': 0.205, // 20.5% on next $53,358
    '106717-165430': 0.26, // 26% on next $58,713
    '165430-235675': 0.29, // 29% on next $70,245
    '235675+': 0.33,       // 33% on income over $235,675
  },
  // Provincial rates vary - using Ontario as default (most common)
  ontario: {
    '0-49231': 0.0505,    // 5.05% on first $49,231
    '49231-98463': 0.0915, // 9.15% on next $49,232
    '98463-150000': 0.1116, // 11.16% on next $51,537
    '150000-220000': 0.1216, // 12.16% on next $70,000
    '220000+': 0.1316,    // 13.16% on income over $220,000
  },
};

/**
 * Get the current prime rate
 * @returns Prime rate as a decimal (e.g., 0.0695 for 6.95%)
 */
export function getPrimeRate(): number {
  return CANADIAN_PRIME_RATE / 100;
}

/**
 * Calculate combined federal + provincial tax rate for a given income
 * Uses Ontario rates as default (most common for real estate investors)
 * @param annualIncome Annual income in dollars
 * @param province Province code (default: 'ontario')
 * @returns Combined marginal tax rate as decimal
 */
export function getCombinedTaxRate(annualIncome: number, province: string = 'ontario'): number {
  // Get federal rate
  let federalRate = 0.15;
  if (annualIncome > 235675) federalRate = 0.33;
  else if (annualIncome > 165430) federalRate = 0.29;
  else if (annualIncome > 106717) federalRate = 0.26;
  else if (annualIncome > 53359) federalRate = 0.205;

  // Get provincial rate (using Ontario as default)
  let provincialRate = 0.0505;
  if (annualIncome > 220000) provincialRate = 0.1316;
  else if (annualIncome > 150000) provincialRate = 0.1216;
  else if (annualIncome > 98463) provincialRate = 0.1116;
  else if (annualIncome > 49231) provincialRate = 0.0915;

  // Combined rate (simplified - actual calculation is more complex with brackets)
  return federalRate + provincialRate;
}

/**
 * Calculate effective interest rate for variable rate mortgages
 * @param primeRate Prime rate as decimal
 * @param spread Spread as decimal (can be negative)
 * @returns Effective rate as decimal
 */
export function calculateEffectiveVariableRate(primeRate: number, spread: number): number {
  return primeRate + spread;
}
