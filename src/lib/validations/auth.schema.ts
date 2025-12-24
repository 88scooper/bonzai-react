import { z } from 'zod';

/**
 * Schema for user registration
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for updating user profile
 */
export const updateProfileSchema = z.object({
  name: z.string().max(255, 'Name is too long').optional().nullable(),
  email: z.string().email('Invalid email address').optional(),
}).refine((data) => data.name !== undefined || data.email !== undefined, {
  message: 'At least one field (name or email) must be provided',
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Schema for changing password
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

