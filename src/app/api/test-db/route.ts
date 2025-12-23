import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/test-db
 * Simple endpoint to test database connection
 * No authentication required for testing
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Test basic query
    const result = await sql`
      SELECT NOW() as current_time, version() as postgres_version
    `;

    return NextResponse.json(
      {
        success: true,
        message: 'Database connection successful',
        data: result[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: `Database connection failed: ${errorMessage}`,
        hint: 'Check your POSTGRES_URL environment variable',
      },
      { status: 500 }
    );
  }
}

