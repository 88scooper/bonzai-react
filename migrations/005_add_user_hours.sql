-- Migration: Add total_hours field to users table
-- This migration adds user hours tracking to the users table

-- Add total_hours column to users table
-- Using DECIMAL(10, 2) to store hours with up to 2 decimal places (e.g., 1234.56 hours)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_hours DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Create index on total_hours for performance (useful for sorting/filtering)
CREATE INDEX IF NOT EXISTS idx_users_total_hours ON users(total_hours);
