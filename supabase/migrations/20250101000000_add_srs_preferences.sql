-- Add SRS preferences to users table
-- This migration adds support for user-customizable SRS settings

-- Add SRS preferences column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS srs_preferences JSONB DEFAULT '{
  "preferredStudyTimes": [],
  "difficultyAdjustment": "moderate",
  "reminderFrequency": "standard",
  "learningStyle": "mixed",
  "customIntervals": [],
  "timezone": "UTC"
}'::jsonb;

-- Add comment to document the structure
COMMENT ON COLUMN public.users.srs_preferences IS 'User preferences for Spaced Repetition System including study times, difficulty adjustment, and custom intervals';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_srs_preferences ON public.users USING GIN (srs_preferences);

-- Update existing users with default preferences
UPDATE public.users 
SET srs_preferences = '{
  "preferredStudyTimes": [],
  "difficultyAdjustment": "moderate",
  "reminderFrequency": "standard",
  "learningStyle": "mixed",
  "customIntervals": [],
  "timezone": "UTC"
}'::jsonb
WHERE srs_preferences IS NULL;
