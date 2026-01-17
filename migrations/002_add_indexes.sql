-- Additional indexes for query optimization
-- These indexes support common query patterns

-- Index for filtering properties by type
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);

-- Index for filtering expenses by category
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Index for searching properties by nickname
CREATE INDEX IF NOT EXISTS idx_properties_nickname ON properties(nickname);

-- Index for searching accounts by name
CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);

-- Composite index for common property queries
CREATE INDEX IF NOT EXISTS idx_properties_account_type ON properties(account_id, property_type);

-- Composite index for expense queries by property and date range
CREATE INDEX IF NOT EXISTS idx_expenses_property_date ON expenses(property_id, date DESC);

-- Performance optimization: Composite indexes for pagination queries
-- Properties list with account and created_at (used in GET /api/properties)
CREATE INDEX IF NOT EXISTS idx_properties_account_created 
  ON properties(account_id, created_at DESC);

-- Mortgages list with property and created_at (for mortgage queries)
CREATE INDEX IF NOT EXISTS idx_mortgages_property_created 
  ON mortgages(property_id, created_at DESC);

-- Accounts list with user_id and created_at (for account pagination)
CREATE INDEX IF NOT EXISTS idx_accounts_user_created 
  ON accounts(user_id, created_at DESC);






