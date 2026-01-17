import { z } from 'zod';

/**
 * Schema for creating a mortgage
 * All fields except mortgageData are required for a valid mortgage
 */
export const createMortgageSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
  lender: z.string().min(1, 'Lender is required').max(255, 'Lender name is too long'),
  originalAmount: z.number().min(0.01, 'Original amount must be greater than 0').max(10000000, 'Original amount must be less than $10,000,000'),
  interestRate: z.number().min(0, 'Interest rate must be positive').max(1, 'Interest rate must be less than 100%'),
  rateType: z.enum(['FIXED', 'VARIABLE']),
  termMonths: z.number().int().min(1, 'Term must be at least 1 month').max(600, 'Term must be less than 600 months (50 years)'),
  amortizationYears: z.number().int().min(1, 'Amortization must be at least 1 year').max(50, 'Amortization must be less than 50 years'),
  paymentFrequency: z.enum(['MONTHLY', 'SEMI_MONTHLY', 'BI_WEEKLY', 'ACCELERATED_BI_WEEKLY', 'WEEKLY', 'ACCELERATED_WEEKLY']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  mortgageData: z.record(z.string(), z.any()).optional(), // JSONB field for additional data
}).refine((data) => {
  // Validate that term does not exceed amortization period
  const amortizationInMonths = data.amortizationYears * 12;
  if (data.termMonths > amortizationInMonths) {
    return false;
  }
  return true;
}, {
  message: 'Term cannot exceed amortization period',
  path: ['termMonths']
});

export type CreateMortgageInput = z.infer<typeof createMortgageSchema>;

/**
 * Schema for updating a mortgage
 * Create a new schema without refinements for partial updates
 */
const baseMortgageSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
  lender: z.string().min(1, 'Lender is required').max(255, 'Lender name is too long'),
  originalAmount: z.number().min(0.01, 'Original amount must be greater than 0').max(10000000, 'Original amount must be less than $10,000,000'),
  interestRate: z.number().min(0, 'Interest rate must be positive').max(1, 'Interest rate must be less than 100%'),
  rateType: z.enum(['FIXED', 'VARIABLE']),
  termMonths: z.number().int().min(1, 'Term must be at least 1 month').max(600, 'Term must be less than 600 months (50 years)'),
  amortizationYears: z.number().int().min(1, 'Amortization must be at least 1 year').max(50, 'Amortization must be less than 50 years'),
  paymentFrequency: z.enum(['MONTHLY', 'SEMI_MONTHLY', 'BI_WEEKLY', 'ACCELERATED_BI_WEEKLY', 'WEEKLY', 'ACCELERATED_WEEKLY']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  mortgageData: z.record(z.string(), z.any()).optional(),
});

export const updateMortgageSchema = baseMortgageSchema.partial().omit({ propertyId: true });

export type UpdateMortgageInput = z.infer<typeof updateMortgageSchema>;

