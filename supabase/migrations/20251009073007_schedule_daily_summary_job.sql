-- FILE: supabase/migrations/20251009073007_schedule_daily_summary_job.sql
-- ACTION: Create this new migration file to schedule the cron job.

-- This schedules the job to run at the beginning of every hour, every day.
-- The format is: (minute, hour, day of month, month, day of week, command)
-- '0 * * * *' means "at minute 0 of every hour of every day".
SELECT cron.schedule(
    'send-daily-summary-notifications',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url:='https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/send-daily-summary-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3lvdWNjaGJqaXlkZG56bndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MTg4NDEsImV4cCI6MjA2NTI5NDg0MX0.yR0foTKZM4sz4XZzG0geRm7MA_GqxFrz9W7G-Nu0-PY"}'
     )
    $$
);
