import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { clearRateLimit, clearAllRateLimits, getClientIP } from '@/lib/rate-limit';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

/**
 * POST /api/admin/reset-rate-limit
 * Reset rate limits for login attempts (admin only)
 * 
 * Can reset specific IP or all rate limits
 */
export const POST = withAdminAuth(async (request: NextRequest, admin) => {
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

    // If no IP specified, clear for the requesting IP
    const requestIP = getClientIP(request);
    const identifier = `login:${requestIP}`;
    await clearRateLimit(identifier);

    return NextResponse.json(
      createSuccessResponse({
        message: `Rate limit cleared for your IP: ${requestIP}`,
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
});
