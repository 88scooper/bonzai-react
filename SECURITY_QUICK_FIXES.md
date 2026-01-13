# Security Quick Fixes - Priority Actions

## 🚨 CRITICAL - Fix Immediately

### 1. Fix Hardcoded JWT Secret
**File:** `src/lib/auth.ts`

**Current Code:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

**Fix:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  throw new Error('JWT_SECRET environment variable must be set to a secure random value');
}
```

**Action:** Set `JWT_SECRET` in all environments (local, staging, production)

---

### 2. Fix Token Hashing
**File:** `src/lib/auth.ts`

**Current Code:**
```typescript
export function hashToken(token: string): string {
  // Simple hash for session tracking - in production, use crypto.createHash
  return Buffer.from(token).toString('base64').substring(0, 255);
}
```

**Fix:**
```typescript
import crypto from 'crypto';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

---

### 3. Update Vulnerable Dependencies
**File:** `package.json`

**Actions:**
```bash
# Update jsPDF (breaking changes - test thoroughly)
npm install jspdf@^4.0.0

# Review xlsx usage - consider alternatives
# Options: exceljs, node-xlsx, or accept risk with strict validation
```

---

## ⚠️ HIGH PRIORITY - Fix Before Production

### 4. Add Rate Limiting
**Install:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Create:** `src/lib/rate-limit.ts`
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
});

export const registerRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
});
```

**Use in:** `src/app/api/auth/login/route.ts`
```typescript
import { loginRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await loginRateLimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      createErrorResponse('Too many login attempts. Please try again later.', 429),
      { status: 429 }
    );
  }
  
  // ... rest of login logic
}
```

---

### 5. Add Security Headers
**File:** `next.config.mjs`

**Add:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

### 6. Strengthen Password Policy
**File:** `src/lib/validations/auth.schema.ts`

**Current:**
```typescript
password: z.string().min(8, 'Password must be at least 8 characters'),
```

**Fix:**
```typescript
password: z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
```

---

## 📋 Environment Variables Checklist

Ensure these are set in **all environments**:

```bash
# Required - No defaults allowed
JWT_SECRET=<generate with: openssl rand -base64 32>
POSTGRES_URL=<your-neon-connection-string>

# Optional but recommended
JWT_EXPIRES_IN=7d
NODE_ENV=production

# For rate limiting (if implemented)
UPSTASH_REDIS_REST_URL=<your-upstash-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>
```

---

## ✅ Testing Checklist

After implementing fixes:

- [ ] Test JWT authentication still works
- [ ] Test rate limiting blocks excessive requests
- [ ] Test password validation with new requirements
- [ ] Verify security headers are present (use browser dev tools)
- [ ] Test file uploads still work after jsPDF update
- [ ] Verify no console errors in production build
- [ ] Test all API endpoints still function correctly

---

## 📞 Need Help?

- See full report: `SECURITY_REVIEW_REPORT.md`
- Review OWASP Top 10: https://owasp.org/www-project-top-ten/
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/security-headers
