# Security Review Report - Bonzai Real Estate App

**Date:** January 2025  
**Reviewer:** Security Audit  
**Project:** Bonzai React Application

---

## Executive Summary

This security review identified **2 critical vulnerabilities**, **1 high-severity vulnerability**, and **15+ medium/low-severity issues** across authentication, authorization, data protection, and dependency management. The application has a solid foundation with JWT authentication and proper SQL injection protection, but requires immediate attention to several security gaps.

### Risk Summary
- **Critical:** 2 issues
- **High:** 1 issue  
- **Medium:** 8 issues
- **Low:** 7+ issues

---

## 🔴 CRITICAL VULNERABILITIES

### 1. Hardcoded JWT Secret with Weak Default
**Location:** `src/lib/auth.ts:5`

```5:6:src/lib/auth.ts
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
```

**Issue:** 
- Default JWT secret is hardcoded and publicly visible in source code
- If `JWT_SECRET` environment variable is not set, the application uses a weak, predictable secret
- This allows attackers to forge JWT tokens and impersonate any user

**Impact:** Complete authentication bypass, unauthorized access to all user data

**Recommendation:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  throw new Error('JWT_SECRET environment variable must be set to a secure random value');
}
```

**Priority:** Fix immediately before production deployment

---

### 2. Vulnerable Dependencies
**Location:** `package.json`

**Issues Found:**
1. **jsPDF v3.0.3** - Critical: Local File Inclusion/Path Traversal (CVE)
   - Range: `<=3.0.4`
   - Fix: Upgrade to `4.0.0` (breaking changes)

2. **xlsx v0.18.5** - High: Prototype Pollution and ReDoS vulnerabilities
   - No fix available in current version
   - Consider alternative libraries or accept risk

**Impact:** 
- jsPDF: Potential file system access, data exfiltration
- xlsx: Denial of service, potential code execution

**Recommendation:**
```bash
# Update jsPDF (requires code changes due to breaking changes)
npm install jspdf@^4.0.0

# For xlsx, consider alternatives:
# - exceljs (actively maintained)
# - node-xlsx (simpler, but less features)
# Or implement strict input validation and file size limits
```

**Priority:** Fix before production, especially jsPDF

---

## 🟠 HIGH SEVERITY ISSUES

### 3. Weak Token Hashing for Session Storage
**Location:** `src/lib/auth.ts:170-173`

```170:173:src/lib/auth.ts
export function hashToken(token: string): string {
  // Simple hash for session tracking - in production, use crypto.createHash
  return Buffer.from(token).toString('base64').substring(0, 255);
}
```

**Issue:**
- Uses base64 encoding instead of cryptographic hashing
- Base64 is reversible, not secure for token storage
- Comment acknowledges this is insecure but code remains unchanged

**Impact:** If session table is compromised, tokens could be decoded and reused

**Recommendation:**
```typescript
import crypto from 'crypto';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

**Priority:** Fix before production

---

## 🟡 MEDIUM SEVERITY ISSUES

### 4. JWT Tokens Stored in localStorage
**Location:** `src/lib/api-client.ts:29`, `src/context/AuthContext.js:56`

**Issue:**
- JWT tokens stored in `localStorage` are vulnerable to XSS attacks
- Any JavaScript running on the page can access `localStorage`
- Tokens persist even after browser close, increasing attack window

**Impact:** XSS attacks can steal tokens, leading to account takeover

**Recommendation:**
- Consider using `httpOnly` cookies (requires server-side session management)
- Or use `sessionStorage` for shorter-lived tokens
- Implement Content Security Policy (CSP) headers
- Add token refresh mechanism with shorter expiration

**Priority:** High priority for production

---

### 5. No Rate Limiting on Authentication Endpoints
**Location:** `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts`

**Issue:**
- No rate limiting on login/register endpoints
- Vulnerable to brute force attacks
- No account lockout mechanism

**Impact:** Attackers can attempt unlimited password guesses

**Recommendation:**
- Implement rate limiting using middleware (e.g., `@upstash/ratelimit`)
- Add account lockout after N failed attempts
- Implement CAPTCHA after multiple failures
- Log failed login attempts for monitoring

