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

