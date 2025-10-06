-- Update subscription schema to support tiered subscriptions with expiration
-- This migration renames is_subscribed_to_oddity to subscription_tier and adds subscription_expires_at

-- First, add the new subscription_expires_at column
ALTER TABLE user_profiles 
ADD COLUMN subscription_expires_at TIMESTAMPTZ;

-- Rename the existing boolean column to subscription_tier
-- Convert boolean values to text: true -> 'oddity', false -> 'free'
ALTER TABLE user_profiles 
ADD COLUMN subscription_tier TEXT DEFAULT 'free';

-- Update existing data to convert boolean to text
UPDATE user_profiles 
SET subscription_tier = CASE 
  WHEN is_subscribed_to_oddity = true THEN 'oddity'
  WHEN is_subscribed_to_oddity = false THEN 'free'
  ELSE 'free'
END;

-- Drop the old boolean column
ALTER TABLE user_profiles 
DROP COLUMN is_subscribed_to_oddity;

-- Add constraint to ensure valid subscription tiers
ALTER TABLE user_profiles 
ADD CONSTRAINT valid_subscription_tier 
CHECK (subscription_tier IN ('free', 'oddity', 'anomaly'));

-- Add index for efficient queries on subscription status
CREATE INDEX idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);
CREATE INDEX idx_user_profiles_subscription_expires ON user_profiles(subscription_expires_at);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.subscription_tier IS 'Subscription tier: free, oddity, or anomaly';
COMMENT ON COLUMN user_profiles.subscription_expires_at IS 'When the subscription expires (NULL for free tier)';
