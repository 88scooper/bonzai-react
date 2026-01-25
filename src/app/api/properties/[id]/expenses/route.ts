import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createExpenseSchema } from '@/lib/validations/expense.schema';
import { sql } from '@/lib/db';
import { parsePaginationParams, createPaginatedResponse, getOffset } from '@/lib/pagination';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { preventDemoModification } from '@/lib/demo-protection';

export const runtime = 'nodejs';

interface Expense {
  id: string;
  property_id: string;
  date: string;
  amount: number;
  category: string | null;
  description: string | null;
  expense_data: any;
  created_at: Date;
  updated_at: Date;
}

/**
 * Helper function to verify property ownership
 * Allows access to demo account properties (read-only for demo)
 */
async function verifyPropertyOwnership(propertyId: string, userId: string): Promise<boolean> {
  const result = await sql`
    SELECT p.id
    FROM properties p
    INNER JOIN accounts a ON p.account_id = a.id
    WHERE p.id = ${propertyId} AND (a.user_id = ${userId} OR a.is_demo = true)
    LIMIT 1
  ` as Array<{ id: string }>;
  return !!result[0];
}

/**
 * GET /api/properties/[id]/expenses
 * Get expenses for a property (paginated)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      createErrorResponse('Authentication required', 401),
      { status: 401 }
    );
  }

  try {
    const { id: propertyId } = await params;

    // Verify property ownership
    const ownsProperty = await verifyPropertyOwnership(propertyId, user.id);
    if (!ownsProperty) {
      return NextResponse.json(
        createErrorResponse('Property not found', 404),
        { status: 404 }
      );
    }

    // Parse pagination parameters
    const { page, limit } = parsePaginationParams(request);
    const offset = getOffset(page, limit);

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM expenses
      WHERE property_id = ${propertyId}
    ` as Array<{ count: bigint }>;
    const total = Number(countResult[0]?.count || 0);

    // Get expenses with pagination
    const expenses = await sql`
      SELECT id, property_id, date, amount, category, description, expense_data,
             created_at, updated_at
      FROM expenses
      WHERE property_id = ${propertyId}
      ORDER BY date DESC, created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    ` as Expense[];

    const paginatedResponse = createPaginatedResponse(expenses, total, page, limit);

    return NextResponse.json(
      createSuccessResponse(paginatedResponse),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching expenses:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties/[id]/expenses
 * Create a new expense for a property
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      createErrorResponse('Authentication required', 401),
      { status: 401 }
    );
  }

  try {
    const { id: propertyId } = await params;

    // Verify property ownership
    const ownsProperty = await verifyPropertyOwnership(propertyId, user.id);
    if (!ownsProperty) {
      return NextResponse.json(
        createErrorResponse('Property not found', 404),
        { status: 404 }
      );
    }

    // Prevent modifications to demo accounts
    const demoCheck = await preventDemoModification(propertyId, true);
    if (demoCheck) {
      return demoCheck;
    }

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = createExpenseSchema.safeParse({ ...body, propertyId });
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return NextResponse.json(
        createErrorResponse(`Validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    const { date, amount, category, description, expenseData } = validationResult.data;

    // Create expense
    const result = await sql`
      INSERT INTO expenses (property_id, date, amount, category, description, expense_data)
      VALUES (
        ${propertyId},
        ${date}::date,
        ${amount},
        ${category || null},
        ${description || null},
        ${expenseData ? JSON.stringify(expenseData) : null}::jsonb
      )
      RETURNING id, property_id, date, amount, category, description, expense_data,
                 created_at, updated_at
    ` as Expense[];

    if (!result[0]) {
      return NextResponse.json(
        createErrorResponse('Failed to create expense', 500),
        { status: 500 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(result[0], 201),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating expense:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

