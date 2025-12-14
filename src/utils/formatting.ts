/**
 * Currency formatting utilities for consistent display of financial values
 */

import { getSetting } from '@/lib/settings-storage';

/**
 * Formats a number as Canadian currency
 * Decimal places are controlled by the currencyDecimals setting
 * @param value - The numerical value to format
 * @returns Formatted currency string (e.g., "$1,234.56" or "$1,235")
 */
export const formatCurrency = (value: number): string => {
  const showDecimals = getSetting('currencyDecimals');
  
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value);
};

/**
 * Formats a number with exactly 2 decimal places (without currency symbol)
 * @param value - The numerical value to format
 * @returns Formatted number string (e.g., "1,234.56")
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formats a percentage with exactly 2 decimal places
 * @param value - The percentage value to format (e.g., 5.5 for 5.5% or 0.055 for 5.5%)
 * @returns Formatted percentage string (e.g., "5.50%")
 */
export const formatPercentage = (value: any): string => {
  // Step 1: Check if the input is a valid, finite number.
  if (typeof value !== 'number' || !isFinite(value)) {
    return 'N/A'; // Return a default string for invalid data.
  }

  // Step 2: Handle both whole numbers (e.g., 5.5) and decimals (e.g., 0.055).
  const numberToFormat = Math.abs(value) >= 1 ? value / 100 : value;

  // Step 3: Format the valid number.
  return new Intl.NumberFormat('en-CA', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberToFormat);
};
