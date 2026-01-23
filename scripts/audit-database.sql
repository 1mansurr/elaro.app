-- ============================================================================
-- DATABASE AUDIT SCRIPT
-- Post-Migration Verification
-- ============================================================================
-- Run this in Supabase SQL Editor to verify database state
-- 
-- IMPORTANT: This file uses PostgreSQL syntax (Supabase uses PostgreSQL)
-- The MSSQL linter errors are FALSE POSITIVES - this is correct PostgreSQL syntax
-- 
-- This file should be configured to use PostgreSQL dialect in your IDE:
-- - VS Code/Cursor: Set SQL language to PostgreSQL in settings
-- - Or add to .vscode/settings.json: "files.associations": { "*.sql": "postgresql" }
-- ============================================================================

-- ============================================================================
-- PHASE 1: MIGRATION STATUS
-- ============================================================================

SELECT '=== MIGRATION STATUS ===' as section;

-- Check total migrations applied
SELECT 
  COUNT(*) as total_migrations,
  MAX(version) as latest_migration,
  MIN(version) as earliest_migration
FROM supabase_migrations.schema_migrations;

-- List recent migrations
-- NOTE: LIMIT is PostgreSQL syntax (MSSQL uses TOP). This is correct for Supabase.
SELECT 
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10; -- PostgreSQL LIMIT clause - cannot be changed to TOP without breaking functionality

-- ============================================================================
-- PHASE 2: CORE TABLES VERIFICATION
-- ============================================================================

-- NOTE: SELECT with string literal and alias is valid PostgreSQL syntax
-- MSSQL linter may flag this, but it's correct for PostgreSQL/Supabase
SELECT '=== CORE TABLES VERIFICATION ===' AS section;

-- Count all tables
SELECT 
  COUNT(*) as total_tables,
  CASE 
    WHEN COUNT(*) >= 20 THEN '✅ PASS'
    ELSE '⚠️ WARNING - Expected at least 20 tables'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public';

-- List all tables with column counts
SELECT 
  table_name,
  (SELECT COUNT(*) 
   FROM information_schema.columns 
   WHERE table_name = t.table_name 
   AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify critical tables exist
SELECT 
  'Critical Tables' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) = 12 THEN '✅ PASS'
    ELSE '❌ FAIL - Missing critical tables'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'users',
  'courses',
  'lectures',
  'assignments',
  'study_sessions',
  'reminders',
  'notification_preferences',
  'srs_schedules',
  'user_devices',
  'streaks',
  'admin_actions',
  'migration_history'
);

-- ============================================================================
-- PHASE 3: DATABASE FUNCTIONS VERIFICATION
-- ============================================================================

SELECT '=== DATABASE FUNCTIONS VERIFICATION ===' as section;

-- Count all functions
SELECT 
  COUNT(*) as total_functions,
  COUNT(DISTINCT routine_name) as unique_functions
FROM information_schema.routines
WHERE routine_schema = 'public';

-- Verify critical functions exist
SELECT 
  'Critical Functions' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ PASS'
    ELSE '❌ FAIL - Missing critical functions'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'handle_new_user',
  'can_create_task',
  'can_create_srs_reminders',
  'get_home_screen_data_for_user',
  'count_tasks_since'
);

-- List all functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================================
-- PHASE 4: ROW LEVEL SECURITY (RLS) VERIFICATION
-- ============================================================================

SELECT '=== RLS VERIFICATION ===' as section;

-- Check RLS status on all tables
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status,
  (SELECT COUNT(*) 
   FROM pg_policies 
   WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify critical tables have RLS enabled
SELECT 
  'Critical Tables RLS' as check_type,
  COUNT(*) as tables_with_rls,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS'
    ELSE '❌ FAIL - Some critical tables missing RLS'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true
AND tablename IN ('users', 'courses', 'assignments', 'reminders');

-- List policies on critical tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'courses', 'assignments', 'reminders')
ORDER BY tablename, policyname;

-- ============================================================================
-- PHASE 5: TRIGGERS VERIFICATION
-- ============================================================================

SELECT '=== TRIGGERS VERIFICATION ===' as section;

-- List all triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verify critical trigger exists
SELECT 
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Missing user creation trigger'
  END as status,
  COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%user%created%';

-- ============================================================================
-- PHASE 6: CRON JOBS VERIFICATION
-- ============================================================================

SELECT '=== CRON JOBS VERIFICATION ===' as section;

-- Check pg_cron extension
SELECT 
  extname,
  extversion,
  CASE 
    WHEN extname = 'pg_cron' THEN '✅ INSTALLED'
    ELSE '❌ NOT INSTALLED'
  END as status
FROM pg_extension
WHERE extname = 'pg_cron';

-- List all cron jobs
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active = true THEN '✅ ACTIVE'
    ELSE '❌ INACTIVE'
  END as status,
  command
FROM cron.job
ORDER BY jobname;

-- Verify critical cron jobs exist
SELECT 
  'Critical Cron Jobs' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '⚠️ WARNING - Some cron jobs may be missing'
  END as status
