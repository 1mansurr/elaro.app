# Run Verification Queries

## Quick Verification (Recommended)

1. **Open Supabase Dashboard** → Your Project
2. **Go to SQL Editor**
3. **Copy and paste** the contents of `QUICK_VERIFICATION.sql`
4. **Click Run**
5. **Check results** - All should show ✅ PASS

## Detailed Verification

For a comprehensive check with detailed output:

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy and paste** the contents of `VERIFICATION_REPORT.sql`
3. **Click Run**
4. **Review each section** - Should all pass

## Expected Results

### Quick Verification Should Show:

```
Cron Jobs            → ✅ PASS (2 / 2)
Active Cron Jobs     → ✅ PASS (2 / 2)
New Tables          → ✅ PASS (2 / 2)
New Functions       → ✅ PASS (3 / 3)
Lock Columns        → ✅ PASS (3 / 3)
Algorithm Function  → ✅ PASS (1 / 1)
```

### Detailed Report Should Show:

- ✅ 2 active cron jobs
- ✅ 2 new tables (job_metrics, failed_reminders)
- ✅ 4+ new functions
- ✅ 3 lock columns
- ✅ Algorithm function working
- ✅ No active locks (unless job is running)
- ⚠️ Job metrics may be empty initially (wait 5-10 minutes)

## What to Check After 5-10 Minutes

Run this query to see if jobs are executing:

```sql
SELECT
  job_name,
  run_at,
  status,
  reminders_found,
  reminders_processed,
  notifications_sent
FROM job_metrics
ORDER BY run_at DESC
LIMIT 5;
```

You should see entries appearing every 5 minutes.
