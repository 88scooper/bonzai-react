import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils.js';

export const runtime = 'nodejs';

/**
 * GET /api/test-jwt-secret
 * Test endpoint to verify JWT_SECRET is accessible
 * This helps debug environment variable issues
 */
export const GET = withAdminAuth(async (): Promise<NextResponse> => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      createErrorResponse('Not found', 404),
      { status: 404 }
    );
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    const nodeEnv = process.env.NODE_ENV;
    const vercel = process.env.VERCEL;
    
    // Don't expose the actual secret value, just confirm it exists
    const hasSecret = !!jwtSecret;
    const secretLength = jwtSecret ? jwtSecret.length : 0;
    const isDefaultValue = jwtSecret === 'your-secret-key-change-in-production';
    
    return NextResponse.json(
      createSuccessResponse({
        hasJwtSecret: hasSecret,
        secretLength: secretLength,
        isDefaultValue: isDefaultValue,
        nodeEnv: nodeEnv,
        isVercel: !!vercel,
        // Only show first 4 chars for verification (not the full secret)
        secretPreview: jwtSecret ? `${jwtSecret.substring(0, 4)}...` : 'NOT SET',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Test JWT_SECRET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});
