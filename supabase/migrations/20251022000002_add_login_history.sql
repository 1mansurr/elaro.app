-- Add comprehensive login history tracking
-- Enables users to monitor account access and detect suspicious activity

CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  method TEXT DEFAULT 'email', -- 'email', 'oauth', 'magic_link', 'biometric'
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  location TEXT, -- Approximate location (city, country)
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON public.login_history(created_at);
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON public.login_history(ip_address);

-- Add comments
COMMENT ON TABLE public.login_history IS 'Comprehensive login history for security monitoring and user transparency';
COMMENT ON COLUMN public.login_history.method IS 'Authentication method used: email, oauth, magic_link, or biometric';
COMMENT ON COLUMN public.login_history.device_info IS 'Device details including platform, OS version, app version';
COMMENT ON COLUMN public.login_history.location IS 'Approximate geographic location (city, country)';

-- Enable Row Level Security
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own login history
CREATE POLICY "Users can view own login history"
  ON public.login_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own login history
CREATE POLICY "Users can insert own login history"
  ON public.login_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can view all login history
CREATE POLICY "Admins can view all login history"
  ON public.login_history
  FOR SELECT
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Function to get recent login activity
CREATE OR REPLACE FUNCTION public.get_recent_login_activity(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  success BOOLEAN,
  method TEXT,
  ip_address TEXT,
  device_info JSONB,
  location TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If user_id provided, return their history; otherwise return caller's history
  RETURN QUERY
  SELECT 
    lh.id,
    lh.success,
    lh.method,
    lh.ip_address,
    lh.device_info,
    lh.location,
    lh.created_at
  FROM public.login_history lh
  WHERE lh.user_id = COALESCE(p_user_id, auth.uid())
  ORDER BY lh.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_recent_login_activity IS 'Returns recent login activity for a user';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Login history tracking added successfully';
END $$;

