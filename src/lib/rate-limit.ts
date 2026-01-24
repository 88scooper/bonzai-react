import { sql } from './db';

let rateLimitsTableReady = false;

async function ensureRateLimitsTable(): Promise<void> {
  if (rateLimitsTableReady) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key VARCHAR(255) PRIMARY KEY,
      points INTEGER NOT NULL,
      expire_at TIMESTAMP WITH TIME ZONE NOT NULL
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_rate_limits_expire_at ON rate_limits(expire_at)
  `;

  rateLimitsTableReady = true;
}

/**
 * Database-backed rate limiter for API endpoints
 * Persists across serverless restarts and multiple instances.
 */

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const now = new Date();
  const resetTime = new Date(now.getTime() + windowMs);

  try {
    await ensureRateLimitsTable();
  } catch (error) {
    console.warn('[RateLimit] Failed to ensure rate_limits table:', error);
  }

  // Clean up expired entries occasionally to reduce table growth
  if (Math.random() < 0.01) {
    await sql`DELETE FROM rate_limits WHERE expire_at <= NOW()`;
  }

  let existing: Array<{ key: string; points: number; expire_at: Date }>;
  try {
    existing = await sql`
      SELECT key, points, expire_at
      FROM rate_limits
      WHERE key = ${identifier}
      LIMIT 1
    ` as Array<{ key: string; points: number; expire_at: Date }>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('relation "rate_limits" does not exist')) {
      await ensureRateLimitsTable();
      existing = await sql`
        SELECT key, points, expire_at
        FROM rate_limits
        WHERE key = ${identifier}
        LIMIT 1
      ` as Array<{ key: string; points: number; expire_at: Date }>;
    } else {
      throw error;
    }
  }

  const record = existing[0];

  if (!record || record.expire_at <= now) {
    // New window: reset points
    await sql`
      INSERT INTO rate_limits (key, points, expire_at)
      VALUES (${identifier}, ${maxRequests - 1}, ${resetTime})
      ON CONFLICT (key) DO UPDATE
      SET points = ${maxRequests - 1}, expire_at = ${resetTime}
    `;

    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: resetTime.getTime(),
    };
  }

  if (record.points <= 0) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.expire_at.getTime(),
    };
  }

  const updated = await sql`
    UPDATE rate_limits
    SET points = points - 1
    WHERE key = ${identifier} AND expire_at > NOW() AND points > 0
    RETURNING points, expire_at
  ` as Array<{ points: number; expire_at: Date }>;

  const updatedRecord = updated[0];

  if (!updatedRecord) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.expire_at.getTime(),
    };
  }

  return {
    success: true,
    remaining: updatedRecord.points,
    resetTime: updatedRecord.expire_at.getTime(),
  };
}

/**
 * Clear rate limit for a specific identifier
 * @param identifier - Identifier to clear (e.g., 'login:127.0.0.1' or 'login:unknown')
 */
export async function clearRateLimit(identifier: string): Promise<void> {
  await sql`DELETE FROM rate_limits WHERE key = ${identifier}`;
}

/**
 * Clear all rate limits (use with caution in production)
 */
export async function clearAllRateLimits(): Promise<void> {
  await sql`DELETE FROM rate_limits`;
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: Request): string {
  // Try various headers that proxies/load balancers use
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback for development
  return 'unknown';
}
