# Forgot Password Implementation Plan

## Overview
Secure password reset flow using Resend email service, protected against email enumeration attacks.

## Prerequisites
1. Install Resend: `npm install resend`
2. Get Resend API key from https://resend.com
3. Add to `.env.local`: `RESEND_API_KEY=re_xxxxx`
4. Verify domain in Resend dashboard

## Database Schema Changes

Add to `migrations/003_password_reset_tokens.sql`:

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_active_token UNIQUE (user_id, token_hash)
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
```

## Implementation Steps

### Step 1: Create Email Utility (`src/lib/email.ts`)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  await resend.emails.send({
    from: 'Bonzai <noreply@yourdomain.com>',
    to: email,
    subject: 'Reset Your Bonzai Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #205A3E;">Reset Your Password</h2>
        <p>You requested to reset your password. Click the link below to create a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #205A3E; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
```

### Step 2: Create Forgot Password API Route (`src/app/api/auth/forgot-password/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email';
import { hashToken } from '@/lib/auth';
import crypto from 'crypto';

/**
 * POST /api/auth/forgot-password
 * Request password reset (email enumeration protected)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting - 3 requests per hour per IP
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      `forgot-password:${ip}`,
      3,
      60 * 60 * 1000 // 1 hour
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        createErrorResponse(
          'Too many reset requests. Please try again later.',
          429
        ),
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        createErrorResponse('Email is required', 400),
        { status: 400 }
      );
    }

    // Always return success message (email enumeration protection)
    // Check if user exists, but don't reveal the result
    const userResult = await sql`
      SELECT id, email FROM users
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    ` as Array<{ id: string; email: string }>;

    // If user exists, create reset token
    if (userResult[0]) {
      const userId = userResult[0].id;
      
      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(resetToken);
      
      // Expires in 1 hour
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Delete any existing tokens for this user
      await sql`
        DELETE FROM password_reset_tokens
        WHERE user_id = ${userId} AND (expires_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL)
      `;

      // Create new token
      await sql`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${userId}, ${tokenHash}, ${expiresAt})
      `;

      // Send email (don't await - fire and forget for timing consistency)
      sendPasswordResetEmail(userResult[0].email, resetToken).catch((err) => {
        console.error('Failed to send password reset email:', err);
      });
    }

    // Always return the same success message (email enumeration protection)
    return NextResponse.json(
      createSuccessResponse({
        message: 'If an account exists with this email, a password reset link has been sent.',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in forgot password:', error);
    // Still return success to prevent enumeration
    return NextResponse.json(
      createSuccessResponse({
        message: 'If an account exists with this email, a password reset link has been sent.',
      }),
      { status: 200 }
    );
  }
}
```

### Step 3: Create Reset Password API Route (`src/app/api/auth/reset-password/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { hashPassword, hashToken } from '@/lib/auth';
import { passwordSchema } from '@/lib/validations/auth.schema';

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        createErrorResponse('Token and new password are required', 400),
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      const errorMessages = passwordValidation.error.issues
        .map((err) => err.message)
        .join(', ');
      return NextResponse.json(
        createErrorResponse(`Password validation failed: ${errorMessages}`, 400),
        { status: 400 }
      );
    }

    // Find valid token
    const tokenHash = hashToken(token);
    const tokenResult = await sql`
      SELECT prt.user_id, prt.expires_at, prt.used_at
      FROM password_reset_tokens prt
      WHERE prt.token_hash = ${tokenHash}
        AND prt.expires_at > CURRENT_TIMESTAMP
        AND prt.used_at IS NULL
      LIMIT 1
    ` as Array<{ user_id: string; expires_at: Date; used_at: Date | null }>;

    if (!tokenResult[0]) {
      return NextResponse.json(
        createErrorResponse('Invalid or expired reset token', 400),
        { status: 400 }
      );
    }

    const userId = tokenResult[0].user_id;

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user password
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE id = ${userId}
    `;

    // Mark token as used
    await sql`
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE token_hash = ${tokenHash}
    `;

    return NextResponse.json(
      createSuccessResponse({
        message: 'Password reset successfully. You can now log in with your new password.',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      createErrorResponse('Failed to reset password', 500),
      { status: 500 }
    );
  }
}
```

### Step 4: Create Frontend Pages

#### `src/app/forgot-password/page.jsx`
```jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        addToast(data.data.message, { type: "success" });
      } else {
        addToast(data.error || "Failed to send reset email", { type: "error" });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      addToast("An error occurred. Please try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Check Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            If an account exists with this email, a password reset link has been sent.
          </p>
          <Button onClick={() => router.push("/login")}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Forgot Password
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#205A3E] focus:border-[#205A3E] dark:bg-gray-700 dark:text-gray-100"
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
        <p className="mt-4 text-center">
          <a href="/login" className="text-[#205A3E] hover:underline">
            Back to Login
          </a>
        </p>
      </div>
    </div>
  );
}
```

#### `src/app/reset-password/page.jsx`
```jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      addToast("Invalid reset link", { type: "error" });
      router.push("/forgot-password");
    }
  }, [searchParams, addToast, router]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      addToast("Passwords do not match", { type: "error" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (data.success) {
        addToast("Password reset successfully!", { type: "success" });
        router.push("/login");
      } else {
        addToast(data.error || "Failed to reset password", { type: "error" });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      addToast("An error occurred. Please try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Reset Password
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#205A3E] focus:border-[#205A3E] dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Must be at least 10 characters with a number and special character
            </p>
          </div>
          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#205A3E] focus:border-[#205A3E] dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <Button type="submit" disabled={loading || !token} className="w-full">
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### Step 5: Add "Forgot Password" Link to Login Page

Update `src/app/login/page.jsx` to add a link after the password input field:
```jsx
<p className="mt-2 text-right">
  <a href="/forgot-password" className="text-sm text-[#205A3E] hover:underline">
    Forgot password?
  </a>
</p>
```

## Security Features
✅ Email enumeration protection (always returns same message)  
✅ Rate limiting (3 requests/hour per IP)  
✅ Secure token generation (crypto.randomBytes)  
✅ Token expiration (1 hour)  
✅ One-time use tokens  
✅ Password strength validation  
✅ Token hashing (same as JWT tokens)

## Testing Checklist
- [ ] Request reset with valid email
- [ ] Request reset with invalid email (should return same message)
- [ ] Rate limiting works (try 4 requests)
- [ ] Reset link expires after 1 hour
- [ ] Token can only be used once
- [ ] Password validation enforces strength requirements
