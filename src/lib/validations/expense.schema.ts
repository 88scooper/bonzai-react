import { z } from 'zod';

/**
 * Schema for creating an expense
 */
export const createExpenseSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  amount: z.number().min(0, 'Amount must be positive'),
  category: z.string().optional(),
  description: z.string().optional(),
  expenseData: z.record(z.string(), z.any()).optional(), // JSONB field for additional data
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

/**
 * Schema for updating an expense
 */
export const updateExpenseSchema = createExpenseSchema.partial().omit({ propertyId: true });

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

