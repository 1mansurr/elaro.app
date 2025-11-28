-- ============================================================================
-- RLS POLICIES VERIFICATION
-- ============================================================================
-- Run this to verify Row Level Security is enabled on critical tables
-- ============================================================================

SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN ('users', 'courses', 'assignments', 'reminders', 'lectures', 'study_sessions')
ORDER BY tablename;

