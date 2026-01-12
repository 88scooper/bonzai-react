import { z } from 'zod';

// Base mortgage schema without refinements (needed for creating partial schema)
const baseMortgageSchema = z.object({
  lenderName: z.string()
    .min(1, 'Lender name is required')
    .max(255, 'Lender name must be less than 255 characters')
    .trim(),
  
  propertyId: z.string()
    .min(1, 'Property selection is required')
    .transform(val => val === '' ? null : val),
  
  originalAmount: z.number()
    .min(1, 'Original amount must be greater than 0')
    .max(10000000, 'Original amount must be less than $10,000,000'),
  
  interestRate: z.number()
    .min(0, 'Interest rate must be 0 or greater')
    .max(50, 'Interest rate must be less than 50%'),
  
  rateType: z.enum(['FIXED', 'VARIABLE'], {
    errorMap: () => ({ message: 'Rate type must be either FIXED or VARIABLE' })
  }),
  
  variableRateSpread: z.number()
    .min(-10, 'Variable rate spread must be greater than -10%')
    .max(10, 'Variable rate spread must be less than 10%')
    .optional()
    .nullable()
    .transform(val => val === undefined ? null : val),
  
  primeRate: z.number()
    .min(0, 'Prime rate must be 0 or greater')
    .max(20, 'Prime rate must be less than 20%')
    .optional()
    .nullable()
    .transform(val => val === undefined ? null : val),
  
  amortizationValue: z.number()
    .int('Amortization period must be a whole number')
    .min(1, 'Amortization period must be at least 1')
    .max(600, 'Amortization period must be less than 600 months (50 years)'),
  
  amortizationUnit: z.enum(['years', 'months'], {
    errorMap: () => ({ message: 'Amortization unit must be either years or months' })
  }),
  
  termValue: z.number()
    .int('Term must be a whole number')
    .min(1, 'Term must be at least 1')
    .max(360, 'Term must be less than 360 months (30 years)'),
  
  termUnit: z.enum(['years', 'months'], {
    errorMap: () => ({ message: 'Term unit must be either years or months' })
  }),
  
  startDate: z.date({
    errorMap: () => ({ message: 'Start date must be a valid date' })
  }),
  
  paymentFrequency: z.enum([
    'MONTHLY', 
    'SEMI_MONTHLY', 
    'BI_WEEKLY', 
    'ACCELERATED_BI_WEEKLY', 
    'WEEKLY', 
    'ACCELERATED_WEEKLY'
  ], {
    errorMap: () => ({ message: 'Payment frequency must be one of the supported options' })
  }),
  
  mortgageType: z.enum(['OPEN', 'CLOSED'], {
    errorMap: () => ({ message: 'Mortgage type must be either OPEN or CLOSED' })
  }).optional(),
  
  hasFixedPayments: z.boolean().optional(),
});

// Partial mortgage schema for updates (must be created before refinements)
export const partialMortgageSchema = baseMortgageSchema.partial();

// Mortgage form validation schema with refinements
export const mortgageSchema = baseMortgageSchema.refine((data) => {
  // Validate amortization period based on unit
  if (data.amortizationValue && data.amortizationUnit) {
    if (data.amortizationUnit === 'years' && data.amortizationValue > 50) {
      return false;
    }
    if (data.amortizationUnit === 'months' && data.amortizationValue > 600) {
      return false;
    }
  }
  return true;
}, {
  message: 'Amortization period exceeds maximum allowed',
  path: ['amortizationValue']
}).refine((data) => {
  // Validate term based on unit
  if (data.termValue && data.termUnit) {
    if (data.termUnit === 'years' && data.termValue > 30) {
      return false;
    }
    if (data.termUnit === 'months' && data.termValue > 360) {
      return false;
    }
  }
  return true;
}, {
  message: 'Term exceeds maximum allowed',
  path: ['termValue']
}).refine((data) => {
  // Validate that term does not exceed amortization period
  if (data.amortizationValue && data.amortizationUnit && data.termValue && data.termUnit) {
    const amortizationInMonths = data.amortizationUnit === 'years' 
      ? data.amortizationValue * 12 
      : data.amortizationValue;
    const termInMonths = data.termUnit === 'years' 
      ? data.termValue * 12 
      : data.termValue;
    
    if (termInMonths > amortizationInMonths) {
      return false;
    }
  }
  return true;
}, {
  message: 'Term cannot exceed amortization period',
  path: ['termValue']
});