**Priority:** High priority for production

---

### 6. Information Disclosure in Error Messages
**Location:** Multiple API routes

**Issues Found:**
- Database connection errors expose internal structure
- Stack traces may leak in development mode
- Error messages sometimes include sensitive details

**Examples:**
```typescript
// src/app/api/auth/login/route.ts:86-88
if (errorMessage.includes('POSTGRES_URL') || errorMessage.includes('database')) {
  userFriendlyMessage = 'Database connection error...';
}
```

**Recommendation:**
- Use generic error messages in production
- Log detailed errors server-side only
- Implement error sanitization middleware
- Ensure `NODE_ENV=production` hides stack traces

**Priority:** Medium priority

---

### 7. File Upload Security Gaps
**Location:** `src/app/api/mortgages/upload/route.js`, `src/app/api/properties/bulk-upload/route.ts`

**Issues:**
- File type validation relies on MIME type and extension (both can be spoofed)
- No file content validation (magic bytes check)
- No virus scanning
- File size limit only on frontend (10MB)
- No timeout for large file processing

**Recommendation:**
```typescript
// Add magic bytes validation
import { fileTypeFromBuffer } from 'file-type';

const buffer = await file.arrayBuffer();
const fileType = await fileTypeFromBuffer(buffer);
if (!['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(fileType?.mime)) {
  return error('Invalid file type');
}

// Add server-side size limit
if (file.size > 10 * 1024 * 1024) {
  return error('File too large');
}
```

**Priority:** Medium priority

---

### 8. Missing CSRF Protection
**Location:** All API routes

**Issue:**
- No CSRF tokens for state-changing operations
- Relies solely on JWT in Authorization header
- If JWT is stored in localStorage, CSRF protection is minimal

**Impact:** Cross-site request forgery attacks possible

**Recommendation:**
- Implement CSRF tokens for POST/PATCH/DELETE requests
- Or use SameSite cookies for JWT storage
- Implement SameSite cookie attributes

**Priority:** Medium priority

---

### 9. Password Policy Weaknesses
**Location:** `src/lib/validations/auth.schema.ts:8`

```8:8:src/lib/validations/auth.schema.ts
password: z.string().min(8, 'Password must be at least 8 characters'),
```

**Issues:**
- Minimum 8 characters (should be 12+)
- No complexity requirements (uppercase, lowercase, numbers, symbols)
- No password history/rotation policy
- No password strength meter

**Recommendation:**
```typescript
password: z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
```

**Priority:** Medium priority

---

### 10. No Input Sanitization for XSS
**Location:** Throughout application

**Issue:**
- User input stored in database may be rendered without sanitization
- No HTML escaping visible in components
- React does auto-escape, but JSON fields may contain unsafe data

**Recommendation:**
- Use DOMPurify for any user-generated content
- Implement input sanitization middleware
- Validate and sanitize all text inputs
- Use parameterized queries (already done for SQL)

**Priority:** Medium priority

---

### 11. Session Management Issues
**Location:** `src/lib/auth.ts:122-136`

**Issues:**
- Sessions stored indefinitely until expiration (7 days)
- No session invalidation on password change
- No "logout all devices" functionality
- No session activity tracking

**Recommendation:**
- Invalidate all sessions on password change
- Add session activity tracking (last used, IP address)
- Implement "logout all devices" feature
- Consider shorter session expiration with refresh tokens

**Priority:** Medium priority

---

## 🟢 LOW SEVERITY / BEST PRACTICES

### 12. Environment Variable Exposure Risk
**Location:** `src/lib/db.ts:3`, `src/lib/api-client.ts:6`

**Issue:**
- `NEXT_PUBLIC_API_URL` exposed to client-side
- Database connection string handling could be improved

**Recommendation:**
- Ensure no sensitive env vars use `NEXT_PUBLIC_` prefix
- Document which env vars are required
- Add validation for required env vars at startup

---

### 13. Console Logging in Production
**Location:** Multiple API routes

**Issue:**
- `console.error`, `console.warn` statements throughout codebase
- May leak sensitive information in production logs

