-- Create the ip_rate_limits table to track per-IP API requests
-- This complements the existing per-user rate limiting

CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add composite index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_ip_action_time 
  ON public.ip_rate_limits(ip_address, action, created_at DESC);

-- Add index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_created_at 
  ON public.ip_rate_limits(created_at);

-- Enable Row Level Security
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: System can insert IP rate limit records (for rate limiter)
DROP POLICY IF EXISTS "System can insert IP rate limit records" ON public.ip_rate_limits;
CREATE POLICY "System can insert IP rate limit records" 
  ON public.ip_rate_limits 
  FOR INSERT 
  WITH CHECK (true);

-- Policy: System can read IP rate limit records (for rate limiter)
DROP POLICY IF EXISTS "System can read IP rate limit records" ON public.ip_rate_limits;
CREATE POLICY "System can read IP rate limit records" 
  ON public.ip_rate_limits 
  FOR SELECT 
  USING (true);

-- Policy: System can delete old IP rate limit records (for cleanup)
DROP POLICY IF EXISTS "System can delete old IP rate limit records" ON public.ip_rate_limits;
CREATE POLICY "System can delete old IP rate limit records" 
  ON public.ip_rate_limits 
  FOR DELETE 
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.ip_rate_limits IS 'Tracks API request rate limits per IP address and action';
COMMENT ON COLUMN public.ip_rate_limits.ip_address IS 'The IP address making the request';
COMMENT ON COLUMN public.ip_rate_limits.action IS 'The action being rate limited (e.g., create-assignment)';
COMMENT ON COLUMN public.ip_rate_limits.created_at IS 'Timestamp of the request';

