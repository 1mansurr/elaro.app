-- Add deduplication support to notification_queue
-- Prevents duplicate notifications from being sent

-- 1. Add deduplication_key column
ALTER TABLE public.notification_queue 
ADD COLUMN IF NOT EXISTS deduplication_key TEXT;

-- 2. Add unique index on deduplication_key (NULL values are allowed for backward compatibility)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_queue_dedup_key 
ON public.notification_queue(deduplication_key) 
WHERE deduplication_key IS NOT NULL;

-- 3. Add comment
COMMENT ON COLUMN public.notification_queue.deduplication_key IS 
'Unique key for preventing duplicate notifications. Format: userId:notificationType:itemId:timeBucket';

-- 4. Add function to generate deduplication key
CREATE OR REPLACE FUNCTION public.generate_notification_dedup_key(
  p_user_id UUID,
  p_notification_type TEXT,
  p_item_id TEXT DEFAULT NULL,
  p_time_bucket_minutes INTEGER DEFAULT 1440
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  time_bucket TIMESTAMP;
  bucket_str TEXT;
BEGIN
  -- Round down to nearest time bucket (default: daily bucket)
  time_bucket := date_trunc('minute', NOW()::timestamp) - 
    (EXTRACT(minute FROM NOW())::INTEGER % p_time_bucket_minutes || ' minutes')::INTERVAL;
  
  bucket_str := to_char(time_bucket, 'YYYY-MM-DD-HH24-MI');
  
  -- Generate key: userId:type:itemId:bucket
  IF p_item_id IS NOT NULL THEN
    RETURN p_user_id::TEXT || ':' || p_notification_type || ':' || p_item_id || ':' || bucket_str;
  ELSE
    RETURN p_user_id::TEXT || ':' || p_notification_type || '::' || bucket_str;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.generate_notification_dedup_key IS 
'Generates a deduplication key for notifications. Prevents duplicate sends within the same time bucket.';

-- 5. Add function to check if notification already exists
CREATE OR REPLACE FUNCTION public.notification_exists(
  p_dedup_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM public.notification_queue 
    WHERE deduplication_key = p_dedup_key
      AND status IN ('pending', 'processing', 'sent')
  );
$$;

COMMENT ON FUNCTION public.notification_exists IS 
'Checks if a notification with the given deduplication key already exists in queue';