FROM cron.job
WHERE jobname IN (
  'check-policy-accessibility-daily',
  'monitor-storage-daily',
  'monitor-edge-functions-daily',
  'cleanup-deleted-items',
  'process-due-reminders'
);

-- ============================================================================
-- PHASE 7: FOREIGN KEY CONSTRAINTS
-- ============================================================================

SELECT '=== FOREIGN KEY CONSTRAINTS ===' as section;

-- List all foreign key constraints
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- PHASE 8: DATA INTEGRITY CHECKS
-- ============================================================================

SELECT '=== DATA INTEGRITY CHECKS ===' as section;

-- Check for orphaned assignments
SELECT 
  'Orphaned Assignments' as check_type,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Found orphaned records'
  END as status
FROM assignments a
LEFT JOIN courses c ON a.course_id = c.id
WHERE c.id IS NULL AND (a.deleted_at IS NULL OR a.deleted_at > NOW());

-- Check for orphaned reminders
-- Note: reminders table doesn't have deleted_at column, so we check all active reminders
SELECT 
  'Orphaned Reminders' as check_type,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Found orphaned records'
  END as status
FROM reminders r
LEFT JOIN users u ON r.user_id = u.id
WHERE u.id IS NULL;

-- Check for orphaned lectures
SELECT 
  'Orphaned Lectures' as check_type,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Found orphaned records'
  END as status
FROM lectures l
LEFT JOIN courses c ON l.course_id = c.id
WHERE c.id IS NULL AND (l.deleted_at IS NULL OR l.deleted_at > NOW());

-- ============================================================================
-- PHASE 9: DATABASE SIZE & PERFORMANCE
-- ============================================================================

SELECT '=== DATABASE SIZE & PERFORMANCE ===' as section;

-- Database size
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Top 10 largest tables
-- NOTE: Using CONCAT() instead of || for better SQL standard compatibility
-- PostgreSQL supports both, but CONCAT() is more widely recognized
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(CONCAT(schemaname, '.', tablename))) AS size,
  pg_size_pretty(pg_relation_size(CONCAT(schemaname, '.', tablename))) AS table_size,
  pg_size_pretty(pg_total_relation_size(CONCAT(schemaname, '.', tablename)) - 
                 pg_relation_size(CONCAT(schemaname, '.', tablename))) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(CONCAT(schemaname, '.', tablename)) DESC
LIMIT 10; -- PostgreSQL LIMIT clause - cannot be changed to TOP without breaking functionality

-- Index usage statistics
-- NOTE: pg_stat_user_indexes is a PostgreSQL system view (not available in MSSQL)
-- MSSQL linter errors on this query are false positives - this is correct PostgreSQL syntax
SELECT 
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS index_scans,
  CASE 
    WHEN idx_scan = 0 THEN '⚠️ UNUSED'
    ELSE '✅ USED'
  END AS usage_status
FROM pg_stat_user_indexes -- PostgreSQL system catalog view
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;

-- ============================================================================
-- PHASE 10: MONITORING TABLES VERIFICATION
-- ============================================================================

SELECT '=== MONITORING TABLES VERIFICATION ===' as section;

-- Check monitoring tables exist
SELECT 
  'Monitoring Tables' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS'
    ELSE '⚠️ WARNING - Some monitoring tables missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'storage_quota_usage',
  'edge_function_invocations',
  'cache_metrics',
  'job_metrics',
  'failed_reminders'
);

-- Check recent monitoring data
SELECT 
  'Recent Storage Monitoring' as check_type,
  COUNT(*) as record_count,
  MAX(checked_at) as latest_record
FROM storage_quota_usage;

SELECT 
  'Recent Function Monitoring' as check_type,
  COUNT(*) as record_count,
  MAX(invoked_at) as latest_record
FROM edge_function_invocations;

SELECT 
  'Recent Job Metrics' as check_type,
  COUNT(*) as record_count,
  MAX(run_at) as latest_run
FROM job_metrics;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

SELECT '=== AUDIT SUMMARY ===' as section;

-- NOTE: Using CAST() instead of :: for better SQL standard compatibility
-- PostgreSQL supports both, but CAST() is more widely recognized
SELECT 
  'Total Tables' as metric,
  CAST(COUNT(*) AS TEXT) as value
FROM information_schema.tables
WHERE table_schema = 'public'
UNION ALL
SELECT 
  'Total Functions',
  CAST(COUNT(*) AS TEXT)
FROM information_schema.routines
WHERE routine_schema = 'public'
UNION ALL
SELECT 
  'Tables with RLS',
  CAST(COUNT(*) AS TEXT)
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 
  'Total Policies',
  CAST(COUNT(*) AS TEXT)
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Active Cron Jobs',
  CAST(COUNT(*) AS TEXT)
FROM cron.job
WHERE active = true
UNION ALL
SELECT 
  'Total Migrations',
  CAST(COUNT(*) AS TEXT)
FROM supabase_migrations.schema_migrations;

