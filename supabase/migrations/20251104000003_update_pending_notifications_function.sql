-- Update get_pending_notifications to include deduplication_key
-- This allows the queue processor to check for duplicates

CREATE OR REPLACE FUNCTION public.get_pending_notifications(p_limit INTEGER DEFAULT 100)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  notification_type TEXT,
  title TEXT,
  body TEXT,
  data JSONB,
  priority INTEGER,
  scheduled_for TIMESTAMPTZ,
  deduplication_key TEXT
)
LANGUAGE sql
AS $$
  SELECT 
    id,
    user_id,
    notification_type,
    title,
    body,
    data,
    priority,
    scheduled_for,
    deduplication_key
  FROM public.notification_queue
  WHERE status = 'pending'
    AND scheduled_for <= NOW()
  ORDER BY priority ASC, scheduled_for ASC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_pending_notifications IS 'Gets pending notifications from queue with deduplication_key, ordered by priority and schedule time';

