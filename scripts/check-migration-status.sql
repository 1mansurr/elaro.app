-- Migration Status Check Script
-- Run this in Supabase SQL Editor to check which migrations need to be applied

-- Check 1: Security migration (20251101000000)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'check_and_send_reminders' 
      AND prosrc LIKE '%deprecated%'
    ) THEN '✅ Applied'
    ELSE '❌ Missing'
  END as security_migration_status;

-- Check 2: Performance indexes (20251022000018)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') 
         AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assignments_course_id')
    THEN '✅ Applied'
    ELSE '❌ Missing'
  END as performance_migration_status;

-- Check 3: Migration history table (20251022000014)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_history')
    THEN '✅ Applied'
    ELSE '❌ Missing'
  END as migration_history_status;

-- Check 4: Maintenance tables (20251022000020)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_tasks')
    THEN '✅ Applied'
    ELSE '❌ Missing'
  END as maintenance_migration_status;

-- Check 5: Monitoring tables (20251022000021)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'health_metrics')
    THEN '✅ Applied'
    ELSE '❌ Missing'
  END as monitoring_migration_status;

-- Check 6: Trial tracking columns (20251027000000)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'trial_start_date'
    )
    THEN '✅ Applied'
    ELSE '❌ Missing'
  END as trial_tracking_status;

-- Check 7: User events table (20251022000017)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_events')
    THEN '✅ Table exists - migration may apply'
    ELSE '⚠️ Table missing - migration may skip'
  END as user_events_status;

-- Check 8: Cron jobs
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM cron.job 
      WHERE jobname LIKE '%cleanup%deleted%'
    )
    THEN '✅ Scheduled'
    ELSE '❌ Not scheduled'
  END as cleanup_cron_status;

