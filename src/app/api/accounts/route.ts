import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { createAccountSchema } from '@/lib/validations/account.schema';
import { sql } from '@/lib/db';
import { parsePaginationParams, createPaginatedResponse, getOffset } from '@/lib/pagination';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

interface Account {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  is_demo: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * GET /api/accounts
 * Get all accounts for the authenticated user (paginated)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Parse pagination parameters
    const { page, limit } = parsePaginationParams(request);
    const offset = getOffset(page, limit);

    // Get total count - include user's accounts plus demo accounts
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM accounts
      WHERE user_id = ${user.id} OR is_demo = true
    ` as Array<{ count: bigint }>;
    const total = Number(countResult[0]?.count || 0);

    // Get accounts with pagination - include user's accounts plus demo accounts
    // Demo accounts are publicly readable and should appear in everyone's account list
    const accounts = await sql`
      SELECT id, user_id, name, email, is_demo, created_at, updated_at
      FROM accounts
      WHERE user_id = ${user.id} OR is_demo = true
      ORDER BY 
        CASE WHEN user_id = ${user.id} THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    ` as Account[];

    // Return paginated response
    const paginatedResponse = createPaginatedResponse(accounts, total, page, limit);

    return NextResponse.json(
      createSuccessResponse(paginatedResponse),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    });

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});

/**
 * POST /api/accounts
 * Create a new account
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = createAccountSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return NextResponse.json(
        createErrorResponse(`Validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    const { name, email, isDemo } = validationResult.data;

    // Create account
    const result = await sql`
      INSERT INTO accounts (user_id, name, email, is_demo)
      VALUES (${user.id}, ${name}, ${email || null}, ${isDemo || false})
      RETURNING id, user_id, name, email, is_demo, created_at, updated_at
    ` as Account[];

    if (!result[0]) {
      return NextResponse.json(
        createErrorResponse('Failed to create account', 500),
        { status: 500 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(result[0], 201),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});

