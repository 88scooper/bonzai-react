import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createUser, getUserByEmail, verifyPassword } from '@/lib/auth';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils.js';

export const runtime = 'nodejs';

/**
 * POST /api/setup/admin-user
 * One-time setup endpoint to create/verify admin user
 * Only available in development mode
 * No authentication required (this is for initial setup)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      createErrorResponse('Not found', 404),
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { email = 'admin@bonzai.io', password = 'testpass', name = 'Admin User' } = body;

    console.log('Setup: Checking admin user...', { email });

    // Check if user exists
    const existingUser = await getUserByEmail(email);
    
    if (existingUser) {
      console.log('Setup: User exists, verifying password and admin status...');
      
      // Get password hash
      const result = await sql`
        SELECT password_hash, is_admin
        FROM users
        WHERE email = ${email}
        LIMIT 1
      ` as Array<{ password_hash: string; is_admin: boolean }>;
      
      if (result[0]) {
        // Verify password
        const isValid = await verifyPassword(password, result[0].password_hash);
        
        if (!isValid) {
          console.log('Setup: Password incorrect, updating...');
          // Update password
          const passwordHash = await hashPassword(password);
          await sql`
            UPDATE users
            SET password_hash = ${passwordHash}
            WHERE email = ${email}
          `;
        }
        
        // Ensure user is admin
        if (!result[0].is_admin) {
          console.log('Setup: User is not admin, updating...');
          await sql`
            UPDATE users
            SET is_admin = TRUE
            WHERE email = ${email}
          `;
        }
        
        return NextResponse.json(
          createSuccessResponse({
            message: 'Admin user verified and updated',
            user: {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name,
              is_admin: true,
            },
            login: {
              email,
              password,
            },
          }),
          { status: 200 }
        );
      }
    }

    // User doesn't exist, create it
    console.log('Setup: User does not exist, creating...');
    
    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser(email, passwordHash, name);

    // Update user to be admin
    await sql`
      UPDATE users
      SET is_admin = TRUE
      WHERE id = ${user.id}
    `;

    console.log('Setup: Admin user created successfully');

    return NextResponse.json(
      createSuccessResponse({
        message: 'Admin user created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_admin: true,
        },
        login: {
          email,
          password,
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Setup: Error setting up admin user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}