**Recommendation:**
- Use proper logging library (e.g., `winston`, `pino`)
- Implement log levels
- Sanitize logs before output
- Remove or gate console statements in production

---

### 14. Missing Security Headers
**Location:** `next.config.mjs`

**Issue:**
- No security headers configured (CSP, HSTS, X-Frame-Options, etc.)

**Recommendation:**
```javascript
// next.config.mjs
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
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
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  }
];

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

### 15. No Request Size Limits
**Location:** API routes

**Issue:**
- No explicit request body size limits
- Large JSON payloads could cause DoS

**Recommendation:**
- Configure body parser limits in Next.js
- Add request size validation middleware

---

### 16. Missing Audit Logging
**Location:** Throughout application

**Issue:**
- No audit trail for sensitive operations
- Cannot track who accessed/modified what data

**Recommendation:**
- Log all authentication events
- Log all data modifications (create/update/delete)
- Log admin actions
- Store logs securely with retention policy

---

### 17. Authorization Checks - Generally Good
**Status:** ✅ Well Implemented

**Positive Findings:**
- Property ownership verification implemented
- Account ownership checks in place
- Demo account protection working
- Admin middleware properly implemented

**Minor Improvements:**
- Consider row-level security in database
- Add resource-level permissions for fine-grained access

---

## ✅ SECURITY STRENGTHS

1. **SQL Injection Protection:** ✅ Excellent
   - Using parameterized queries with Neon SQL tagged templates
   - No raw SQL string concatenation found

2. **Authentication Architecture:** ✅ Good
   - JWT-based authentication
   - Password hashing with bcrypt (12 rounds)
   - Session management in database

3. **Input Validation:** ✅ Good
   - Zod schemas for validation
   - Type-safe validation throughout

4. **Authorization:** ✅ Good
   - Property ownership verification
   - Account ownership checks
   - Admin role separation

5. **Demo Account Protection:** ✅ Good
   - Read-only enforcement
   - Backend and frontend checks

---

## 📋 PRIORITY ACTION ITEMS

### Immediate (Before Production)
1. ✅ Fix hardcoded JWT secret - **CRITICAL**
2. ✅ Upgrade jsPDF to v4.0.0 - **CRITICAL**
3. ✅ Implement proper token hashing - **HIGH**
4. ✅ Add rate limiting to auth endpoints - **HIGH**
5. ✅ Move JWT tokens from localStorage to httpOnly cookies - **HIGH**

### Short Term (Within 1 Month)
6. ✅ Strengthen password policy
7. ✅ Add security headers
8. ✅ Implement CSRF protection
9. ✅ Add file upload content validation
10. ✅ Sanitize error messages

### Medium Term (Within 3 Months)
11. ✅ Implement audit logging
12. ✅ Add session management improvements
13. ✅ Implement input sanitization
14. ✅ Add request size limits
15. ✅ Replace or secure xlsx library

---

## 🔧 IMPLEMENTATION CHECKLIST

### Critical Fixes
- [ ] Remove hardcoded JWT secret default
- [ ] Add environment variable validation on startup
- [ ] Upgrade jsPDF to v4.0.0
- [ ] Replace base64 token hashing with SHA-256

### High Priority
- [ ] Implement rate limiting middleware
- [ ] Move JWT to httpOnly cookies
- [ ] Add security headers to next.config.mjs
- [ ] Implement CSRF protection

### Medium Priority
- [ ] Strengthen password validation
- [ ] Add file upload magic bytes validation
- [ ] Sanitize all error messages
- [ ] Add request body size limits

### Low Priority
- [ ] Replace console.log with proper logging
- [ ] Implement audit logging
- [ ] Add session activity tracking
- [ ] Document security practices

---

## 📚 REFERENCES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

---

## 📝 NOTES

- This review focused on code-level security issues
- Infrastructure security (server hardening, network security) should be reviewed separately
- Consider engaging a professional security firm for penetration testing before production launch
- Regular security audits should be conducted quarterly

---

**Report Generated:** January 2025  
**Next Review Recommended:** After critical fixes implemented
