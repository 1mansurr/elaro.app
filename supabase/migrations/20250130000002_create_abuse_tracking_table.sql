-- Create the abuse_tracking table to detect and respond to abuse patterns

CREATE TABLE IF NOT EXISTS public.abuse_tracking (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  violation_type TEXT NOT NULL, -- 'rate_limit', 'invalid_auth', 'malformed_request'
  violation_count INTEGER DEFAULT 1 NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'warning', 'throttled', 'blocked'
  last_violation TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  first_violation TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_abuse_tracking_user_id 
  ON public.abuse_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_abuse_tracking_ip_address 
  ON public.abuse_tracking(ip_address);

CREATE INDEX IF NOT EXISTS idx_abuse_tracking_status 
  ON public.abuse_tracking(status);

CREATE INDEX IF NOT EXISTS idx_abuse_tracking_composite 
  ON public.abuse_tracking(user_id, ip_address, violation_type);

-- Enable Row Level Security
ALTER TABLE public.abuse_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage abuse tracking records
DROP POLICY IF EXISTS "System can manage abuse tracking" ON public.abuse_tracking;
CREATE POLICY "System can manage abuse tracking" 
  ON public.abuse_tracking 
  FOR ALL 
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.abuse_tracking IS 'Tracks violations and implements graduated responses to abuse';
COMMENT ON COLUMN public.abuse_tracking.violation_type IS 'Type of violation: rate_limit, invalid_auth, malformed_request';
COMMENT ON COLUMN public.abuse_tracking.status IS 'Current status: normal, warning, throttled, blocked';
COMMENT ON COLUMN public.abuse_tracking.violation_count IS 'Number of violations from this user/IP';

