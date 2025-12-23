import { z } from 'zod';

/**
 * Schema for creating a new account
 */
export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(255, 'Account name is too long'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  isDemo: z.boolean().optional().default(false),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/**
 * Schema for updating an account
 */
export const updateAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(255, 'Account name is too long').optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

