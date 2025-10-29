-- Add trial_start_date and last_welcome_shown_at columns to users table
-- These columns support the OddityWelcomeScreen variant detection and display tracking

-- Add trial_start_date column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS trial_start_date timestamp with time zone;

-- Add last_welcome_shown_at column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_welcome_shown_at timestamp with time zone;

-- Add helpful comments
COMMENT ON COLUMN public.users.trial_start_date IS 'When the user trial began. Used to determine trial-early vs trial-expired purchase variants.';
COMMENT ON COLUMN public.users.last_welcome_shown_at IS 'When the OddityWelcomeScreen was last shown. Used to prevent showing welcome screen multiple times per purchase.';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_trial_start_date 
ON public.users(trial_start_date) 
WHERE trial_start_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_welcome_shown_at 
ON public.users(last_welcome_shown_at) 
WHERE last_welcome_shown_at IS NOT NULL;

-- Backfill trial_start_date for existing users with active trials
-- Calculate as subscription_expires_at - 7 days
UPDATE public.users 
SET trial_start_date = subscription_expires_at - INTERVAL '7 days'
WHERE subscription_status = 'trialing' 
  AND subscription_expires_at IS NOT NULL 
  AND trial_start_date IS NULL;

-- Log the update
DO $$
DECLARE
  trial_users_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trial_users_count 
  FROM public.users 
  WHERE trial_start_date IS NOT NULL;
  
  RAISE NOTICE 'Added trial tracking columns. % users have trial_start_date set.', trial_users_count;
END $$;

