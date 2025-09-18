-- Add onboarding_completed column to users table
-- This tracks whether a user has completed the onboarding process

ALTER TABLE public.users
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.onboarding_completed IS 'Tracks whether the user has completed the onboarding flow';
