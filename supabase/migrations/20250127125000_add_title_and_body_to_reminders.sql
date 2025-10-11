-- Add title and body columns to reminders table for push notifications
ALTER TABLE public.reminders 
ADD COLUMN title TEXT;

ALTER TABLE public.reminders 
ADD COLUMN body TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN public.reminders.title IS 'Title of the push notification to be sent';
COMMENT ON COLUMN public.reminders.body IS 'Body text of the push notification to be sent';
