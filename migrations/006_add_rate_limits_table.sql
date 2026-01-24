-- Add rate_limits table for persistent rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    key VARCHAR(255) PRIMARY KEY,
    points INTEGER NOT NULL,
    expire_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expire_at ON rate_limits(expire_at);
