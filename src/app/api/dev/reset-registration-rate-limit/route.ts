import { NextRequest, NextResponse } from 'next/server';
import { clearRateLimit, clearAllRateLimits, getClientIP } from '@/lib/rate-limit';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * POST /api/dev/reset-registration-rate-limit
 * Reset registration rate limits (development only)
 * 
 * This endpoint clears registration rate limits to help during development
 * when hitting the "Too many registration attempts" error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // In development, allow clearing rate limits without admin auth
    // In production, you might want to add authentication checks here
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        createErrorResponse('This endpoint is only available in development', 403),
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { all, ip: specifiedIP } = body;

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

    if (specifiedIP) {
      // Clear specific IP for registration
      const registerIdentifier = `register:${specifiedIP}`;
      await clearRateLimit(registerIdentifier);
      return NextResponse.json(
        createSuccessResponse({
          message: `Registration rate limit cleared for IP: ${specifiedIP}`,
        }),
        { status: 200 }
      );
    }

    // If no IP specified, clear for the requesting IP
    const requestIP = getClientIP(request);
    const registerIdentifier = `register:${requestIP}`;
    await clearRateLimit(registerIdentifier);

    return NextResponse.json(
      createSuccessResponse({
        message: `Registration rate limit cleared for your IP: ${requestIP}`,
        ip: requestIP,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resetting registration rate limit:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}