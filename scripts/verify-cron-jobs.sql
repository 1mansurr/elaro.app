-- ============================================================================
-- CRON JOBS VERIFICATION
-- ============================================================================
-- Run this to verify scheduled cron jobs are active
-- ============================================================================

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE WHEN active = true THEN '✅ ACTIVE' ELSE '❌ INACTIVE' END as status
FROM cron.job
ORDER BY jobname;

