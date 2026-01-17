import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createErrorResponse } from './api-utils';

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number };

/**
 * Validates request data against a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 * 
 * @example
 * ```typescript
 * const result = validateRequest(createPropertySchema, body);
 * if (!result.success) {
 *   return NextResponse.json(createErrorResponse(result.error, 400), { status: 400 });
 * }
 * const propertyData = result.data; // Type-safe validated data
 * ```
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Format error messages in a user-friendly way
  const errorMessages = result.error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    })
    .join(', ');
  
  return {
    success: false,
    error: `Validation failed: ${errorMessages}`,
    statusCode: 400,
  };
}

/**
 * Validates request data and returns NextResponse error if validation fails
 * Useful for inline validation in API routes
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Either validated data or NextResponse error
 * 
 * @example
 * ```typescript
 * const validated = validateRequestOrError(createPropertySchema, body);
 * if (validated instanceof NextResponse) {
 *   return validated; // Return error response
 * }
 * const propertyData = validated; // Type-safe validated data
 * ```
 */
export function validateRequestOrError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | NextResponse {
  const result = validateRequest(schema, data);
  
  if (result.success === false) {
    return NextResponse.json(
      createErrorResponse(result.error, result.statusCode || 400),
      { status: result.statusCode || 400 }
    );
  }
  
  return result.data;
}
