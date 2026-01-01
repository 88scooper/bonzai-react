import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthenticatedUser } from './auth-middleware';
import { getUserById } from './auth';
import { createErrorResponse } from './api-utils';

export interface AuthenticatedAdmin extends AuthenticatedUser {
  is_admin: boolean;
}

/**
 * Check if the authenticated user is an admin
 * Returns the user with admin status if authenticated and admin, null otherwise
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthenticatedAdmin | null> {
  const user = await authenticateRequest(request);
  
  if (!user) {
    return null;
  }

  // Get full user data including is_admin
  const fullUser = await getUserById(user.id);
  
  if (!fullUser || !fullUser.is_admin) {
    return null;
  }

  return {
    id: fullUser.id,
    email: fullUser.email,
    name: fullUser.name,
    is_admin: fullUser.is_admin,
  };
}

/**
 * Wrapper for API route handlers that require admin authentication
 * Returns 401 if not authenticated, 403 if not admin
 */
export function withAdminAuth(
  handler: (request: NextRequest, admin: AuthenticatedAdmin, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    // Get full user data including is_admin
    const fullUser = await getUserById(user.id);
    
    if (!fullUser || !fullUser.is_admin) {
      return NextResponse.json(
        createErrorResponse('Admin access required', 403),
        { status: 403 }
      );
    }

    const admin: AuthenticatedAdmin = {
      id: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      is_admin: fullUser.is_admin,
    };

    return handler(request, admin, context);
  };
}

