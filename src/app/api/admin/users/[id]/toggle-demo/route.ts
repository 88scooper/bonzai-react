import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * PATCH /api/admin/users/[id]/toggle-demo
 * Toggle demo account read-only status for a user (admin only)
 */
export const PATCH = withAdminAuth(async (
  request: NextRequest,
  admin,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: userId } = await params;

    // Find the user
    const userResult = await sql`
      SELECT id, email FROM users WHERE id = ${userId}
    ` as Array<{ id: string; email: string }>;

    if (userResult.length === 0) {
      return NextResponse.json(
        createErrorResponse('User not found', 404),
        { status: 404 }
      );
    }

    // Find all accounts for this user
    const accountsResult = await sql`
      SELECT id, name, email, is_demo 
      FROM accounts 
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
    ` as Array<{ id: string; name: string; email: string; is_demo: boolean }>;

    if (accountsResult.length === 0) {
      return NextResponse.json(
        createErrorResponse('No accounts found for this user', 404),
        { status: 404 }
      );
    }

    // Toggle demo status on all accounts for this user
    // If any account is demo, set all to false; otherwise set all to true
    const hasDemoAccount = accountsResult.some(acc => acc.is_demo);
    const newDemoStatus = !hasDemoAccount;

    // Update all accounts
    await sql`
      UPDATE accounts
      SET is_demo = ${newDemoStatus}
      WHERE user_id = ${userId}
    `;

    return NextResponse.json(
      createSuccessResponse({
        message: `Demo account status ${newDemoStatus ? 'enabled' : 'disabled'} for user`,
        user_id: userId,
        demo_status: newDemoStatus,
        accounts_updated: accountsResult.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error toggling demo status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});
