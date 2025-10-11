-- SECURITY FIX: Replace hardcoded secrets in cron job schedules
-- This migration removes hardcoded Supabase URLs and JWT tokens from cron jobs
-- and replaces them with secure methods using Supabase Vault secrets management.
--
-- Prerequisites:
-- 1. Set 'CRON_SECRET' in Supabase Dashboard -> Project Settings -> Vault
-- 2. Set 'SUPABASE_ANON_KEY' in Supabase Dashboard -> Project Settings -> Vault
-- 3. Set 'SUPABASE_URL' in Supabase Dashboard -> Project Settings -> Vault

-- Step 1: Unschedule all existing cron jobs to ensure clean slate
SELECT cron.unschedule('process-due-reminders-job');
SELECT cron.unschedule('send-daily-summary-notifications');
SELECT cron.unschedule('send-evening-capture-notifications');
SELECT cron.unschedule('daily-reminder-cleanup');
SELECT cron.unschedule('cleanup-old-reminders');

-- Step 2: Reschedule 'process-due-reminders' job securely
-- This job runs every minute and is idempotent (no auth needed)
SELECT cron.schedule(
  'process-due-reminders-job',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
      url:=secrets.get('SUPABASE_URL') || '/functions/v1/process-due-reminders'
    )
  $$
);

-- Step 3: Reschedule 'send-daily-summary-notifications' job securely
-- This job runs once a day at 8:00 AM UTC
SELECT cron.schedule(
  'send-daily-summary-notifications',
  '0 8 * * *', -- Daily at 8:00 AM UTC
  $$
  SELECT net.http_post(
      url:=secrets.get('SUPABASE_URL') || '/functions/v1/send-daily-summary-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || secrets.get('SUPABASE_ANON_KEY') || '"}'
    )
  $$
);

-- Step 4: Reschedule 'send-evening-capture-notifications' job securely
-- This job runs every 30 minutes
SELECT cron.schedule(
  'send-evening-capture-notifications',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT net.http_post(
      url:=secrets.get('SUPABASE_URL') || '/functions/v1/send-evening-capture-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || secrets.get('SUPABASE_ANON_KEY') || '"}'
    )
  $$
);

-- Step 5: Reschedule 'cleanup-old-reminders' job securely
-- This job runs daily at 3:00 AM UTC and requires authentication
SELECT cron.schedule(
  'cleanup-old-reminders',
  '0 3 * * *', -- Daily at 3:00 AM UTC
  $$
  SELECT net.http_post(
      url:=secrets.get('SUPABASE_URL') || '/functions/v1/cleanup-old-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || secrets.get('CRON_SECRET') || '"}'
    )
  $$
);

-- Add comment to document the security improvement
COMMENT ON TABLE cron.job IS 'All cron jobs updated to use Supabase Vault secrets management. No hardcoded URLs or tokens in version control.';
