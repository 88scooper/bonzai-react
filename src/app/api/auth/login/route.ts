import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations/auth.schema';
import { verifyPassword, generateToken, hashToken, createSession } from '@/lib/auth';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return NextResponse.json(
        createErrorResponse(`Validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Get user from database (including password hash)
    const result = await sql`
      SELECT id, email, name, password_hash
      FROM users
      WHERE email = ${email}
      LIMIT 1
    ` as Array<{ id: string; email: string; name: string | null; password_hash: string }>;

    const user = result[0];
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Invalid email or password', 401),
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        createErrorResponse('Invalid email or password', 401),
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Create session
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    await createSession(user.id, tokenHash, expiresAt);

    // Return user and token
    return NextResponse.json(
      createSuccessResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error logging in user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}

