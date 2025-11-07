-- Schedule cleanup-deleted-items Edge Function to run daily
-- This ensures soft-deleted items are permanently removed after retention period
-- Retention: 48 hours (free users) / 120 hours (premium users)

-- Ensure pg_cron extension exists
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- Check if cron job already exists before creating
DO $$
BEGIN
  -- Check if the cron job already exists
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'cleanup-deleted-items'
  ) THEN
    -- Schedule the cleanup function to run daily at 2 AM UTC
    PERFORM cron.schedule(
      'cleanup-deleted-items',
      '0 2 * * *', -- Daily at 2:00 AM UTC
      $$
      SELECT
        net.http_post(
          url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/cleanup-deleted-items',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
          )
        ) AS request_id;
      $$
    );
    
    RAISE NOTICE 'Cron job cleanup-deleted-items scheduled successfully (daily at 2 AM UTC)';
  ELSE
    RAISE NOTICE 'Cron job cleanup-deleted-items already exists, skipping creation';
  END IF;
END $$;

-- Note: cron.schedule() is a function from pg_cron extension
-- This schedules cleanup-deleted-items to run daily for automatic data retention enforcement

-- Verify the schedule was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'cleanup-deleted-items'
  ) THEN
    RAISE NOTICE '✅ Cleanup cron job verification: PASSED';
  ELSE
    RAISE WARNING '⚠️ Cleanup cron job verification: FAILED - job not found';
  END IF;
END $$;

