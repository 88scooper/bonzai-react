import { NextRequest, NextResponse } from 'next/server';

/**
 * API logging configuration
 */
const API_LOGGING_CONFIG = {
  // Log slow requests exceeding this threshold (in milliseconds)
  SLOW_REQUEST_THRESHOLD: 1000,
  // Enable detailed logging in development
  DETAILED_LOGGING: process.env.NODE_ENV === 'development',
  // Enable performance warnings
  WARN_ON_SLOW_REQUESTS: true,
};

/**
 * Wraps an API route handler with performance logging
 * Logs request duration and warns on slow requests
 * 
 * @param handler - API route handler function
 * @returns Wrapped handler with logging
 * 
 * @example
 * ```typescript
 * export const GET = withLogging(async (request: NextRequest) => {
 *   // Your handler code
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withLogging<T extends NextRequest>(
  handler: (request: T, context?: any) => Promise<NextResponse> | NextResponse
) {
  return async (request: T, context?: any): Promise<NextResponse> => {
    const start = Date.now();
    const method = request.method;
    const url = request.url;
    const pathname = new URL(url).pathname;

    try {
      const response = await handler(request, context);
      const duration = Date.now() - start;

      // Log request completion
      if (API_LOGGING_CONFIG.DETAILED_LOGGING) {
        console.log(`[API] ${method} ${pathname} - ${response.status} - ${duration}ms`);
      }

      // Warn on slow requests
      if (
        API_LOGGING_CONFIG.WARN_ON_SLOW_REQUESTS &&
        duration > API_LOGGING_CONFIG.SLOW_REQUEST_THRESHOLD
      ) {
        console.warn(
          `[SLOW REQUEST] ${method} ${pathname} took ${duration}ms (threshold: ${API_LOGGING_CONFIG.SLOW_REQUEST_THRESHOLD}ms)`
        );
      }

      // Add performance header to response (for monitoring)
      response.headers.set('X-Response-Time', `${duration}ms`);

      return response;
    } catch (error) {
      const duration = Date.now() - start;

      // Log error with duration
      console.error(
        `[API ERROR] ${method} ${pathname} - Error after ${duration}ms:`,
        error
      );

      // Re-throw to let Next.js handle the error
      throw error;
    }
  };
}

/**
 * Logs API request without wrapping (useful for manual logging)
 * 
 * @param method - HTTP method
 * @param pathname - Request pathname
 * @param duration - Request duration in milliseconds
 * @param status - Response status code
 */
export function logApiRequest(
  method: string,
  pathname: string,
  duration: number,
  status?: number
) {
  if (status !== undefined) {
    if (API_LOGGING_CONFIG.DETAILED_LOGGING) {
      console.log(`[API] ${method} ${pathname} - ${status} - ${duration}ms`);
    }

    if (
      API_LOGGING_CONFIG.WARN_ON_SLOW_REQUESTS &&
      duration > API_LOGGING_CONFIG.SLOW_REQUEST_THRESHOLD
    ) {
      console.warn(
        `[SLOW REQUEST] ${method} ${pathname} took ${duration}ms (threshold: ${API_LOGGING_CONFIG.SLOW_REQUEST_THRESHOLD}ms)`
      );
    }
  } else {
    console.log(`[API] ${method} ${pathname} - ${duration}ms`);
  }
}
