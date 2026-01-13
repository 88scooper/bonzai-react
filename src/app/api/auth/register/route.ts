import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations/auth.schema';
import { hashPassword, createUser, generateToken, getUserByEmail, hashToken, createSession } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting - 3 attempts per hour per IP
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      `register:${ip}`,
      3, // max 3 attempts
      60 * 60 * 1000 // 1 hour
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        createErrorResponse(
          'Too many registration attempts. Please try again later.',
          429
        ),
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '3',
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
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return NextResponse.json(
        createErrorResponse(`Validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    const { email, password, name } = validationResult.data;

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        createErrorResponse('User with this email already exists', 409),
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser(email, passwordHash, name);

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
      createSuccessResponse(
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
        },
        201
      ),
      { 
        status: 201,
        headers: {
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        }
      }
    );
  } catch (error) {
    console.error('Error registering user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      createErrorResponse(errorMessage, 500),
      { status: 500 }
    );
  }
}






