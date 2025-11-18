-- Verification script for SRS/Reminder/Scheduling fixes
-- Run this after applying all migrations to verify everything is set up correctly

-- 1. Verify cron jobs are scheduled
DO $$
DECLARE
  process_due_exists BOOLEAN;
  cleanup_locks_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'process-due-reminders') INTO process_due_exists;
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-reminder-locks') INTO cleanup_locks_exists;
  
  IF process_due_exists THEN
    RAISE NOTICE '✅ Cron job process-due-reminders: EXISTS';
  ELSE
    RAISE WARNING '❌ Cron job process-due-reminders: MISSING';
  END IF;
  
  IF cleanup_locks_exists THEN
    RAISE NOTICE '✅ Cron job cleanup-stale-reminder-locks: EXISTS';
  ELSE
    RAISE WARNING '❌ Cron job cleanup-stale-reminder-locks: MISSING';
  END IF;
END $$;

-- 2. Verify reminder table has lock columns
DO $$
DECLARE
  has_processing_started_at BOOLEAN;
  has_processing_lock_id BOOLEAN;
  has_processing_attempts BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reminders' AND column_name = 'processing_started_at'
  ) INTO has_processing_started_at;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reminders' AND column_name = 'processing_lock_id'
  ) INTO has_processing_lock_id;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reminders' AND column_name = 'processing_attempts'
  ) INTO has_processing_attempts;
  
  IF has_processing_started_at AND has_processing_lock_id AND has_processing_attempts THEN
    RAISE NOTICE '✅ Reminder lock columns: ALL PRESENT';
  ELSE
    RAISE WARNING '❌ Reminder lock columns: MISSING';
    RAISE NOTICE '  - processing_started_at: %', has_processing_started_at;
    RAISE NOTICE '  - processing_lock_id: %', has_processing_lock_id;
    RAISE NOTICE '  - processing_attempts: %', has_processing_attempts;
  END IF;
END $$;

-- 3. Verify RPC functions exist
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'acquire_reminder_locks',
      'cleanup_stale_reminder_locks',
      'detect_cramming',
      'calculate_next_srs_interval',
      'schedule_reminder_in_user_timezone'
    );
  
  IF func_count = 5 THEN
    RAISE NOTICE '✅ RPC Functions: ALL PRESENT (%)', func_count;
  ELSE
    RAISE WARNING '❌ RPC Functions: MISSING (expected 5, found %)', func_count;
  END IF;
END $$;

-- 4. Verify tables exist
DO $$
DECLARE
  has_job_metrics BOOLEAN;
  has_failed_reminders BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'job_metrics'
  ) INTO has_job_metrics;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'failed_reminders'
  ) INTO has_failed_reminders;
  
  IF has_job_metrics THEN
    RAISE NOTICE '✅ Table job_metrics: EXISTS';
  ELSE
    RAISE WARNING '❌ Table job_metrics: MISSING';
  END IF;
  
  IF has_failed_reminders THEN
    RAISE NOTICE '✅ Table failed_reminders: EXISTS';
  ELSE
    RAISE WARNING '❌ Table failed_reminders: MISSING';
  END IF;
END $$;

-- 5. Test calculate_next_srs_interval with validation
DO $$
DECLARE
  result RECORD;
BEGIN
  -- Test normal case
  SELECT * INTO result FROM calculate_next_srs_interval(4, 7, 2.5, 3);
  IF result.next_interval IS NOT NULL AND result.new_ease_factor IS NOT NULL THEN
    RAISE NOTICE '✅ calculate_next_srs_interval: FUNCTIONAL (normal case)';
  ELSE
    RAISE WARNING '❌ calculate_next_srs_interval: FAILED (normal case)';
  END IF;
  
  -- Test validation (should fail or clamp)
  BEGIN
    SELECT * INTO result FROM calculate_next_srs_interval(6, 7, 2.5, 3); -- Invalid quality rating
    RAISE WARNING '❌ calculate_next_srs_interval: VALIDATION NOT WORKING (should reject quality=6)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ calculate_next_srs_interval: VALIDATION WORKING (rejected invalid input)';
  END;
END $$;

-- 6. Summary report
SELECT 
  '=== VERIFICATION SUMMARY ===' as report
UNION ALL
SELECT 'Run the above DO blocks to see detailed verification results'
UNION ALL
SELECT 'Expected: All ✅ checks should pass'
UNION ALL
SELECT 'If any ❌ appear, check migration logs for errors';

