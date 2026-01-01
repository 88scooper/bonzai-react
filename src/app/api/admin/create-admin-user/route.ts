import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createUser, getUserByEmail } from '@/lib/auth';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * POST /api/admin/create-admin-user
 * Create an admin user (one-time setup endpoint)
 * 
 * This endpoint should be secured in production - consider removing it after initial setup
 * or protecting it with an environment variable check.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Optional: Add environment check for security
    // Uncomment this in production to disable the endpoint
    // if (process.env.NODE_ENV === 'production') {
    //   return NextResponse.json(
    //     createErrorResponse('This endpoint is disabled in production', 403),
    //     { status: 403 }
    //   );
    // }

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
}

