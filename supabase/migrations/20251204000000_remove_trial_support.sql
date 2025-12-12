-- Remove trial support from database
-- This migration removes all trial-related columns, constraints, and data

-- Step 1: Update all users with 'trialing' status to free (NULL)
-- Since we're removing trials entirely, all trial users become free users
-- Their subscription_expires_at may still exist but is no longer relevant
UPDATE public.users 
SET subscription_status = NULL
WHERE subscription_status = 'trialing';

-- Step 2: Drop the index on trial_start_date
DROP INDEX IF EXISTS public.idx_users_trial_start_date;

-- Step 3: Drop the trial_start_date column
ALTER TABLE public.users 
DROP COLUMN IF EXISTS trial_start_date;

-- Step 4: Drop and recreate the subscription_status constraint without 'trialing'
-- First, drop the existing constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_subscription_status_check;

-- Recreate the constraint without 'trialing'
ALTER TABLE public.users 
ADD CONSTRAINT users_subscription_status_check 
CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'past_due', 'canceled', 'expired'));

-- Step 5: Update the comment on subscription_status column
COMMENT ON COLUMN public.users.subscription_status IS 'Detailed subscription status from RevenueCat: active, past_due, canceled, or expired. NULL for free users.';

-- Step 6: Remove the cron job for notify-trial-expired if it exists
DO $$
BEGIN
  -- Unschedule the cron job if it exists
  IF EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'notify-trial-expired'
  ) THEN
    PERFORM cron.unschedule('notify-trial-expired');
    RAISE NOTICE 'Removed notify-trial-expired cron job';
  ELSE
    RAISE NOTICE 'notify-trial-expired cron job not found, skipping removal';
  END IF;
END $$;

-- Step 7: Log the migration
DO $$
DECLARE
  updated_users_count INTEGER;
  trial_users_count INTEGER;
BEGIN
  -- Count users that were updated
  SELECT COUNT(*) INTO updated_users_count 
  FROM public.users 
  WHERE subscription_status = 'expired' OR subscription_status IS NULL;
  
  -- Count any remaining trial_start_date references (should be 0)
  SELECT COUNT(*) INTO trial_users_count 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'trial_start_date';
  
  RAISE NOTICE 'Trial removal migration completed. Updated % users. trial_start_date column exists: %', 
    updated_users_count, 
    CASE WHEN trial_users_count > 0 THEN 'YES' ELSE 'NO' END;
END $$;

