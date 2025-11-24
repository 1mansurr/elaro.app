-- Create the rate_limits table to track per-user API requests
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add composite index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action_time 
  ON public.rate_limits(user_id, action, created_at DESC);

-- Add index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at 
  ON public.rate_limits(created_at);

-- Enable Row Level Security
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own rate limit records
DROP POLICY IF EXISTS "Users can insert their own rate limit records" ON public.rate_limits;
CREATE POLICY "Users can insert their own rate limit records" 
  ON public.rate_limits 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can read their own rate limit records
DROP POLICY IF EXISTS "Users can read their own rate limit records" ON public.rate_limits;
CREATE POLICY "Users can read their own rate limit records" 
  ON public.rate_limits 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: System can delete old rate limit records (for cleanup)
DROP POLICY IF EXISTS "System can delete old rate limit records" ON public.rate_limits;
CREATE POLICY "System can delete old rate limit records" 
  ON public.rate_limits 
  FOR DELETE 
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.rate_limits IS 'Tracks API request rate limits per user and action';
COMMENT ON COLUMN public.rate_limits.user_id IS 'The user making the request';
COMMENT ON COLUMN public.rate_limits.action IS 'The action being rate limited (e.g., create-assignment)';
COMMENT ON COLUMN public.rate_limits.created_at IS 'Timestamp of the request';

