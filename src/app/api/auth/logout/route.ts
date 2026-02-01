import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { hashToken, deleteSession } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils.js';

export const runtime = 'nodejs';

/**
 * POST /api/auth/logout
 * Logout user by invalidating session
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate request to get user
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    // Get token from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split('Bearer ')[1]
      : null;
    const cookieToken = request.cookies.get('bonzai_auth')?.value || null;
    const token = bearerToken || cookieToken;

    if (token) {
      const tokenHash = hashToken(token);
      // Delete session
      await deleteSession(tokenHash);
    }

    const response = NextResponse.json(
      createSuccessResponse({ message: 'Logged out successfully' }),
      { status: 200 }
    );

    response.cookies.set('bonzai_auth', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Error logging out user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}






