import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';

// Zod schema for PATCH request body validation
// Both fields are optional for PATCH operations
const updateBonzaiTestSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  value: z.number().int('Value must be an integer').optional(),
}).refine(
  (data) => data.name !== undefined || data.value !== undefined,
  {
    message: 'At least one field (name or value) must be provided for update',
  }
);

// Type for the validated request body
type UpdateBonzaiTestInput = z.infer<typeof updateBonzaiTestSchema>;

// Type for database record
interface BonzaiTestRecord {
  id: string;
  name: string;
  value: number | null;
  created_at: Date;
}

/**
 * PATCH /api/bonzai-test/[id]
 * Updates a record in proplytics_test by ID
 * Validates the request body using Zod and returns the updated record
 * TODO: Database table should be renamed from proplytics_test to bonzai_test
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // Parse request body
    const body = await request.json();

    // Validate request body using Zod
    const validationResult = updateBonzaiTestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      ).join(', ');

      return NextResponse.json(
        { success: false, error: `Validation failed: ${errorMessages}` },
        { status: 400 }
      );
    }

    const validatedData: UpdateBonzaiTestInput = validationResult.data;

    // Build and execute the UPDATE query based on provided fields
    // Since both fields are optional, we need to handle each combination
    let result: BonzaiTestRecord[];

    if (validatedData.name !== undefined && validatedData.value !== undefined) {
      // Update both fields
      result = await sql`
        UPDATE proplytics_test
        SET name = ${validatedData.name}, value = ${validatedData.value}
        WHERE id = ${id}
        RETURNING id, name, value, created_at
      ` as BonzaiTestRecord[];
    } else if (validatedData.name !== undefined) {
      // Update name only
      result = await sql`
        UPDATE proplytics_test
        SET name = ${validatedData.name}
        WHERE id = ${id}
        RETURNING id, name, value, created_at
      ` as BonzaiTestRecord[];
    } else {
      // Update value only (validatedData.value is defined due to schema validation)
      result = await sql`
        UPDATE proplytics_test
        SET value = ${validatedData.value!}
        WHERE id = ${id}
        RETURNING id, name, value, created_at
      ` as BonzaiTestRecord[];
    }

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: result[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating test record:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

