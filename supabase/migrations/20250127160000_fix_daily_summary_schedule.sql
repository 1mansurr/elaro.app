-- Fix the daily summary cron job schedule to run once per day instead of every hour
-- This migration unschedules the old hourly job and reschedules it to run daily at 8:00 AM UTC

-- Step 1: Unschedule the old, inefficiently scheduled job.
-- We use a SELECT statement to avoid errors if the job doesn't exist.
SELECT cron.unschedule('send-daily-summary-notifications');

-- Step 2: Schedule the job again with the correct "once a day" pattern.
-- This schedule will run at 8:00 AM UTC every day.
SELECT cron.schedule(
  'send-daily-summary-notifications',
  '0 8 * * *',
  $$
  SELECT net.http_post(
      url:='https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/send-daily-summary-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3lvdWNjaGJqaXlkZG56bndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MTg4NDEsImV4cCI6MjA2NTI5NDg0MX0.yR0foTKZM4sz4XZzG0geRm7MA_GqxFrz9W7G-Nu0-PY"}'
   )
  $$
);
