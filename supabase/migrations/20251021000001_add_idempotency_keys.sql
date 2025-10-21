-- Create idempotency_keys table for preventing duplicate operations
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Index for efficient lookups
CREATE INDEX idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX idx_idempotency_keys_user_id ON idempotency_keys(user_id);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

-- Index for cleanup
CREATE INDEX idx_idempotency_keys_created_at ON idempotency_keys(created_at);

-- Enable Row Level Security
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own idempotency keys
CREATE POLICY "Users can access own idempotency keys"
  ON idempotency_keys
  FOR ALL
  USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE idempotency_keys IS 'Stores idempotency keys to prevent duplicate operations. Keys expire after 24 hours.';

