-- Migration: Add is_admin field to users table
-- This migration adds admin functionality to the users table

-- Add is_admin column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index on is_admin for performance
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

