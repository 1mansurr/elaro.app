-- Setup cron job to cleanup expired idempotency keys
-- Runs every hour to keep the table clean

SELECT cron.schedule(
  'cleanup-expired-idempotency-keys',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/cleanup-idempotency-keys',
      headers:=jsonb_build_object('Content-Type','application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'))
    ) as request_id;
  $$
);

