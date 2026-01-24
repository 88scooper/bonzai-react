import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations/auth.schema';
import { verifyPassword, generateToken, hashToken, createSession } from '@/lib/auth';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting - 5 attempts per 15 minutes per IP
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      `login:${ip}`,
      5, // max 5 attempts
      15 * 60 * 1000 // 15 minutes
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        createErrorResponse(
          'Too many login attempts. Please try again later.',
          429
        ),
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }

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

    const response = NextResponse.json(
      createSuccessResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      }),
      { 
        status: 200,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        }
      }
    );

    response.cookies.set('bonzai_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Error logging in user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Provide helpful error message for database connection issues
    let userFriendlyMessage = errorMessage;
    if (errorMessage.includes('POSTGRES_URL') || errorMessage.includes('database') || errorMessage.includes('connection')) {
      userFriendlyMessage = 'Database connection error. Please check your database configuration and ensure the server is running.';
    }

    return NextResponse.json(
      createErrorResponse(userFriendlyMessage, 500),
      { status: 500 }
    );
  }
}

