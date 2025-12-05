-- Schedule notify-trial-expired Edge Function to run daily
-- This ensures users are notified when their Oddity trial expires
-- Runs daily at 9 AM UTC to notify users during their day

-- Ensure pg_cron extension exists
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- Check if cron job already exists before creating
DO $$
BEGIN
  -- Check if the cron job already exists
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'notify-trial-expired'
  ) THEN
    -- Schedule the notification function to run daily at 9 AM UTC
    PERFORM cron.schedule(
      'notify-trial-expired',
      '0 9 * * *', -- Daily at 9:00 AM UTC
      $sql$
      SELECT
        net.http_post(
          url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/notify-trial-expired',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
          ),
          body := '{}'::jsonb
        ) AS request_id;
      $sql$
    );
    
    RAISE NOTICE 'Cron job notify-trial-expired scheduled successfully (daily at 9 AM UTC)';
  ELSE
    RAISE NOTICE 'Cron job notify-trial-expired already exists, skipping creation';
  END IF;
END $$;

-- Note: cron.schedule() is a function from pg_cron extension
-- This schedules notify-trial-expired to run daily for automatic trial expiration notifications

-- Verify the schedule was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'notify-trial-expired'
  ) THEN
    RAISE NOTICE '✅ notify-trial-expired cron job verification: PASSED';
  ELSE
    RAISE WARNING '⚠️ notify-trial-expired cron job verification: FAILED - job not found';
  END IF;
END $$;

