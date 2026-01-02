import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
  is_admin?: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JWTPayload): string {
  return (jwt.sign as any)(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, email, name, created_at, is_admin
      FROM users
      WHERE email = ${email}
      LIMIT 1
    ` as User[];
    return result[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, email, name, created_at, is_admin
      FROM users
      WHERE id = ${id}
      LIMIT 1
    ` as User[];
    return result[0] || null;
  } catch (error) {
    console.error('Error getting user by id:', error);
    return null;
  }
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  passwordHash: string,
  name?: string
): Promise<User> {
  try {
    const result = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email}, ${passwordHash}, ${name || null})
      RETURNING id, email, name, created_at, is_admin
    ` as User[];
    
    if (!result[0]) {
      throw new Error('Failed to create user');
    }
    
    return result[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Create a session (store token hash in database)
 */
export async function createSession(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  try {
    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${userId}, ${tokenHash}, ${expiresAt})
    `;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Delete a session by token hash
 */
export async function deleteSession(tokenHash: string): Promise<void> {
  try {
    await sql`
      DELETE FROM sessions
      WHERE token_hash = ${tokenHash}
    `;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

/**
 * Delete all expired sessions
 */
export async function deleteExpiredSessions(): Promise<void> {
  try {
    await sql`
      DELETE FROM sessions
      WHERE expires_at < CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error('Error deleting expired sessions:', error);
  }
}

/**
 * Hash a token for storage (simple hash for session tracking)
 */
export function hashToken(token: string): string {
  // Simple hash for session tracking - in production, use crypto.createHash
  return Buffer.from(token).toString('base64').substring(0, 255);
}

/**
 * Update user profile (name and/or email)
 */
export async function updateUser(
  userId: string,
  updates: { name?: string | null; email?: string }
): Promise<User> {
  try {
    // Check if email is being updated and if it's already in use
    if (updates.email) {
      const existingUser = await getUserByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email already in use');
      }
    }

    // Build update query conditionally
    let result: User[];
    
    if (updates.name !== undefined && updates.email) {
      // Update both name and email
      result = await sql`
        UPDATE users
        SET name = ${updates.name}, email = ${updates.email}
        WHERE id = ${userId}
        RETURNING id, email, name, created_at, is_admin
      ` as User[];
    } else if (updates.name !== undefined) {
      // Update only name
      result = await sql`
        UPDATE users
        SET name = ${updates.name}
        WHERE id = ${userId}
        RETURNING id, email, name, created_at, is_admin
      ` as User[];
    } else if (updates.email) {
      // Update only email
      result = await sql`
        UPDATE users
        SET email = ${updates.email}
        WHERE id = ${userId}
        RETURNING id, email, name, created_at, is_admin
      ` as User[];
    } else {
      // No fields to update, return current user
      const user = await getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    }

    if (!result[0]) {
      throw new Error('User not found');
    }

    return result[0];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  try {
    // Get user with password hash
    const result = await sql`
      SELECT id, password_hash
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    ` as Array<{ id: string; password_hash: string }>;

    if (!result[0]) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      result[0].password_hash
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await sql`
      UPDATE users
      SET password_hash = ${newPasswordHash}
      WHERE id = ${userId}
    `;
  } catch (error) {
    console.error('Error updating user password:', error);
    throw error;
  }
}

/**
 * Delete user and related data
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    // Delete user's sessions first (foreign key constraint)
    await sql`
      DELETE FROM sessions
      WHERE user_id = ${userId}
    `;

    // Delete user
    await sql`
      DELETE FROM users
      WHERE id = ${userId}
    `;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

