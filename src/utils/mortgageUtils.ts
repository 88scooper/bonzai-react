/**
 * Mortgage utility functions for renewal dates, tax calculations, and mortgage analysis
 */

import { getPrimeRate, calculateEffectiveVariableRate, getCombinedTaxRate } from './mortgageConstants';
import { getCurrentMortgageBalance, getAnnualMortgageInterest } from './mortgageCalculator';
import type { MortgageData } from './mortgageCalculator';

/**
 * Calculate renewal date for a mortgage
 * @param startDate Mortgage start date
 * @param termMonths Term in months
 * @returns Renewal date as ISO string
 */
export function calculateRenewalDate(startDate: string | Date, termMonths: number): string {
  const start = new Date(startDate);
  const renewal = new Date(start);
  renewal.setMonth(renewal.getMonth() + termMonths);
  return renewal.toISOString().split('T')[0];
}

/**
 * Get effective interest rate for a mortgage (handles variable rates with prime)
 * @param mortgage Mortgage data
 * @returns Effective rate as decimal
 */
export function getEffectiveInterestRate(mortgage: MortgageData & { primeRate?: number; variableRateSpread?: number }): number {
  if (mortgage.rateType?.toUpperCase() === 'VARIABLE') {
    const primeRate = mortgage.primeRate ?? getPrimeRate();
    const spread = mortgage.variableRateSpread ?? 0;
    return calculateEffectiveVariableRate(primeRate, spread);
  }
  return mortgage.interestRate;
}

/**
 * Calculate projected mortgage balance at renewal date
 * @param mortgage Mortgage data
 * @returns Projected balance at renewal
 */
export function getRenewalBalance(mortgage: MortgageData & { termMonths?: number }): number {
  try {
    const termMonths = mortgage.termMonths || (mortgage as any).termYears * 12 || 60;
    const termYears = termMonths / 12;
    
    // Use getMortgageBalanceAtYear if available, otherwise estimate
    const { getMortgageBalanceAtYear } = require('./mortgageCalculator');
    if (getMortgageBalanceAtYear) {
      return getMortgageBalanceAtYear(mortgage, termYears);
    }
    
    // Fallback: use current balance calculation
    return getCurrentMortgageBalance(mortgage);
  } catch (error) {
    console.warn('Error calculating renewal balance:', error);
    return mortgage.originalAmount;
  }
}

/**
 * Calculate annual tax savings from mortgage interest deduction
 * @param mortgageInterest Annual mortgage interest amount
 * @param marginalTaxRate Marginal tax rate as decimal (e.g., 0.40 for 40%)
 * @returns Annual tax savings in dollars
 */
export function calculateTaxSavings(mortgageInterest: number, marginalTaxRate: number): number {
  return mortgageInterest * marginalTaxRate;
}

/**
 * Calculate annual mortgage interest and tax savings for a property
 * @param mortgage Mortgage data
 * @param marginalTaxRate Marginal tax rate as decimal (optional, will estimate if not provided)
 * @returns Object with annualInterest and annualTaxSavings
 */
export function calculateMortgageTaxBenefits(
  mortgage: MortgageData,
  marginalTaxRate?: number
): { annualInterest: number; annualTaxSavings: number; effectiveRate: number } {
  try {
    const annualInterest = getAnnualMortgageInterest(mortgage);
    
    // If tax rate not provided, estimate based on typical investor income
    // Assume $150k annual income (middle-high bracket)
    const taxRate = marginalTaxRate ?? getCombinedTaxRate(150000);
    
    const annualTaxSavings = calculateTaxSavings(annualInterest, taxRate);
    const effectiveRate = getEffectiveInterestRate(mortgage);
    
    return {
      annualInterest,
      annualTaxSavings,
      effectiveRate,
    };
  } catch (error) {
    console.warn('Error calculating mortgage tax benefits:', error);
    return {
      annualInterest: 0,
      annualTaxSavings: 0,
      effectiveRate: mortgage.interestRate,
    };
  }
}

/**
 * Format renewal date for display
 * @param renewalDate Renewal date (string or Date)
 * @returns Formatted date string
 */
export function formatRenewalDate(renewalDate: string | Date): string {
  const date = new Date(renewalDate);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate days until renewal
 * @param renewalDate Renewal date
 * @returns Number of days until renewal (negative if past)
 */
export function getDaysUntilRenewal(renewalDate: string | Date): number {
  const renewal = new Date(renewalDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  renewal.setHours(0, 0, 0, 0);
  const diffTime = renewal.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if renewal is approaching (within 6 months)
 * @param renewalDate Renewal date
 * @returns Object with isApproaching and daysUntil
 */
export function checkRenewalApproaching(renewalDate: string | Date): { isApproaching: boolean; daysUntil: number; monthsUntil: number } {
  const daysUntil = getDaysUntilRenewal(renewalDate);
  const monthsUntil = Math.floor(daysUntil / 30);
  const isApproaching = daysUntil > 0 && daysUntil <= 180; // 6 months
  
  return {
    isApproaching,
    daysUntil,
    monthsUntil,
  };
}
