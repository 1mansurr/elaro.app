-- Comprehensive Notification Analytics and Delivery Tracking
-- Enables tracking of notification delivery, engagement, and effectiveness

-- 1. Create notification deliveries table for tracking (or add missing columns if table exists)
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  expo_receipt_id TEXT,
  expo_ticket_id TEXT,
  expo_status TEXT, -- 'ok', 'error', 'pending'
  error_message TEXT,
  device_token TEXT,
  deep_link_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists from earlier migration
DO $$
BEGIN
  -- Add columns that might be missing from earlier migration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'opened_at') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN opened_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'clicked_at') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN clicked_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'dismissed_at') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN dismissed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'expo_receipt_id') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN expo_receipt_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'expo_ticket_id') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN expo_ticket_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'expo_status') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN expo_status TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'device_token') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN device_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'deep_link_url') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN deep_link_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'metadata') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN metadata JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'title') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'body') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN body TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_deliveries' AND column_name = 'sent_at') THEN
    ALTER TABLE public.notification_deliveries ADD COLUMN sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user ON public.notification_deliveries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_opened ON public.notification_deliveries(opened_at) WHERE opened_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_type ON public.notification_deliveries(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_receipt ON public.notification_deliveries(expo_receipt_id) WHERE expo_receipt_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE public.notification_deliveries IS 'Tracks all push notification deliveries and engagement metrics';
COMMENT ON COLUMN public.notification_deliveries.expo_receipt_id IS 'Expo receipt ID for delivery confirmation';
COMMENT ON COLUMN public.notification_deliveries.expo_status IS 'Delivery status from Expo: ok, error, or pending';

-- 2. Create notification queue table for batching and retry (or add missing columns if table exists)
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=highest, 10=lowest
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists from earlier migration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_queue' AND column_name = 'notification_type') THEN
    ALTER TABLE public.notification_queue ADD COLUMN notification_type TEXT DEFAULT 'general';
  END IF;
  -- Handle priority: existing table has TEXT, new one has INTEGER
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_queue' AND column_name = 'priority' AND data_type = 'text') THEN
    -- Convert TEXT priority to INTEGER (map 'urgent'=1, 'high'=3, 'normal'=5, 'low'=7)
    ALTER TABLE public.notification_queue ADD COLUMN priority_int INTEGER;
    UPDATE public.notification_queue SET priority_int = CASE 
      WHEN priority = 'urgent' THEN 1
      WHEN priority = 'high' THEN 3
      WHEN priority = 'normal' THEN 5
      WHEN priority = 'low' THEN 7
      ELSE 5
    END;
    ALTER TABLE public.notification_queue DROP COLUMN priority;
    ALTER TABLE public.notification_queue RENAME COLUMN priority_int TO priority;
    ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_priority_check CHECK (priority BETWEEN 1 AND 10);
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_queue' AND column_name = 'priority') THEN
    ALTER TABLE public.notification_queue ADD COLUMN priority INTEGER DEFAULT 5;
    ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_priority_check CHECK (priority BETWEEN 1 AND 10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_queue' AND column_name = 'next_retry_at') THEN
    ALTER TABLE public.notification_queue ADD COLUMN next_retry_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_queue' AND column_name = 'last_error') THEN
    ALTER TABLE public.notification_queue ADD COLUMN last_error TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_queue' AND column_name = 'updated_at') THEN
    ALTER TABLE public.notification_queue ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_processing ON public.notification_queue(status, scheduled_for, priority) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_retry ON public.notification_queue(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON public.notification_queue(user_id, created_at DESC);

COMMENT ON TABLE public.notification_queue IS 'Queue for batching, scheduling, and retrying notifications';
COMMENT ON COLUMN public.notification_queue.priority IS 'Priority level: 1=highest (urgent), 10=lowest. Used for ordering when processing queue.';

-- 3. Enable RLS
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notification deliveries"
  ON public.notification_deliveries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notification queue"
  ON public.notification_queue
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deliveries"
  ON public.notification_deliveries
  FOR SELECT
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- 4. Function to get notification engagement metrics
CREATE OR REPLACE FUNCTION public.get_notification_engagement(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  notification_type TEXT,
  total_sent BIGINT,
  total_delivered BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  delivery_rate DECIMAL,
  open_rate DECIMAL,
  click_rate DECIMAL,
  best_hour INTEGER,
  best_day_of_week INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nd.notification_type,
    COUNT(*) as total_sent,
    COUNT(nd.delivered_at) as total_delivered,
    COUNT(nd.opened_at) as total_opened,
    COUNT(nd.clicked_at) as total_clicked,
    ROUND(COUNT(nd.delivered_at)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) as delivery_rate,
    ROUND(COUNT(nd.opened_at)::DECIMAL / NULLIF(COUNT(nd.delivered_at), 0) * 100, 2) as open_rate,
    ROUND(COUNT(nd.clicked_at)::DECIMAL / NULLIF(COUNT(nd.opened_at), 0) * 100, 2) as click_rate,
    MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM nd.sent_at)::INTEGER) as best_hour,
    MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM nd.sent_at)::INTEGER) as best_day_of_week
  FROM public.notification_deliveries nd
  WHERE (p_user_id IS NULL OR nd.user_id = p_user_id)
    AND nd.user_id = COALESCE(p_user_id, auth.uid())
  GROUP BY nd.notification_type;
END;
$$;

COMMENT ON FUNCTION public.get_notification_engagement IS 'Returns engagement metrics for notifications with delivery and open rates';

-- 5. Function to process notification queue
CREATE OR REPLACE FUNCTION public.get_pending_notifications(p_limit INTEGER DEFAULT 100)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  notification_type TEXT,
  title TEXT,
  body TEXT,
  data JSONB,
  priority INTEGER
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
    priority
  FROM public.notification_queue
  WHERE status = 'pending'
    AND scheduled_for <= NOW()
  ORDER BY priority ASC, scheduled_for ASC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_pending_notifications IS 'Gets pending notifications from queue, ordered by priority and schedule time';

-- 6. Function to batch notifications by user
CREATE OR REPLACE FUNCTION public.get_batchable_notifications(p_time_window_minutes INTEGER DEFAULT 15)
RETURNS TABLE(
  user_id UUID,
  notifications JSONB,
  notification_count BIGINT
)
LANGUAGE sql
AS $$
  SELECT 
    nq.user_id,
    jsonb_agg(
      jsonb_build_object(
        'id', nq.id,
        'type', nq.notification_type,
        'title', nq.title,
        'body', nq.body,
        'data', nq.data
      )
    ) as notifications,
    COUNT(*) as notification_count
  FROM public.notification_queue nq
  WHERE nq.status = 'pending'
    AND nq.scheduled_for <= NOW()
    AND nq.scheduled_for >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
  GROUP BY nq.user_id
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC;
$$;

COMMENT ON FUNCTION public.get_batchable_notifications IS 'Finds users with multiple pending notifications for batching';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Notification analytics and queue system added successfully';
END $$;

