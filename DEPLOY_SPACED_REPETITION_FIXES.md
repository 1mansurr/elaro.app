# Deployment Guide: SRS/Reminder/Scheduling Fixes

## 📋 Pre-Deployment Checklist

Before applying migrations, verify:

- [ ] You have database backup (recommended)
- [ ] You're connected to the correct Supabase project
- [ ] You have appropriate permissions
- [ ] No reminder processing is currently running (to avoid conflicts)

## 🚀 Step 1: Review Migrations

The following migrations will be applied:

1. **20251103000001_schedule_process_due_reminders.sql**
   - Schedules reminder processing job to run every 5 minutes

2. **20251103000002_add_reminder_processing_lock.sql**
   - Adds processing lock columns to reminders table
   - Creates atomic locking functions
   - Schedules stale lock cleanup

3. **20251103000003_validate_srs_parameters.sql**
   - Adds parameter validation to SM-2 algorithm

4. **20251103000004_add_cramming_detection.sql**
   - Adds function to detect cramming behavior

5. **20251103000005_fix_dst_handling.sql**
   - Fixes DST handling in timezone conversions

6. **20251103000006_create_job_metrics_and_dead_letter.sql**
   - Creates job metrics table
   - Creates failed reminders (dead-letter queue) table

## 📥 Step 2: Apply Migrations

### Option A: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project directory
cd /Users/new/Desktop/Biz/ELARO/ELARO-app

# Link to your Supabase project (if not already linked)
# supabase link --project-ref your-project-ref

# Push migrations to remote database
supabase db push
```

### Option B: Manual Application via Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy and run each migration file in order:
   - `20251103000001_schedule_process_due_reminders.sql`
   - `20251103000002_add_reminder_processing_lock.sql`
   - `20251103000003_validate_srs_parameters.sql`
   - `20251103000004_add_cramming_detection.sql`
   - `20251103000005_fix_dst_handling.sql`
   - `20251103000006_create_job_metrics_and_dead_letter.sql`

## ✅ Step 3: Verify Deployment

Run the verification script in Supabase SQL Editor:

```bash
# Or run this SQL in Supabase Dashboard → SQL Editor
cat supabase/migrations/verify_srs_fixes.sql
```

Or use these individual verification queries:

### Verify Cron Jobs

```sql
-- Check if cron jobs are scheduled
SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname IN ('process-due-reminders', 'cleanup-stale-reminder-locks');
```

**Expected Result**: Should show 2 rows with `active = true`

### Verify Table Changes

```sql
-- Check if lock columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'reminders'
  AND column_name IN ('processing_started_at', 'processing_lock_id', 'processing_attempts');
```

**Expected Result**: Should show 3 rows

### Verify Functions

```sql
-- Check if RPC functions exist
SELECT proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'acquire_reminder_locks',
    'cleanup_stale_reminder_locks',
    'detect_cramming',
    'schedule_reminder_in_user_timezone'
  )
ORDER BY proname;
```

**Expected Result**: Should show 4 rows

### Verify New Tables

```sql
-- Check if new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('job_metrics', 'failed_reminders')
ORDER BY table_name;
```

**Expected Result**: Should show 2 rows

## 🔍 Step 4: Monitor Job Execution

### Check Job Metrics

```sql
-- View recent job executions
SELECT
  job_name,
  run_at,
  status,
  reminders_found,
  reminders_processed,
  notifications_sent,
  notifications_failed,
  execution_time_ms
FROM job_metrics
ORDER BY run_at DESC
LIMIT 10;
```

### Check Failed Reminders

```sql
-- View unresolved failed reminders
SELECT
  id,
  reminder_id,
  error_message,
  retry_count,
  next_retry_at,
  created_at
