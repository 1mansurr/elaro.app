-- Schedule the 'process-due-reminders' function to run every minute.
SELECT cron.schedule(
  'process-due-reminders-job',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
      url:='https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/process-due-reminders'
      -- No headers needed as it's a public cron job (idempotent)
   )
  $$
);
