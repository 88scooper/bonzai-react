import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

/**
 * Admin endpoint to update user password
 * NOTE: This is a temporary endpoint for initial setup
 * Should be removed or secured in production
 */
export const POST = withAdminAuth(async (request: NextRequest): Promise<NextResponse> => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      createErrorResponse('Not found', 404),
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        createErrorResponse('Email and newPassword are required', 400),
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update the user's password
    const result = await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE email = ${email}
      RETURNING id, email, name
    `;

    if (result.length === 0) {
      return NextResponse.json(
        createErrorResponse('User not found', 404),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createSuccessResponse({
        message: 'Password updated successfully',
        user: result[0],
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating password:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});






