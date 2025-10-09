-- Add columns for new notification preferences to the public.users table
ALTER TABLE public.users
ADD COLUMN morning_summary_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN evening_capture_enabled BOOLEAN DEFAULT TRUE;

-- Add comments to explain the new columns for future reference
COMMENT ON COLUMN public.users.morning_summary_enabled IS 'Controls whether the user receives the 7 AM daily summary notification.';
COMMENT ON COLUMN public.users.evening_capture_enabled IS 'Controls whether the user receives the 7:30 PM assignment capture notification.';
