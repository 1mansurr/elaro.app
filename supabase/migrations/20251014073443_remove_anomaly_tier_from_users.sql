-- ELARO DATABASE CLEANUP: REMOVE ANOMALY TIER
-- This migration removes the unused 'anomaly' subscription tier from the users table constraints.
-- The 'anomaly' tier was never implemented and is not used in the application.

-- First, drop the existing constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS valid_subscription_tier;

-- Then, add the new constraint without the 'anomaly' tier
ALTER TABLE public.users 
ADD CONSTRAINT users_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'oddity'));

-- Update the column comment to reflect the change
COMMENT ON COLUMN public.users.subscription_tier IS 'Subscription tier: free or oddity';
