-- Add processing lock columns to reminders table
-- This prevents race conditions when processing reminders
-- Part of Phase 1: Critical Infrastructure Fixes

ALTER TABLE public.reminders
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_lock_id UUID,
ADD COLUMN IF NOT EXISTS processing_attempts INTEGER DEFAULT 0;

COMMENT ON COLUMN public.reminders.processing_started_at IS 'Timestamp when processing started (used for lock)';
COMMENT ON COLUMN public.reminders.processing_lock_id IS 'Unique lock ID to prevent concurrent processing';
COMMENT ON COLUMN public.reminders.processing_attempts IS 'Number of processing attempts (for dead letter queue)';

-- Create index for efficient lock queries
CREATE INDEX IF NOT EXISTS idx_reminders_processing_lock 
ON public.reminders(processing_started_at, processing_lock_id)
WHERE completed = false AND processing_started_at IS NOT NULL;

-- Function to clean up stale locks (older than 10 minutes)
-- This handles cases where a job crashes and leaves a lock
CREATE OR REPLACE FUNCTION public.cleanup_stale_reminder_locks()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE public.reminders
  SET 
    processing_started_at = NULL,
    processing_lock_id = NULL,
    processing_attempts = processing_attempts + 1
  WHERE 
    processing_started_at IS NOT NULL
    AND processing_started_at < NOW() - INTERVAL '10 minutes'
    AND completed = false;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_stale_reminder_locks IS 
'Cleans up stale reminder processing locks older than 10 minutes. Should be called periodically.';

-- Function to acquire locks for reminders atomically
-- This prevents race conditions when multiple job instances run concurrently
CREATE OR REPLACE FUNCTION public.acquire_reminder_locks(
  p_lock_id UUID,
  p_stale_threshold_minutes INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  title TEXT,
  body TEXT,
  reminder_type TEXT,
  session_id UUID,
  assignment_id UUID,
  lecture_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stale_threshold TIMESTAMPTZ;
BEGIN
  stale_threshold := NOW() - (p_stale_threshold_minutes || ' minutes')::INTERVAL;
  
  -- Update and return reminders that can be locked
  -- Only lock reminders that are:
  -- 1. Not completed
  -- 2. Due (reminder_time <= now)
  -- 3. Not locked OR have a stale lock
  RETURN QUERY
  WITH locked AS (
    UPDATE public.reminders r
    SET 
      processing_started_at = NOW(),
      processing_lock_id = p_lock_id,
      processing_attempts = COALESCE(processing_attempts, 0) + 1
    WHERE 
      r.completed = false
      AND r.reminder_time <= NOW()
      AND (
        r.processing_started_at IS NULL 
        OR r.processing_started_at < stale_threshold
      )
    RETURNING 
      r.id,
      r.user_id,
      r.title,
      r.body,
      r.reminder_type,
      r.session_id,
      r.assignment_id,
      r.lecture_id
  )
  SELECT * FROM locked;
END;
$$;

COMMENT ON FUNCTION public.acquire_reminder_locks IS 
'Atomically acquires locks for reminders that are due and not already locked. Returns locked reminders.';

-- Schedule cleanup of stale locks every 15 minutes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'cleanup-stale-reminder-locks'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-stale-reminder-locks',
      '*/15 * * * *', -- Every 15 minutes
      $$
      SELECT public.cleanup_stale_reminder_locks();
      $$
    );
    
    RAISE NOTICE 'Cron job cleanup-stale-reminder-locks scheduled successfully (every 15 minutes)';
  ELSE
    RAISE NOTICE 'Cron job cleanup-stale-reminder-locks already exists, skipping creation';
  END IF;
END $$;

