import { z } from 'zod';

/**
 * Schema for creating a new property
 */
export const createPropertySchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  nickname: z.string().min(1, 'Nickname is required').max(255, 'Nickname is too long').optional(),
  address: z.string().optional(),
  purchasePrice: z.number().min(0.01, 'Purchase price must be greater than $0').optional(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  closingCosts: z.number().min(0, 'Closing costs must be positive').optional().default(0),
  renovationCosts: z.number().min(0, 'Renovation costs must be positive').optional().default(0),
  initialRenovations: z.number().min(0, 'Initial renovations must be positive').optional().default(0),
  currentMarketValue: z.number().min(0.01, 'Market value must be greater than $0').optional(),
  yearBuilt: z.number().int().min(1800).max(2100).optional(),
  propertyType: z.string().optional(),
  size: z.number().min(0, 'Size must be positive').optional(),
  unitConfig: z.string().optional(),
  propertyData: z.any().optional(), // JSONB field for additional data
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

/**
 * Schema for updating a property
 */
export const updatePropertySchema = createPropertySchema.partial().omit({ accountId: true });

export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

