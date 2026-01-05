/**
 * JWT utility functions for client-side token handling
 * Note: This only decodes the token, it does NOT verify the signature.
 * Token verification happens server-side via the API.
 */

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Decode JWT token without verification (client-side only)
 * Server-side verification happens via API middleware
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  
  // Check if token expires in less than 1 minute (buffer for clock skew)
  return payload.exp * 1000 < Date.now() + 60000;
}

/**
 * Get user info from JWT token
 */
export function getUserFromToken(token: string): { id: string; email: string } | null {
  const payload = decodeJWT(token);
  if (!payload) return null;
  
  return {
    id: payload.userId,
    email: payload.email,
  };
}






