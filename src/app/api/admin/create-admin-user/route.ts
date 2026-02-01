import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { hashPassword, createUser, getUserByEmail } from '@/lib/auth';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils.js';

export const runtime = 'nodejs';

/**
 * POST /api/admin/create-admin-user
 * Create an admin user (one-time setup endpoint)
 * 
 * This endpoint should be secured in production - consider removing it after initial setup
 * or protecting it with an environment variable check.
 */
export const POST = withAdminAuth(async (request: NextRequest): Promise<NextResponse> => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      createErrorResponse('Not found', 404),
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        createErrorResponse('Email and password are required', 400),
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      // Update user to be admin
      await sql`
        UPDATE users
        SET is_admin = TRUE
        WHERE email = ${email}
      `;

      return NextResponse.json(
        createSuccessResponse({
          message: 'User already exists. Updated to admin.',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            is_admin: true,
          },
        }),
        { status: 200 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser(email, passwordHash, name || 'Admin User');

    // Update user to be admin
    await sql`
      UPDATE users
      SET is_admin = TRUE
      WHERE id = ${user.id}
    `;

    return NextResponse.json(
      createSuccessResponse({
        message: 'Admin user created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_admin: true,
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Handle duplicate email error
    if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
      // Try to update existing user to admin
      try {
        const body = await request.json();
        const { email } = body;
        const existingUser = await getUserByEmail(email);
        
        if (existingUser) {
          await sql`
            UPDATE users
            SET is_admin = TRUE
            WHERE email = ${email}
          `;

          return NextResponse.json(
            createSuccessResponse({
              message: 'User already exists. Updated to admin.',
              user: {
                id: existingUser.id,
                email: existingUser.email,
                name: existingUser.name,
                is_admin: true,
              },
            }),
            { status: 200 }
          );
        }
      } catch (updateError) {
        // Fall through to error response
      }
    }

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
});

