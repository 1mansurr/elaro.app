-- Create unified notification preference system
-- This migration creates a dedicated table for notification preferences and migrates data from users table

-- Step 1: Create the new notification_preferences table.
-- It will have a one-to-one relationship with the users table.
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  reminders_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  srs_reminders_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  assignment_reminders_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  lecture_reminders_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  morning_summary_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  evening_capture_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies: Users can only manage their own preferences.
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add comprehensive comments
COMMENT ON TABLE public.notification_preferences IS 'Stores user-specific settings for all notification types. Single source of truth for notification preferences.';
COMMENT ON COLUMN public.notification_preferences.reminders_enabled IS 'Master switch for all reminder notifications.';
COMMENT ON COLUMN public.notification_preferences.srs_reminders_enabled IS 'Controls Spaced Repetition System reminder notifications.';
COMMENT ON COLUMN public.notification_preferences.assignment_reminders_enabled IS 'Controls assignment reminder notifications.';
COMMENT ON COLUMN public.notification_preferences.lecture_reminders_enabled IS 'Controls lecture reminder notifications.';
COMMENT ON COLUMN public.notification_preferences.morning_summary_enabled IS 'Controls daily morning summary notifications.';
COMMENT ON COLUMN public.notification_preferences.evening_capture_enabled IS 'Controls evening assignment capture notifications.';

-- Step 2: Populate the new table with default settings for all existing users.
-- This ensures that every user has a preferences row.
INSERT INTO public.notification_preferences (user_id, morning_summary_enabled, evening_capture_enabled)
SELECT id, 
       COALESCE(morning_summary_enabled, TRUE), 
       COALESCE(evening_capture_enabled, TRUE)
FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Drop the old, redundant columns from the users table.
ALTER TABLE public.users
DROP COLUMN IF EXISTS morning_summary_enabled,
DROP COLUMN IF EXISTS evening_capture_enabled;

-- Update the users table comment to reflect the change
COMMENT ON TABLE public.users IS 'User profile data. Notification preferences moved to notification_preferences table.';
