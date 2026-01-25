import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { deleteUser, getUserById } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

export const runtime = 'nodejs';

/**
 * DELETE /api/admin/users/[id]
 * Delete a user (admin only)
 */
export const DELETE = withAdminAuth(async (
  request: NextRequest,
  admin,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Production kill-switch
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      createErrorResponse('Not found', 404),
      { status: 404 }
    );
  }

  try {
    const { id } = await params;

    // Prevent admins from deleting themselves
    if (id === admin.id) {
      return NextResponse.json(
        createErrorResponse('Cannot delete your own account', 400),
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        createErrorResponse('User not found', 404),
        { status: 404 }
      );
    }

    // Delete user (this will cascade delete related data)
    await deleteUser(id);

    return NextResponse.json(
      createSuccessResponse({ message: 'User deleted successfully' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});

