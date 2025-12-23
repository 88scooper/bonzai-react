import { z } from 'zod';

/**
 * Schema for creating a mortgage
 */
export const createMortgageSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
  lender: z.string().min(1, 'Lender is required').max(255, 'Lender name is too long').optional(),
  originalAmount: z.number().min(0, 'Original amount must be positive').optional(),
  interestRate: z.number().min(0, 'Interest rate must be positive').max(1, 'Interest rate must be less than 100%').optional(),
  rateType: z.string().optional(),
  termMonths: z.number().int().min(1).max(600).optional(),
  amortizationYears: z.number().int().min(1).max(50).optional(),
  paymentFrequency: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  mortgageData: z.record(z.any()).optional(), // JSONB field for additional data
});

export type CreateMortgageInput = z.infer<typeof createMortgageSchema>;

/**
 * Schema for updating a mortgage
 */
export const updateMortgageSchema = createMortgageSchema.partial().omit({ propertyId: true });

export type UpdateMortgageInput = z.infer<typeof updateMortgageSchema>;

