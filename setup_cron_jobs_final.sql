-- Final setup for cron jobs - Manual approach
-- Since we can't access environment variables directly in cron jobs,
-- we'll use a manual approach with the actual secret values

-- STEP 1: Get your CRON_SECRET value
-- Go to Supabase Dashboard > Settings > Environment Variables
-- Copy the value of CRON_SECRET

-- STEP 2: Replace 'REPLACE_WITH_YOUR_CRON_SECRET' below with your actual CRON_SECRET value

-- 1. Auto-unsuspend expired accounts (daily at 2 AM)
SELECT cron.schedule(
  'auto-unsuspend-accounts',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/auto-unsuspend-accounts',
    headers := '{"Authorization": "Bearer REPLACE_WITH_YOUR_CRON_SECRET"}'
  );
  $$
);

-- 2. Permanently delete expired soft-deleted accounts (daily at 3 AM)
SELECT cron.schedule(
  'permanent-delete-accounts',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/permanently-delete-account',
    headers := '{"Authorization": "Bearer REPLACE_WITH_YOUR_CRON_SECRET"}'
  );
  $$
);

-- 3. Verify cron jobs are scheduled
SELECT * FROM cron.job WHERE jobname IN ('auto-unsuspend-accounts', 'permanent-delete-accounts');

-- 4. Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
