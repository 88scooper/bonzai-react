import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

/**
 * POST /api/admin/run-migration
 * Run the admin migration (003_add_admin_field.sql)
 * 
 * This is a one-time setup endpoint to add the is_admin column.
 */
export const POST = withAdminAuth(async (request: NextRequest): Promise<NextResponse> => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      createErrorResponse('Not found', 404),
      { status: 404 }
    );
  }

  try {
    console.log('Running admin migration...');

    // Add is_admin column to users table
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE
    `;

    // Create index on is_admin for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin)
    `;

    console.log('✅ Admin migration completed successfully');

    return NextResponse.json(
      createSuccessResponse({
        message: 'Admin migration completed successfully',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error running admin migration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // If column already exists, that's okay
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      return NextResponse.json(
        createSuccessResponse({
          message: 'Migration already applied (column may already exist)',
        }),
        { status: 200 }
      );
    }

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});

