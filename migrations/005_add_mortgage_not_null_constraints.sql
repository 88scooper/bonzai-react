-- Migration 005: Add NOT NULL constraints to mortgages table
-- This migration enforces data integrity at the database level
-- for all required mortgage fields

-- First, update interest_rate precision to support rates up to 99.9999%
-- Change from DECIMAL(5,4) to DECIMAL(6,4)
ALTER TABLE mortgages 
  ALTER COLUMN interest_rate TYPE DECIMAL(6, 4);

-- Add NOT NULL constraints to required fields
-- Note: Before running this migration, ensure all existing records have valid data
-- or update them first

-- Set default values for any NULL records (if they exist) before adding constraints
-- This prevents migration failure on existing data

-- Update NULL lenders to empty string (will be rejected by validation, but allows migration to complete)
UPDATE mortgages SET lender = '' WHERE lender IS NULL;
ALTER TABLE mortgages ALTER COLUMN lender SET NOT NULL;

-- Update NULL amounts to 0 (will be rejected by validation)
UPDATE mortgages SET original_amount = 0 WHERE original_amount IS NULL;
ALTER TABLE mortgages ALTER COLUMN original_amount SET NOT NULL;

-- Update NULL interest rates to 0 (will be rejected by validation)
UPDATE mortgages SET interest_rate = 0 WHERE interest_rate IS NULL;
ALTER TABLE mortgages ALTER COLUMN interest_rate SET NOT NULL;

-- Update NULL rate types to 'FIXED' (will be rejected by validation if invalid)
UPDATE mortgages SET rate_type = 'FIXED' WHERE rate_type IS NULL;
ALTER TABLE mortgages ALTER COLUMN rate_type SET NOT NULL;

-- Update NULL terms to 60 months (5 years) - default
UPDATE mortgages SET term_months = 60 WHERE term_months IS NULL;
ALTER TABLE mortgages ALTER COLUMN term_months SET NOT NULL;

-- Update NULL amortization to 25 years - default
UPDATE mortgages SET amortization_years = 25 WHERE amortization_years IS NULL;
ALTER TABLE mortgages ALTER COLUMN amortization_years SET NOT NULL;

-- Update NULL payment frequencies to 'MONTHLY' - default
UPDATE mortgages SET payment_frequency = 'MONTHLY' WHERE payment_frequency IS NULL;
ALTER TABLE mortgages ALTER COLUMN payment_frequency SET NOT NULL;

-- Update NULL start dates to current date - default
UPDATE mortgages SET start_date = CURRENT_DATE WHERE start_date IS NULL;
ALTER TABLE mortgages ALTER COLUMN start_date SET NOT NULL;

-- Add comments to document the constraints
COMMENT ON COLUMN mortgages.lender IS 'Required: Lender name (e.g., TD Bank, RBC)';
COMMENT ON COLUMN mortgages.original_amount IS 'Required: Original loan amount (DECIMAL precision: 15,2)';
COMMENT ON COLUMN mortgages.interest_rate IS 'Required: Annual interest rate as decimal (DECIMAL precision: 6,4 supports up to 99.9999%)';
COMMENT ON COLUMN mortgages.rate_type IS 'Required: Either FIXED or VARIABLE';
COMMENT ON COLUMN mortgages.term_months IS 'Required: Mortgage term in months';
COMMENT ON COLUMN mortgages.amortization_years IS 'Required: Amortization period in years';
COMMENT ON COLUMN mortgages.payment_frequency IS 'Required: Payment frequency (MONTHLY, BI_WEEKLY, etc.)';
COMMENT ON COLUMN mortgages.start_date IS 'Required: Mortgage start date';
