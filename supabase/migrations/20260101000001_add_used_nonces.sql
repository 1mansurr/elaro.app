-- Create used_nonces table for HMAC request signing replay protection
-- This table stores nonces used in HMAC-signed requests to prevent replay attacks
CREATE TABLE IF NOT EXISTS used_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Index for efficient nonce lookups (most common operation)
CREATE INDEX idx_used_nonces_nonce ON used_nonces(nonce);

-- Index for cleanup of expired nonces
CREATE INDEX idx_used_nonces_expires_at ON used_nonces(expires_at);

-- Index for cleanup by creation time
CREATE INDEX idx_used_nonces_created_at ON used_nonces(created_at);

-- Comment
COMMENT ON TABLE used_nonces IS 'Stores nonces from HMAC-signed requests to prevent replay attacks. Nonces expire after 10 minutes.';

