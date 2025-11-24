-- Add subscription_status column to users table
-- This column tracks the detailed status from RevenueCat

-- Add the column with a check constraint
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_status text
CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'expired'));

-- Add a helpful comment
COMMENT ON COLUMN public.users.subscription_status IS 'Detailed subscription status from RevenueCat: trialing, active, past_due, canceled, or expired';

-- Update existing users with appropriate status based on current data
UPDATE public.users 
SET subscription_status = CASE
  -- If they have oddity tier and it hasn't expired, they're active
  WHEN subscription_tier = 'oddity' AND subscription_expires_at > NOW() THEN 'active'
  
  -- If they're free tier but have an expiration date (trial), check if still valid
  WHEN subscription_tier = 'free' AND subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW() THEN 'trialing'
  
  -- If they have an expired subscription
  WHEN subscription_expires_at IS NOT NULL AND subscription_expires_at <= NOW() THEN 'expired'
  
  -- Default free users (no trial)
  ELSE NULL
END
WHERE subscription_status IS NULL;

-- Create an index for faster queries on subscription_status
CREATE INDEX IF NOT EXISTS idx_users_subscription_status 
ON public.users(subscription_status) 
WHERE subscription_status IS NOT NULL;

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM public.users 
  WHERE subscription_status IS NOT NULL;
  
  RAISE NOTICE 'Updated subscription_status for % users', updated_count;
END $$;

