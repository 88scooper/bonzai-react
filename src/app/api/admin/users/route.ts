import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { sql } from '@/lib/db';
import { parsePaginationParams, createPaginatedResponse, getOffset } from '@/lib/pagination';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

interface UserWithCounts {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
  is_admin: boolean;
  account_count: number;
  property_count: number;
  total_hours: number;
  has_demo_account: boolean;
  demo_account_id: string | null;
}

/**
 * GET /api/admin/users
 * Get all users with pagination and search
 */
export const GET = withAdminAuth(async (request: NextRequest, admin) => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      createErrorResponse('Not found', 404),
      { status: 404 }
    );
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const { page, limit } = parsePaginationParams(request);
    const offset = getOffset(page, limit);

    // Build search pattern
    const searchPattern = search ? `%${search}%` : null;

    // Get total count with search
    let countResult: Array<{ count: bigint }>;
    if (searchPattern) {
      countResult = await sql`
        SELECT COUNT(*) as count
        FROM users u
        WHERE u.email ILIKE ${searchPattern} OR u.name ILIKE ${searchPattern}
      ` as Array<{ count: bigint }>;
    } else {
      countResult = await sql`
        SELECT COUNT(*) as count
        FROM users
      ` as Array<{ count: bigint }>;
    }
    const total = Number(countResult[0]?.count || 0);

    // Get users with account and property counts
    let users: Array<{
      id: string;
      email: string;
      name: string | null;
      created_at: Date;
      is_admin: boolean;
      account_count: number;
      property_count: number;
      total_hours: number;
      has_demo_account: boolean;
      demo_account_id: string | null;
    }>;

    if (searchPattern) {
      users = await sql`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.created_at,
          u.is_admin,
          COALESCE(u.total_hours, 0)::numeric as total_hours,
          COALESCE(COUNT(DISTINCT a.id), 0)::int as account_count,
          COALESCE(COUNT(DISTINCT p.id), 0)::int as property_count,
          BOOL_OR(a.is_demo) as has_demo_account,
          (ARRAY_AGG(a.id) FILTER (WHERE a.is_demo))[1] as demo_account_id
        FROM users u
        LEFT JOIN accounts a ON a.user_id = u.id
        LEFT JOIN properties p ON p.account_id = a.id
        WHERE u.email ILIKE ${searchPattern} OR u.name ILIKE ${searchPattern}
        GROUP BY u.id, u.email, u.name, u.created_at, u.is_admin, u.total_hours
        ORDER BY u.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      ` as Array<{
        id: string;
        email: string;
        name: string | null;
        created_at: Date;
        is_admin: boolean;
        total_hours: number;
        account_count: number;
        property_count: number;
        has_demo_account: boolean;
        demo_account_id: string | null;
      }>;
    } else {
      users = await sql`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.created_at,
          u.is_admin,
          COALESCE(u.total_hours, 0)::numeric as total_hours,
          COALESCE(COUNT(DISTINCT a.id), 0)::int as account_count,
          COALESCE(COUNT(DISTINCT p.id), 0)::int as property_count,
          BOOL_OR(a.is_demo) as has_demo_account,
          (ARRAY_AGG(a.id) FILTER (WHERE a.is_demo))[1] as demo_account_id
        FROM users u
        LEFT JOIN accounts a ON a.user_id = u.id
        LEFT JOIN properties p ON p.account_id = a.id
        GROUP BY u.id, u.email, u.name, u.created_at, u.is_admin, u.total_hours
        ORDER BY u.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      ` as Array<{
        id: string;
        email: string;
        name: string | null;
        created_at: Date;
        is_admin: boolean;
        total_hours: number;
        account_count: number;
        property_count: number;
        has_demo_account: boolean;
        demo_account_id: string | null;
      }>;
    }

    const usersWithCounts: UserWithCounts[] = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      is_admin: user.is_admin,
      account_count: user.account_count,
      property_count: user.property_count,
      total_hours: Number(user.total_hours) || 0,
      has_demo_account: user.has_demo_account || false,
      demo_account_id: user.demo_account_id || null,
    }));

    const paginatedResponse = createPaginatedResponse(usersWithCounts, total, page, limit);

    return NextResponse.json(
      createSuccessResponse(paginatedResponse),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching admin users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});

