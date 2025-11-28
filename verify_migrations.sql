-- ============================================================================
-- VERIFICATION SCRIPT: Database Migrations
-- ============================================================================
-- Run this after applying apply_audit_migrations_complete.sql
-- This verifies that all tables, functions, and RLS policies were created
--
-- Date: 2025-01-31
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify Tables Exist
-- ============================================================================

SELECT 
  'Tables' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) = 7 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 7 tables'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'storage_quota_usage',
  'storage_quota_alerts',
  'edge_function_invocations',
  'edge_function_alerts',
  'cache_metrics',
  'cache_alerts',
  'policy_accessibility_checks'
);

-- List all tables
SELECT 
  'Table: ' || table_name as item_name,
  CASE 
    WHEN table_name IN (
      'storage_quota_usage',
      'storage_quota_alerts',
      'edge_function_invocations',
      'edge_function_alerts',
      'cache_metrics',
      'cache_alerts',
      'policy_accessibility_checks'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'storage_quota_usage',
  'storage_quota_alerts',
  'edge_function_invocations',
  'edge_function_alerts',
  'cache_metrics',
  'cache_alerts',
  'policy_accessibility_checks'
)
ORDER BY table_name;

-- ============================================================================
-- STEP 2: Verify Functions Exist
-- ============================================================================

SELECT 
  'Functions' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) = 8 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 8 functions'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'track_storage_quota',
  'get_storage_quota_status',
  'get_database_size',
  'record_function_invocation',
  'check_high_frequency_functions',
  'check_high_error_rate_functions',
  'record_cache_metrics',
  'create_cache_alert'
);

-- List all functions
SELECT 
  'Function: ' || routine_name as item_name,
  CASE 
    WHEN routine_name IN (
      'track_storage_quota',
      'get_storage_quota_status',
      'get_database_size',
      'record_function_invocation',
      'check_high_frequency_functions',
      'check_high_error_rate_functions',
      'record_cache_metrics',
      'create_cache_alert'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'track_storage_quota',
  'get_storage_quota_status',
  'get_database_size',
  'record_function_invocation',
  'check_high_frequency_functions',
  'check_high_error_rate_functions',
  'record_cache_metrics',
  'create_cache_alert'
)
ORDER BY routine_name;

-- ============================================================================
-- STEP 3: Verify RLS Policies
-- ============================================================================

SELECT 
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count,
  CASE 
    WHEN rowsecurity = true AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) > 0 THEN '✅ PASS'
    WHEN rowsecurity = false THEN '❌ FAIL - RLS not enabled'
    ELSE '❌ FAIL - No policies found'
  END as status
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN (
  'storage_quota_usage',
  'storage_quota_alerts',
  'edge_function_invocations',
  'edge_function_alerts',
  'cache_metrics',
  'cache_alerts'
)
ORDER BY tablename;

-- ============================================================================
-- STEP 4: Verify Cron Jobs (if scheduling migration was applied)
-- ============================================================================

SELECT 
  'Cron Jobs' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS'
    WHEN COUNT(*) = 0 THEN '⚠️ NOT SCHEDULED - Run schedule_monitoring_functions.sql'
    ELSE '⚠️ PARTIAL - Expected 3 jobs'
  END as status
FROM cron.job
WHERE jobname IN (
  'check-policy-accessibility-daily',
  'monitor-storage-daily',
  'monitor-edge-functions-daily'
);

-- List all monitoring cron jobs
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN active = true THEN '✅ ACTIVE'
    ELSE '❌ INACTIVE'
  END as status
FROM cron.job
WHERE jobname IN (
  'check-policy-accessibility-daily',
  'monitor-storage-daily',
  'monitor-edge-functions-daily'
)
ORDER BY jobname;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  '=== VERIFICATION SUMMARY ===' as summary,
  NULL as value
UNION ALL
SELECT 
  'Tables Created',
  COUNT(*)::TEXT
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'storage_quota_usage',
  'storage_quota_alerts',
  'edge_function_invocations',
  'edge_function_alerts',
  'cache_metrics',
  'cache_alerts',
  'policy_accessibility_checks'
)
UNION ALL
SELECT 
  'Functions Created',
  COUNT(*)::TEXT
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'track_storage_quota',
  'get_storage_quota_status',
  'get_database_size',
  'record_function_invocation',
  'check_high_frequency_functions',
  'check_high_error_rate_functions',
  'record_cache_metrics',
  'create_cache_alert'
)
UNION ALL
SELECT 
  'Cron Jobs Scheduled',
  COUNT(*)::TEXT
FROM cron.job
WHERE jobname IN (
  'check-policy-accessibility-daily',
  'monitor-storage-daily',
  'monitor-edge-functions-daily'
);






