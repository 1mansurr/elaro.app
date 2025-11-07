-- Schedule process-due-reminders Edge Function to run every 5 minutes
-- This ensures reminders are sent promptly to users
-- Part of Phase 1: Critical Infrastructure Fixes

-- Ensure pg_cron extension exists
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- Check if cron job already exists before creating
DO $$
BEGIN
  -- Check if the cron job already exists
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'process-due-reminders'
  ) THEN
    -- Schedule the reminder processing function every 5 minutes
    PERFORM cron.schedule(
      'process-due-reminders',
      '*/5 * * * *', -- Every 5 minutes
      $$
      SELECT
        net.http_post(
          url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/process-due-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
          ),
          body := '{}'::jsonb
        ) AS request_id;
      $$
    );
    
    RAISE NOTICE 'Cron job process-due-reminders scheduled successfully (every 5 minutes)';
  ELSE
    RAISE NOTICE 'Cron job process-due-reminders already exists, skipping creation';
  END IF;
END $$;

-- Note: cron.schedule() is a function from pg_cron extension
-- This schedules process-due-reminders to run every 5 minutes for automatic reminder processing

-- Verify the schedule was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'process-due-reminders'
  ) THEN
    RAISE NOTICE '✅ process-due-reminders cron job verification: PASSED';
  ELSE
    RAISE WARNING '⚠️ process-due-reminders cron job verification: FAILED - job not found';
  END IF;
END $$;

