-- Add account lockout columns to users table
-- Prevents brute force attacks by locking accounts after failed login attempts

-- Add lockout tracking columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN public.users.locked_until IS 'Timestamp until which the account is locked (NULL = not locked)';

-- Create login_attempts table for detailed tracking
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at);

-- Create index for locked accounts
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON public.users(locked_until) WHERE locked_until IS NOT NULL;

-- Add comments
COMMENT ON TABLE public.login_attempts IS 'Tracks all login attempts for security monitoring and account lockout enforcement';
COMMENT ON COLUMN public.login_attempts.success IS 'Whether the login attempt was successful';
COMMENT ON COLUMN public.login_attempts.failure_reason IS 'Reason for login failure (e.g., "invalid_password", "account_locked")';

-- Enable Row Level Security
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own login attempts
CREATE POLICY "Users can view own login attempts"
  ON public.login_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all login attempts
CREATE POLICY "Admins can view all login attempts"
  ON public.login_attempts
  FOR SELECT
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO v_locked_until
  FROM public.users
  WHERE email = p_email;
  
  -- If locked_until is in the future, account is locked
  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN TRUE;
  END IF;
  
  -- Auto-unlock if lockout period has passed
  IF v_locked_until IS NOT NULL AND v_locked_until <= NOW() THEN
    UPDATE public.users
    SET locked_until = NULL, failed_login_attempts = 0
    WHERE email = p_email;
  END IF;
  
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.is_account_locked IS 'Checks if an account is currently locked and auto-unlocks if lockout period has passed';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Account lockout system added successfully';
END $$;

