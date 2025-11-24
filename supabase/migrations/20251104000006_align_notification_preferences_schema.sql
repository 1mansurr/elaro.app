-- Align notification_preferences schema with TypeScript interfaces
-- This migration adds missing columns that are referenced in code

-- Add master controls
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS master_toggle BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS do_not_disturb BOOLEAN DEFAULT false;

-- Add quiet hours enabled flag (start/end already exist from previous migration)
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false;

-- Add email notification preferences
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;

-- Add marketing preferences (opt-in required)
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS marketing_notifications BOOLEAN DEFAULT false;

-- Add advanced notification preferences
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS vibration_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS badges_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preview_enabled BOOLEAN DEFAULT true;

-- Add frequency settings
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS max_per_day INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS cooldown_period INTEGER DEFAULT 30; -- minutes

-- Add comments
COMMENT ON COLUMN public.notification_preferences.master_toggle IS 'Master switch to enable/disable all notifications';
COMMENT ON COLUMN public.notification_preferences.do_not_disturb IS 'Temporarily disable all notifications';
COMMENT ON COLUMN public.notification_preferences.quiet_hours_enabled IS 'Whether quiet hours are enabled';
COMMENT ON COLUMN public.notification_preferences.email_notifications IS 'Enable/disable email notifications';
COMMENT ON COLUMN public.notification_preferences.push_notifications IS 'Enable/disable push notifications';
COMMENT ON COLUMN public.notification_preferences.marketing_notifications IS 'Enable/disable marketing emails (opt-in required)';
COMMENT ON COLUMN public.notification_preferences.max_per_day IS 'Maximum notifications per day';
COMMENT ON COLUMN public.notification_preferences.cooldown_period IS 'Cooldown period between notifications in minutes';

-- Update existing rows to have defaults
UPDATE public.notification_preferences
SET 
  master_toggle = COALESCE(master_toggle, true),
  do_not_disturb = COALESCE(do_not_disturb, false),
  quiet_hours_enabled = COALESCE(quiet_hours_enabled, false),
  email_notifications = COALESCE(email_notifications, true),
  push_notifications = COALESCE(push_notifications, true),
  marketing_notifications = COALESCE(marketing_notifications, false),
  vibration_enabled = COALESCE(vibration_enabled, true),
  sound_enabled = COALESCE(sound_enabled, true),
  badges_enabled = COALESCE(badges_enabled, true),
  preview_enabled = COALESCE(preview_enabled, true),
  max_per_day = COALESCE(max_per_day, 10),
  cooldown_period = COALESCE(cooldown_period, 30)
WHERE master_toggle IS NULL OR do_not_disturb IS NULL OR quiet_hours_enabled IS NULL;

-- Set quiet_hours_enabled based on whether start/end are set
UPDATE public.notification_preferences
SET quiet_hours_enabled = (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
WHERE quiet_hours_enabled = false AND (quiet_hours_start IS NOT NULL OR quiet_hours_end IS NOT NULL);