// Prepayment analysis validation schema
export const prepaymentAnalysisSchema = z.object({
  mortgageData: mortgageSchema,
  prepaymentType: z.enum(['lumpSum', 'increasedPayment']),
  lumpSumAmount: z.number()
    .min(1, 'Lump sum amount must be greater than 0')
    .optional(),
  lumpSumPaymentNumber: z.number()
    .int('Payment number must be a whole number')
    .min(1, 'Payment number must be at least 1')
    .optional(),
  additionalPayment: z.number()
    .min(1, 'Additional payment must be greater than 0')
    .optional(),
  startPaymentNumber: z.number()
    .int('Start payment number must be a whole number')
    .min(1, 'Start payment number must be at least 1')
    .optional(),
}).refine((data) => {
  if (data.prepaymentType === 'lumpSum') {
    return data.lumpSumAmount !== undefined && data.lumpSumPaymentNumber !== undefined;
  }
  if (data.prepaymentType === 'increasedPayment') {
    return data.additionalPayment !== undefined;
  }
  return true;
}, {
  message: 'Required fields are missing for the selected prepayment type',
  path: ['prepaymentType']
});

// Refinance analysis validation schema
export const refinanceAnalysisSchema = z.object({
  currentMortgage: z.object({
    interestRate: z.number()
      .min(0, 'Interest rate must be 0 or greater')
      .max(50, 'Interest rate must be less than 50%'),
    rateType: z.enum(['FIXED', 'VARIABLE']),
    amortizationPeriodYears: z.number()
      .int('Amortization period must be a whole number')
      .min(1, 'Amortization period must be at least 1 year')
      .max(50, 'Amortization period must be less than 50 years'),
    paymentFrequency: z.enum([
      'MONTHLY', 
      'SEMI_MONTHLY', 
      'BI_WEEKLY', 
      'ACCELERATED_BI_WEEKLY', 
      'WEEKLY', 
      'ACCELERATED_WEEKLY'
    ]),
    startDate: z.date().optional(),
    termYears: z.number().int().min(1).max(30).optional(),
  }),
  newMortgage: mortgageSchema,
  remainingBalance: z.number()
    .min(1, 'Remaining balance must be greater than 0')
    .max(10000000, 'Remaining balance must be less than $10,000,000'),
});

// Calculator form validation schema
export const calculatorSchema = z.object({
  originalAmount: z.number()
    .min(1, 'Loan amount must be greater than 0')
    .max(10000000, 'Loan amount must be less than $10,000,000'),
  
  interestRate: z.number()
    .min(0, 'Interest rate must be 0 or greater')
    .max(50, 'Interest rate must be less than 50%'),
  
  rateType: z.enum(['FIXED', 'VARIABLE']),
  
  amortizationPeriodYears: z.number()
    .int('Amortization period must be a whole number')
    .min(1, 'Amortization period must be at least 1 year')
    .max(50, 'Amortization period must be less than 50 years'),
  
  paymentFrequency: z.enum([
    'MONTHLY', 
    'SEMI_MONTHLY', 
    'BI_WEEKLY', 
    'ACCELERATED_BI_WEEKLY', 
    'WEEKLY', 
    'ACCELERATED_WEEKLY'
  ]),
  
  startDate: z.date().optional(),
  termYears: z.number().int().min(1).max(30).optional(),
  includeSchedule: z.boolean().optional().default(false),
});

// Property selection schema
export const propertySelectionSchema = z.object({
  propertyId: z.string().min(1, 'Please select a property'),
});

// Bulk import row validation schema
export const bulkImportRowSchema = z.object({
  lenderName: z.string().min(1, 'Lender name is required'),
  originalAmount: z.number().min(1, 'Original amount must be greater than 0'),
  interestRate: z.number(), // Can be positive or negative
  rateType: z.enum(['Fixed', 'Variable'], {
    errorMap: () => ({ message: 'Rate type must be Fixed or Variable' })
  }),
  amortizationPeriod: z.string().min(1, 'Amortization period is required'),
  term: z.string().min(1, 'Term is required'),
  startDate: z.string().min(1, 'Start date is required'),
  paymentFrequency: z.string().min(1, 'Payment frequency is required'),
  type: z.string().optional(),
  fixedPayments: z.string().optional(),
});

// Bulk import validation schema
export const bulkImportSchema = z.object({
  mortgages: z.array(bulkImportRowSchema),
});

// Helper function to transform form data for API
export function transformMortgageFormData(formData) {
  // Convert amortization to months
  const amortizationInMonths = formData.amortizationUnit === 'years' 
    ? formData.amortizationValue * 12 
    : formData.amortizationValue;
  
  // Convert term to months
  const termInMonths = formData.termUnit === 'years' 
    ? formData.termValue * 12 
    : formData.termValue;

  return {
    ...formData,
    originalAmount: Number(formData.originalAmount),
    interestRate: Number(formData.interestRate) / 100, // Convert percentage to decimal
    variableRateSpread: formData.variableRateSpread ? Number(formData.variableRateSpread) / 100 : null,
    primeRate: formData.primeRate ? Number(formData.primeRate) / 100 : null,
    amortizationPeriodMonths: amortizationInMonths,
    termMonths: termInMonths,
    startDate: formData.startDate instanceof Date ? formData.startDate.toISOString() : formData.startDate,
    mortgageType: formData.mortgageType,
    hasFixedPayments: formData.hasFixedPayments,
  };
}

