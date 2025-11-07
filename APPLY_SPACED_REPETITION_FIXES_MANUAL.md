# Manual Application of SRS Fixes

Since there are migration conflicts, here's how to apply the SRS fixes manually:

## Option 1: Apply via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file `combined_srs_fixes.sql` (or copy from below)
3. Run the entire SQL script
4. Verify with queries below

## Option 2: Apply Individual Migrations

Run each migration file in order via Supabase Dashboard → SQL Editor:

1. `supabase/migrations/20251103000001_schedule_process_due_reminders.sql`
2. `supabase/migrations/20251103000002_add_reminder_processing_lock.sql`
3. `supabase/migrations/20251103000003_validate_srs_parameters.sql`
4. `supabase/migrations/20251103000004_add_cramming_detection.sql`
5. `supabase/migrations/20251103000005_fix_dst_handling.sql`
6. `supabase/migrations/20251103000006_create_job_metrics_and_dead_letter.sql`

## Quick Verification

After applying, run these queries:

```sql
-- 1. Check cron jobs (should see 2 active jobs)
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN ('process-due-reminders', 'cleanup-stale-reminder-locks');

-- 2. Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('job_metrics', 'failed_reminders');

-- 3. Check functions exist
SELECT proname
FROM pg_proc
WHERE proname IN ('acquire_reminder_locks', 'detect_cramming', 'cleanup_stale_reminder_locks');

-- 4. Check lock columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'reminders'
  AND column_name IN ('processing_started_at', 'processing_lock_id', 'processing_attempts');
```

## Files Ready

- ✅ `combined_srs_fixes.sql` - All 6 migrations in one file
- ✅ Individual migration files in `supabase/migrations/20251103*.sql`
