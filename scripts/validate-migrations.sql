-- Validation Queries for Phase 3 Migrations
-- Run these in Supabase SQL Editor after applying migrations
-- NOTE: This file uses PostgreSQL syntax (Supabase uses PostgreSQL)
-- The MSSQL linter errors are false positives - this is correct PostgreSQL syntax

-- ============================================================================
-- VALIDATE API QUOTA MONITORING TABLES
-- ============================================================================

-- Check if api_quota_usage table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'api_quota_usage'
    ) 
    THEN '✅ api_quota_usage table exists'
    ELSE '❌ api_quota_usage table missing'
  END as quota_table_status;

-- Check if quota_alerts table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'quota_alerts'
    ) 
    THEN '✅ quota_alerts table exists'
    ELSE '❌ quota_alerts table missing'
  END as alerts_table_status;

-- Check if notification_queue table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'notification_queue'
    ) 
    THEN '✅ notification_queue table exists'
    ELSE '❌ notification_queue table missing'
  END as queue_table_status;

-- ============================================================================
-- VALIDATE COST TRACKING TABLES
-- ============================================================================

-- Check if api_cost_tracking table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'api_cost_tracking'
    ) 
    THEN '✅ api_cost_tracking table exists'
    ELSE '❌ api_cost_tracking table missing'
  END as cost_table_status;

-- Check if budget_configs table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'budget_configs'
    ) 
    THEN '✅ budget_configs table exists'
    ELSE '❌ budget_configs table missing'
  END as budget_configs_status;

-- Check if budget_alerts table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'budget_alerts'
    ) 
    THEN '✅ budget_alerts table exists'
    ELSE '❌ budget_alerts table missing'
  END as budget_alerts_status;

-- ============================================================================
-- VALIDATE FUNCTIONS
-- ============================================================================

-- Check if quota functions exist
SELECT 
  proname as function_name,
  CASE 
    WHEN proname IN ('track_quota_usage', 'get_quota_status') 
    THEN '✅'
    ELSE '⚠️'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN ('track_quota_usage', 'get_quota_status')
ORDER BY proname;

-- Check if cost tracking functions exist
SELECT 
  proname as function_name,
  CASE 
    WHEN proname IN ('record_api_cost', 'get_current_month_spend', 'check_budget_alerts') 
    THEN '✅'
    ELSE '⚠️'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN ('record_api_cost', 'get_current_month_spend', 'check_budget_alerts')
ORDER BY proname;

-- ============================================================================
-- VALIDATE INDEXES
-- ============================================================================

-- Check quota monitoring indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('api_quota_usage', 'quota_alerts', 'notification_queue', 'api_cost_tracking', 'budget_configs', 'budget_alerts')
ORDER BY tablename, indexname;

-- ============================================================================
-- VALIDATE INITIAL DATA
-- ============================================================================

-- Check if budget configs were initialized
-- NOTE: MSSQL linter may flag 'enabled' in CASE, but in PostgreSQL boolean columns work correctly
SELECT 
  service_name,
  monthly_budget_usd,
  alert_threshold_70,
  alert_threshold_90,
  enabled,
  CASE WHEN enabled = true THEN '✅ Active' ELSE '⚠️ Disabled' END as status
FROM budget_configs
ORDER BY service_name;

-- ============================================================================
-- TEST QUOTA TRACKING
-- ============================================================================

-- Test track_quota_usage function
-- NOTE: PostgreSQL casting syntax (::) is correct for Supabase
-- Using CAST() for better cross-dialect compatibility while maintaining PostgreSQL correctness
SELECT 
  track_quota_usage(
    CAST('expo_push' AS text),
    CAST('daily' AS text),
    CAST(1 AS integer),
    CAST(10000 AS integer)
  ) as quota_result;

-- Test get_quota_status function
SELECT * FROM get_quota_status('expo_push', 'daily');

-- ============================================================================
-- TEST COST TRACKING
-- ============================================================================

-- Test record_api_cost function
-- NOTE: ::text, ::numeric, ::integer are PostgreSQL casting syntax (correct for Supabase)
-- MSSQL linter errors are false positives
SELECT 
  record_api_cost(
    CAST('expo_push' AS text),
    CAST(0.01 AS numeric),
    CAST('api_call' AS text),
    CAST(1 AS integer),
    CURRENT_DATE
  ) as cost_result;

-- Test get_current_month_spend function
SELECT 
  get_current_month_spend('expo_push') as current_spend;

-- ============================================================================
-- VALIDATE ROW LEVEL SECURITY
-- ============================================================================

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('api_quota_usage', 'quota_alerts', 'notification_queue', 'api_cost_tracking', 'budget_configs', 'budget_alerts')
ORDER BY tablename, policyname;

