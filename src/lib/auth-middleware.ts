import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById, hashToken } from './auth';
import { sql } from './db';
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
    // Get Authorization header or session cookie
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split('Bearer ')[1]
      : null;
    const cookieToken = request.cookies.get('bonzai_auth')?.value || null;
    const token = bearerToken || cookieToken;

    if (!token) {
      return null;
    }

    // Verify token
    const payload = verifyToken(token);

    // Validate session exists and is not expired
    const tokenHash = hashToken(token);
    const sessionResult = await sql`
      SELECT 1
      FROM sessions
      WHERE token_hash = ${tokenHash} AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `;
    if (!sessionResult[0]) {
      return null;
    }
    
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

