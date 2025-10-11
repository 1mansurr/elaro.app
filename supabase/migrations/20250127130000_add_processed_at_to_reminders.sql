ALTER TABLE public.reminders
ADD COLUMN processed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.reminders.processed_at IS 'Timestamp of when the reminder was processed by the job queue.';
