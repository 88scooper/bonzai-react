import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { updateProfileSchema, changePasswordSchema } from '@/lib/validations/auth.schema';
import { updateUser, updateUserPassword, deleteUser, getUserById } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * GET /api/auth/user
 * Get current user profile
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    // Get full user data including created_at
    const fullUser = await getUserById(user.id);
    
    if (!fullUser) {
      return NextResponse.json(
        createErrorResponse('User not found', 404),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createSuccessResponse({
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        created_at: fullUser.created_at,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting user profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/user
 * Update user profile (name and/or email)
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return NextResponse.json(
        createErrorResponse(`Validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    const { name, email } = validationResult.data;

    // Update user
    const updatedUser = await updateUser(user.id, {
      name: name !== undefined ? name : undefined,
      email,
    });

    return NextResponse.json(
      createSuccessResponse({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        created_at: updatedUser.created_at,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating user profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Handle specific error cases
    if (errorMessage.includes('Email already in use')) {
      return NextResponse.json(
        createErrorResponse('Email already in use', 409),
        { status: 409 }
      );
    }

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/user
 * Delete user account
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    // Delete user and related data
    await deleteUser(user.id);

    return NextResponse.json(
      createSuccessResponse({ message: 'Account deleted successfully' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting user account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}




