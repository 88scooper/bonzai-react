import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { updateAccountSchema } from '@/lib/validations/account.schema';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

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
 * GET /api/accounts/[id]
 * Get a specific account by ID
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
    const { id } = await params;

    // Get account and verify ownership
    const result = await sql`
      SELECT id, user_id, name, email, is_demo, created_at, updated_at
      FROM accounts
      WHERE id = ${id} AND user_id = ${user.id}
      LIMIT 1
    ` as Account[];

    if (!result[0]) {
      return NextResponse.json(
        createErrorResponse('Account not found', 404),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(result[0]),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounts/[id]
 * Update an account
 */
export async function PATCH(
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
    const { id } = await params;

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = updateAccountSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return NextResponse.json(
        createErrorResponse(`Validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Build dynamic UPDATE query using sql template
    if (updateData.name !== undefined && updateData.email !== undefined) {
      const result = await sql`
        UPDATE accounts
        SET name = ${updateData.name}, email = ${updateData.email || null}
        WHERE user_id = ${user.id} AND id = ${id}
        RETURNING id, user_id, name, email, is_demo, created_at, updated_at
      ` as Account[];
      
      if (!result[0]) {
        return NextResponse.json(
          createErrorResponse('Account not found or update failed', 404),
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        createSuccessResponse(result[0]),
        { status: 200 }
      );
    } else if (updateData.name !== undefined) {
      const result = await sql`
        UPDATE accounts
        SET name = ${updateData.name}
        WHERE user_id = ${user.id} AND id = ${id}
        RETURNING id, user_id, name, email, is_demo, created_at, updated_at
      ` as Account[];
      
      if (!result[0]) {
        return NextResponse.json(
          createErrorResponse('Account not found or update failed', 404),
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        createSuccessResponse(result[0]),
        { status: 200 }
      );
    } else if (updateData.email !== undefined) {
      const result = await sql`
        UPDATE accounts
        SET email = ${updateData.email || null}
        WHERE user_id = ${user.id} AND id = ${id}
        RETURNING id, user_id, name, email, is_demo, created_at, updated_at
      ` as Account[];
      
      if (!result[0]) {
        return NextResponse.json(
          createErrorResponse('Account not found or update failed', 404),
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        createSuccessResponse(result[0]),
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        createErrorResponse('No fields to update', 400),
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error updating account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounts/[id]
 * Delete an account
 */
export async function DELETE(
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
    const { id } = await params;

    // Check if account exists and belongs to user
    const checkResult = await sql`
      SELECT id FROM accounts
      WHERE id = ${id} AND user_id = ${user.id}
      LIMIT 1
    ` as Account[];

    if (!checkResult[0]) {
      return NextResponse.json(
        createErrorResponse('Account not found', 404),
        { status: 404 }
      );
    }

    // Prevent deleting demo account
    const account = await sql`
      SELECT is_demo FROM accounts
      WHERE id = ${id} AND user_id = ${user.id}
      LIMIT 1
    ` as Account[];

    if (account[0]?.is_demo) {
      return NextResponse.json(
        createErrorResponse('Cannot delete demo account', 400),
        { status: 400 }
      );
    }

    // Delete account (CASCADE will delete related properties, mortgages, expenses)
    await sql`
      DELETE FROM accounts
      WHERE id = ${id} AND user_id = ${user.id}
    `;

    return NextResponse.json(
      createSuccessResponse({ message: 'Account deleted successfully' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