FROM failed_reminders
WHERE resolved = false
ORDER BY created_at DESC
LIMIT 20;
```

### Check Lock Status

```sql
-- Check for any currently locked reminders
SELECT
  id,
  reminder_time,
  processing_started_at,
  processing_lock_id,
  processing_attempts,
  NOW() - processing_started_at as lock_duration
FROM reminders
WHERE processing_started_at IS NOT NULL
  AND completed = false
ORDER BY processing_started_at;
```

## 🧪 Step 5: Test Reminder Processing

### Manual Test (Optional)

```sql
-- Create a test reminder that's due immediately
INSERT INTO reminders (
  user_id,
  session_id,
  reminder_time,
  reminder_type,
  title,
  body,
  completed
)
SELECT
  id,
  (SELECT id FROM study_sessions WHERE user_id = users.id LIMIT 1),
  NOW() - INTERVAL '1 minute',
  'spaced_repetition',
  'Test Reminder',
  'This is a test reminder',
  false
FROM users
LIMIT 1;

-- Wait 5 minutes, then check if it was processed
SELECT
  id,
  reminder_time,
  completed,
  processed_at,
  sent_at
FROM reminders
WHERE reminder_type = 'spaced_repetition'
  AND title = 'Test Reminder'
ORDER BY created_at DESC
LIMIT 1;
```

## 🚨 Troubleshooting

### Cron Job Not Running

If cron jobs aren't scheduled:

```sql
-- Check pg_cron extension
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If missing, enable it:
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
```

### Migration Errors

If you encounter errors:

1. Check the error message carefully
2. Some migrations are idempotent (can be run multiple times)
3. If a migration fails partway, check what was created and manually fix

### Reminders Not Processing

1. Check cron job is active:

   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-due-reminders';
   ```

2. Check for processing errors in job_metrics:

   ```sql
   SELECT * FROM job_metrics
   WHERE status = 'failure'
   ORDER BY run_at DESC LIMIT 5;
   ```

3. Check Edge Function logs in Supabase Dashboard → Edge Functions → process-due-reminders → Logs

## 📊 Post-Deployment Monitoring

Monitor these metrics for the first 24-48 hours:

1. **Job Success Rate**: Should be >95%

   ```sql
   SELECT
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM job_metrics
   WHERE run_at > NOW() - INTERVAL '24 hours'
   GROUP BY status;
   ```

2. **Processing Time**: Should be <5 seconds for normal loads

   ```sql
   SELECT
     AVG(execution_time_ms) as avg_ms,
     MAX(execution_time_ms) as max_ms,
     PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_ms
   FROM job_metrics
   WHERE run_at > NOW() - INTERVAL '24 hours';
   ```

3. **Failed Reminders**: Should be minimal
   ```sql
   SELECT COUNT(*) as failed_count
   FROM failed_reminders
   WHERE resolved = false;
   ```

## ✅ Success Criteria

Deployment is successful if:

- ✅ All 6 migrations apply without errors
- ✅ Both cron jobs are scheduled and active
- ✅ Job metrics table is populated after first run
- ✅ Reminders are being processed automatically
- ✅ No duplicate notifications are sent
- ✅ Failed reminders are logged to dead-letter queue

## 📝 Rollback Plan

If you need to rollback:

1. **Disable cron jobs**:

   ```sql
   UPDATE cron.job SET active = false
   WHERE jobname IN ('process-due-reminders', 'cleanup-stale-reminder-locks');
   ```

2. **Remove cron jobs** (if needed):

   ```sql
   SELECT cron.unschedule('process-due-reminders');
   SELECT cron.unschedule('cleanup-stale-reminder-locks');
   ```

3. **Column removal** (only if necessary):
   ```sql
   ALTER TABLE reminders
   DROP COLUMN IF EXISTS processing_started_at,
   DROP COLUMN IF EXISTS processing_lock_id,
   DROP COLUMN IF EXISTS processing_attempts;
   ```

Note: Function and table rollbacks can be done by dropping them, but data in job_metrics and failed_reminders will be lost.
