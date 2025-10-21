-- Schedule the cleanup-rate-limits function to run every 5 minutes
-- This will clean up old rate limit records to prevent database bloat

-- Note: Replace 'your-project' with your actual Supabase project reference
-- You may need to adjust the URL based on your project's region

SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/cleanup-rate-limits',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    ) AS request_id;
  $$
);

-- Alternative: If you prefer to use pg_cron directly without net extension
-- You can create a stored procedure that calls the cleanup function

-- Create a stored procedure for cleanup
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits_proc()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete rate limit records older than 5 minutes
  DELETE FROM public.rate_limits
  WHERE created_at < NOW() - INTERVAL '5 minutes';
  
  RAISE NOTICE 'Cleaned up old rate limit records';
END;
$$;

-- Schedule the stored procedure instead
-- SELECT cron.schedule(
--   'cleanup-rate-limits-proc',
--   '*/5 * * * *',
--   $$SELECT public.cleanup_rate_limits_proc();$$
-- );

-- Add comment
COMMENT ON FUNCTION public.cleanup_rate_limits_proc() IS 'Cleans up old rate limit records older than 5 minutes';

