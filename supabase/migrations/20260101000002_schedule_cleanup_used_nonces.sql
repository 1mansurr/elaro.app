-- Schedule cleanup-used-nonces Edge Function to run hourly
-- This ensures expired nonces are removed to maintain replay protection performance
-- Nonces expire after 10 minutes, cleanup runs every hour

-- Ensure pg_cron extension exists
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- Check if cron job already exists before creating
DO $$
BEGIN
  -- Check if the cron job already exists
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'cleanup-used-nonces'
  ) THEN
    -- Schedule the cleanup function to run hourly
    PERFORM cron.schedule(
      'cleanup-used-nonces',
      '0 * * * *', -- Every hour at minute 0
      $sql$
      SELECT
        net.http_post(
          url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/cleanup-used-nonces',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
          )
        ) AS request_id;
      $sql$
    );
    
    RAISE NOTICE 'Cron job cleanup-used-nonces scheduled successfully (hourly)';
  ELSE
    RAISE NOTICE 'Cron job cleanup-used-nonces already exists, skipping creation';
  END IF;
END $$;

-- Verify the schedule was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'cleanup-used-nonces'
  ) THEN
    RAISE NOTICE '✅ Cleanup cron job verification: PASSED';
  ELSE
    RAISE WARNING '⚠️ Cleanup cron job verification: FAILED - job not found';
  END IF;
END $$;

