import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { changePasswordSchema } from '@/lib/validations/auth.schema';
import { updateUserPassword } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * POST /api/auth/change-password
 * Change user password
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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
    const validationResult = changePasswordSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return NextResponse.json(
        createErrorResponse(`Validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Update password
    await updateUserPassword(user.id, currentPassword, newPassword);

    return NextResponse.json(
      createSuccessResponse({ message: 'Password changed successfully' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error changing password:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Handle specific error cases
    if (errorMessage.includes('Current password is incorrect')) {
      return NextResponse.json(
        createErrorResponse('Current password is incorrect', 401),
        { status: 401 }
      );
    }

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}




