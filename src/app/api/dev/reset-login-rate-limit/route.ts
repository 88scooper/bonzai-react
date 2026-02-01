import { NextRequest, NextResponse } from 'next/server';
import { clearRateLimit, clearAllRateLimits, getClientIP } from '@/lib/rate-limit';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils.js';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/dev/reset-login-rate-limit
 * Reset login rate limits (dev only, no auth required)
 * 
 * This endpoint is only available in development mode.
 * Use this to reset rate limits when you're locked out.
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      createErrorResponse('Not found', 404),
      { status: 404 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { ip, all } = body;

    if (all === true) {
      // Clear all rate limits
      await clearAllRateLimits();
      return NextResponse.json(
        createSuccessResponse({
          message: 'All rate limits cleared successfully',
        }),
        { status: 200 }
      );
    }

    if (ip) {
      // Clear specific IP
      const identifier = `login:${ip}`;
      await clearRateLimit(identifier);
      return NextResponse.json(
        createSuccessResponse({
          message: `Rate limit cleared for IP: ${ip}`,
        }),
        { status: 200 }
      );
    }

    // If no IP specified, clear all login-related rate limits
    const loginLimits = await sql`
      SELECT key FROM rate_limits 
      WHERE key LIKE 'login:%'
    ` as Array<{ key: string }>;
    
    let clearedCount = 0;
    for (const limit of loginLimits) {
      await clearRateLimit(limit.key);
      clearedCount++;
    }

    return NextResponse.json(
      createSuccessResponse({
        message: `Cleared ${clearedCount} login rate limit(s)`,
        cleared: clearedCount,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}
