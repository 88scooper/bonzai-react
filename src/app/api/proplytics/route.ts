import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';

// Zod schema for POST request body validation
const createProplyticsTestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.number().int('Value must be an integer'),
});

// Type for the validated request body
type CreateProplyticsTestInput = z.infer<typeof createProplyticsTestSchema>;

// Type for database record
interface ProplyticsTestRecord {
  id: string;
  name: string;
  value: number | null;
  created_at: Date;
}

/**
 * GET /api/proplytics
 * Fetches all records from proplytics_test ordered by created_at descending
 */
export async function GET(): Promise<NextResponse> {
  try {
    const records = await sql`
      SELECT id, name, value, created_at
      FROM proplytics_test
      ORDER BY created_at DESC
    ` as ProplyticsTestRecord[];
    
    return NextResponse.json(
      { success: true, data: records },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching proplytics_test records:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proplytics
 * Creates a new record in proplytics_test
 * Validates the request body using Zod and returns the newly created record
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request body using Zod
    const validationResult = createProplyticsTestSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      return NextResponse.json(
        { success: false, error: `Validation failed: ${errorMessages}` },
        { status: 400 }
      );
    }
    
    const validatedData: CreateProplyticsTestInput = validationResult.data;
    
    // Insert the record and return it using RETURNING *
    const result = await sql`
      INSERT INTO proplytics_test (name, value)
      VALUES (${validatedData.name}, ${validatedData.value})
      RETURNING id, name, value, created_at
    ` as ProplyticsTestRecord[];
    
    const newRecord = result[0];
    
    if (!newRecord) {
      return NextResponse.json(
        { success: false, error: 'Failed to create record' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: newRecord },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating proplytics_test record:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Handle specific database errors
    if (error instanceof Error && error.message.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: 'Duplicate record' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

