-- Update subscription schema to support tiered subscriptions with expiration
-- This migration renames is_subscribed_to_oddity to subscription_tier and adds subscription_expires_at

-- First, add the new subscription_expires_at column
ALTER TABLE public.users 
ADD COLUMN subscription_expires_at TIMESTAMPTZ;

-- Rename the existing boolean column to subscription_tier
-- Convert boolean values to text: true -> 'oddity', false -> 'free'
ALTER TABLE public.users 
ADD COLUMN subscription_tier TEXT DEFAULT 'free';

-- Update existing data to convert boolean to text
UPDATE public.users 
SET subscription_tier = CASE 
  WHEN is_subscribed_to_oddity = true THEN 'oddity'
  WHEN is_subscribed_to_oddity = false THEN 'free'
  ELSE 'free'
END;

-- Drop the old boolean column
ALTER TABLE public.users 
DROP COLUMN is_subscribed_to_oddity;

-- Add constraint to ensure valid subscription tiers
ALTER TABLE public.users 
ADD CONSTRAINT valid_subscription_tier 
CHECK (subscription_tier IN ('free', 'oddity', 'anomaly'));

-- Add index for efficient queries on subscription status
CREATE INDEX idx_users_subscription_tier ON public.users(subscription_tier);
CREATE INDEX idx_users_subscription_expires ON public.users(subscription_expires_at);

-- Add comment for documentation
COMMENT ON COLUMN public.users.subscription_tier IS 'Subscription tier: free, oddity, or anomaly';
COMMENT ON COLUMN public.users.subscription_expires_at IS 'When the subscription expires (NULL for free tier)';
