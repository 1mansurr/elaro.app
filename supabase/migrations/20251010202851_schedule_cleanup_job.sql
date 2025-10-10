-- This migration schedules the cleanup job to run once per day.
-- We need to set the cron_secret in the Supabase dashboard secrets.
SELECT cron.schedule(
  'daily-reminder-cleanup',
  '0 3 * * *', -- Runs every day at 3:00 AM UTC
  $$
  SELECT net.http_post(
      url:='https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/cleanup-old-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || secrets.get('CRON_SECRET') || '"}'
   )
  $$
);
