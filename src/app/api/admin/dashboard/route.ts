import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

interface DashboardStats {
  totalUsers: number;
  totalAccounts: number;
  totalProperties: number;
  totalMortgages: number;
  newUsers7d: number;
  newUsers30d: number;
  newAccounts30d: number;
  newProperties30d: number;
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    created_at: Date;
    is_admin: boolean;
  }>;
}

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 */
export const GET = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    // Get total counts
    const [usersResult, accountsResult, propertiesResult, mortgagesResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM users`,
      sql`SELECT COUNT(*) as count FROM accounts`,
      sql`SELECT COUNT(*) as count FROM properties`,
      sql`SELECT COUNT(*) as count FROM mortgages`,
    ]);
    
    const usersCount = usersResult as Array<{ count: bigint }>;
    const accountsCount = accountsResult as Array<{ count: bigint }>;
    const propertiesCount = propertiesResult as Array<{ count: bigint }>;
    const mortgagesCount = mortgagesResult as Array<{ count: bigint }>;

    // Get new users in last 7 and 30 days
    const [newUsers7dResult, newUsers30dResult] = await Promise.all([
      sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      `,
      sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      `,
    ]);
    const newUsers7d = newUsers7dResult as Array<{ count: bigint }>;
    const newUsers30d = newUsers30dResult as Array<{ count: bigint }>;

    // Get new accounts and properties in last 30 days
    const [newAccounts30dResult, newProperties30dResult] = await Promise.all([
      sql`
        SELECT COUNT(*) as count
        FROM accounts
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      `,
      sql`
        SELECT COUNT(*) as count
        FROM properties
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      `,
    ]);
    const newAccounts30d = newAccounts30dResult as Array<{ count: bigint }>;
    const newProperties30d = newProperties30dResult as Array<{ count: bigint }>;

    // Get 10 most recent users (last 30 days)
    const recentUsersResult = await sql`
      SELECT id, email, name, created_at, is_admin
      FROM users
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const recentUsers = recentUsersResult as Array<{
      id: string;
      email: string;
      name: string | null;
      created_at: Date;
      is_admin: boolean;
    }>;

    const stats: DashboardStats = {
      totalUsers: Number(usersCount[0]?.count || 0),
      totalAccounts: Number(accountsCount[0]?.count || 0),
      totalProperties: Number(propertiesCount[0]?.count || 0),
      totalMortgages: Number(mortgagesCount[0]?.count || 0),
      newUsers7d: Number(newUsers7d[0]?.count || 0),
      newUsers30d: Number(newUsers30d[0]?.count || 0),
      newAccounts30d: Number(newAccounts30d[0]?.count || 0),
      newProperties30d: Number(newProperties30d[0]?.count || 0),
      recentUsers: recentUsers.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        is_admin: user.is_admin,
      })),
    };

    return NextResponse.json(
      createSuccessResponse(stats),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});

