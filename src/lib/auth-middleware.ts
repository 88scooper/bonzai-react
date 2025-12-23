import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from './auth';
import { createErrorResponse } from './api-utils';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Authentication middleware for API routes
 * Extracts and validates JWT token from Authorization header
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    // Extract token
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return null;
    }

    // Verify token
    const payload = verifyToken(token);
    
    // Get user from database to ensure they still exist
    const user = await getUserById(payload.userId);
    
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  } catch (error) {
    console.warn('Authentication failed:', error);
    return null;
  }
}

/**
 * Wrapper for API route handlers that require authentication
 * Returns 401 if not authenticated
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    return handler(request, user, context);
  };
}

/**
 * Optional authentication - doesn't fail if no token, but provides user if available
 */
export async function optionalAuth(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  return authenticateRequest(request);
}

