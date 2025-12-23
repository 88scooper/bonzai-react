import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { hashToken, deleteSession } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

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

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const tokenHash = hashToken(token);
      
      // Delete session
      await deleteSession(tokenHash);
    }

    return NextResponse.json(
      createSuccessResponse({ message: 'Logged out successfully' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error logging out user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