// Helper function to transform API data for forms
export function transformMortgageApiData(apiData) {
  // Convert amortization from months to years (default) for display
  const amortizationMonths = apiData.amortizationPeriodMonths || apiData.amortizationPeriodYears * 12;
  const amortizationYears = Math.round(amortizationMonths / 12);
  
  // Convert term from months to years (default) for display
  const termMonths = apiData.termMonths || apiData.termYears * 12;
  const termYears = Math.round(termMonths / 12);

  return {
    ...apiData,
    interestRate: Number(apiData.interestRate) * 100, // Convert decimal to percentage
    variableRateSpread: apiData.variableRateSpread ? Number(apiData.variableRateSpread) * 100 : null,
    primeRate: apiData.primeRate ? Number(apiData.primeRate) * 100 : null,
    startDate: apiData.startDate ? new Date(apiData.startDate) : new Date(),
    amortizationValue: amortizationYears,
    amortizationUnit: 'years',
    termValue: termYears,
    termUnit: 'years',
  };
}

// Helper function to parse amortization/term strings to months
export function parsePeriodToMonths(periodString) {
  try {
    console.log('Parsing period:', periodString);
    
    if (!periodString || typeof periodString !== 'string') {
      throw new Error(`Invalid period string: ${periodString}`);
    }
    
    const match = periodString.match(/^(\d+)\s*(months?|years?)$/i);
    if (!match) {
      throw new Error(`Invalid period format: ${periodString}. Expected format: "25 years" or "300 months"`);
    }
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith('year')) {
      return value * 12;
    } else {
      return value;
    }
  } catch (error) {
    console.error('Error parsing period:', error);
    throw error;
  }
}

// Helper function to parse date strings (supports DD-MMM-YY format)
export function parseDateString(dateString) {
  // Handle DD-MMM-YY format (e.g., "04-Feb-19")
  const ddmmyyMatch = dateString.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (ddmmyyMatch) {
    const day = parseInt(ddmmyyMatch[1]);
    const month = ddmmyyMatch[2];
    const year = parseInt(ddmmyyMatch[3]) + 2000; // Convert YY to YYYY
    
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const monthIndex = monthMap[month];
    if (monthIndex === undefined) {
      throw new Error(`Invalid month: ${month}`);
    }
    
    return new Date(year, monthIndex, day);
  }
  
  // Handle YYYY-MM-DD format
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
  
  return date;
}

// Helper function to normalize payment frequency
export function normalizePaymentFrequency(frequency) {
  const freqMap = {
    'monthly': 'MONTHLY',
    'bi-weekly': 'BI_WEEKLY',
    'biweekly': 'BI_WEEKLY',
    'weekly': 'WEEKLY',
    'semi-monthly': 'SEMI_MONTHLY',
    'accelerated bi-weekly': 'ACCELERATED_BI_WEEKLY',
    'accelerated weekly': 'ACCELERATED_WEEKLY'
  };
  
  const normalized = frequency.toLowerCase().trim();
  return freqMap[normalized] || 'MONTHLY';
}

// Helper function to transform bulk import row to mortgage data
export function transformBulkImportRow(row) {
  try {
    console.log('Transforming row:', row);
    
    // Simple parsing for now
    const amortizationMonths = parsePeriodToMonths(row.amortizationPeriod);
    const termMonths = parsePeriodToMonths(row.term);
    const startDate = parseDateString(row.startDate);
    
    // Handle interest rate logic (positive = fixed, negative = variable spread)
    let interestRate, variableRateSpread, rateType;
    
    if (row.rateType.toLowerCase() === 'fixed') {
      rateType = 'FIXED';
      interestRate = Math.abs(parseFloat(row.interestRate)) / 100; // Convert to decimal
      variableRateSpread = null;
    } else {
      rateType = 'VARIABLE';
      interestRate = 5.0 / 100; // Default prime rate as decimal
      variableRateSpread = parseFloat(row.interestRate) / 100; // Keep negative value as decimal
    }
    
    const result = {
      lenderName: row.lenderName.trim(),
      originalAmount: parseFloat(row.originalAmount),
      interestRate,
      rateType,
      variableRateSpread,
      amortizationPeriodMonths: amortizationMonths,
      termMonths,
      startDate,
      paymentFrequency: normalizePaymentFrequency(row.paymentFrequency),
      mortgageType: row.type ? row.type.toUpperCase() : 'CLOSED',
      hasFixedPayments: row.fixedPayments ? row.fixedPayments.toLowerCase() === 'yes' : null,
    };
    
    console.log('Transformed result:', result);
    return result;
  } catch (error) {
    console.error('Error in transformBulkImportRow:', error);
    throw error;
  }
}
