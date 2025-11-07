-- ============================================================================
-- SCHEDULE MONITORING FUNCTIONS
-- ============================================================================
-- This migration schedules the three monitoring Edge Functions to run daily
-- 
-- Functions scheduled:
-- 1. check-policy-accessibility - Daily at 2 AM UTC
-- 2. monitor-storage - Daily at 3 AM UTC
-- 3. monitor-edge-functions - Daily at 4 AM UTC
--
-- Date: 2025-01-31
-- ============================================================================

-- Ensure pg_cron extension exists
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- ============================================================================
-- FUNCTION 1: check-policy-accessibility
-- ============================================================================
-- Schedule: Daily at 2 AM UTC
-- Purpose: Check Privacy Policy and Terms URLs accessibility
-- ============================================================================

DO $$
BEGIN
  -- Check if the cron job already exists
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'check-policy-accessibility-daily'
  ) THEN
    -- Schedule the function to run daily at 2 AM UTC
    PERFORM cron.schedule(
      'check-policy-accessibility-daily',
      '0 2 * * *', -- Daily at 2:00 AM UTC
      $$
      SELECT
        net.http_post(
          url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/check-policy-accessibility',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
          ),
          body := '{}'::jsonb
        ) AS request_id;
      $$
    );
    
    RAISE NOTICE '✅ Cron job check-policy-accessibility-daily scheduled successfully (daily at 2 AM UTC)';
  ELSE
    RAISE NOTICE '⚠️ Cron job check-policy-accessibility-daily already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- FUNCTION 2: monitor-storage
-- ============================================================================
-- Schedule: Daily at 3 AM UTC
-- Purpose: Monitor storage usage against Free Plan limits
-- ============================================================================

DO $$
BEGIN
  -- Check if the cron job already exists
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'monitor-storage-daily'
  ) THEN
    -- Schedule the function to run daily at 3 AM UTC
    PERFORM cron.schedule(
      'monitor-storage-daily',
      '0 3 * * *', -- Daily at 3:00 AM UTC
      $$
      SELECT
        net.http_post(
          url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/monitor-storage',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
          ),
          body := '{}'::jsonb
        ) AS request_id;
      $$
    );
    
    RAISE NOTICE '✅ Cron job monitor-storage-daily scheduled successfully (daily at 3 AM UTC)';
  ELSE
    RAISE NOTICE '⚠️ Cron job monitor-storage-daily already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- FUNCTION 3: monitor-edge-functions
-- ============================================================================
-- Schedule: Daily at 4 AM UTC
-- Purpose: Check for high-frequency and high-error-rate functions
-- ============================================================================

DO $$
BEGIN
  -- Check if the cron job already exists
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'monitor-edge-functions-daily'
  ) THEN
    -- Schedule the function to run daily at 4 AM UTC
    PERFORM cron.schedule(
      'monitor-edge-functions-daily',
      '0 4 * * *', -- Daily at 4:00 AM UTC
      $$
      SELECT
        net.http_post(
          url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/monitor-edge-functions',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
          ),
          body := '{}'::jsonb
        ) AS request_id;
      $$
    );
    
    RAISE NOTICE '✅ Cron job monitor-edge-functions-daily scheduled successfully (daily at 4 AM UTC)';
  ELSE
    RAISE NOTICE '⚠️ Cron job monitor-edge-functions-daily already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify all three cron jobs were created successfully
-- ============================================================================

DO $$
DECLARE
  job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_count
  FROM cron.job
  WHERE jobname IN (
    'check-policy-accessibility-daily',
    'monitor-storage-daily',
    'monitor-edge-functions-daily'
  );
  
  IF job_count = 3 THEN
    RAISE NOTICE '✅ All 3 monitoring cron jobs verified: PASSED';
  ELSE
    RAISE WARNING '⚠️ Monitoring cron jobs verification: FAILED - Expected 3 jobs, found %', job_count;
  END IF;
END $$;

-- Display all scheduled monitoring jobs
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN jobname = 'check-policy-accessibility-daily' THEN 'Check Privacy Policy and Terms URLs accessibility'
    WHEN jobname = 'monitor-storage-daily' THEN 'Monitor storage usage against Free Plan limits'
    WHEN jobname = 'monitor-edge-functions-daily' THEN 'Check for high-frequency and high-error-rate functions'
    ELSE 'Unknown'
  END as description
FROM cron.job
WHERE jobname IN (
  'check-policy-accessibility-daily',
  'monitor-storage-daily',
  'monitor-edge-functions-daily'
)
ORDER BY jobname;

