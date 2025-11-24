-- API Quota Monitoring System
-- Tracks usage and alerts when approaching service limits

-- ============================================================================
-- API QUOTA USAGE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  quota_type TEXT NOT NULL CHECK (quota_type IN ('daily', 'monthly', 'per_request')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one record per service per quota type per period
  UNIQUE(service_name, quota_type, period_start)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_api_quota_service_period 
  ON api_quota_usage(service_name, period_start, period_end);

-- Removed NOW() because it is not immutable
-- We'll filter by current time at query level instead of in the index
CREATE INDEX IF NOT EXISTS idx_api_quota_current
  ON api_quota_usage(service_name, quota_type, period_start DESC);

-- ============================================================================
-- QUOTA ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quota_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  alert_level TEXT NOT NULL CHECK (alert_level IN ('warning', 'critical')),
  usage_percentage INTEGER NOT NULL,
  usage_count INTEGER NOT NULL,
  quota_limit INTEGER NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  
  CONSTRAINT valid_percentage CHECK (usage_percentage >= 0 AND usage_percentage <= 100)
);

-- Indexes for alert queries
CREATE INDEX IF NOT EXISTS idx_quota_alerts_service 
  ON quota_alerts(service_name, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_quota_alerts_unresolved 
  ON quota_alerts(service_name, resolved_at) 
  WHERE resolved_at IS NULL;

-- ============================================================================
-- NOTIFICATION QUEUE TABLE (for quota fallback)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- Indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_status 
  ON notification_queue(status, scheduled_for, created_at) 
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_notification_queue_user 
  ON notification_queue(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled 
  ON notification_queue(scheduled_for, status) 
  WHERE status = 'pending';

-- ============================================================================
-- QUOTA MONITORING FUNCTIONS
-- ============================================================================

-- Function to track quota usage
CREATE OR REPLACE FUNCTION track_quota_usage(
  p_service_name TEXT,
  p_quota_type TEXT DEFAULT 'daily',
  p_increment INTEGER DEFAULT 1,
  p_quota_limit INTEGER DEFAULT NULL
) RETURNS api_quota_usage AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_usage_record api_quota_usage;
  v_usage_count INTEGER;
  v_percentage NUMERIC;
BEGIN
  -- Calculate period boundaries
  IF p_quota_type = 'daily' THEN
    v_period_start := date_trunc('day', v_now);
    v_period_end := v_period_start + INTERVAL '1 day';
  ELSIF p_quota_type = 'monthly' THEN
    v_period_start := date_trunc('month', v_now);
    v_period_end := v_period_start + INTERVAL '1 month';
  ELSE
    RAISE EXCEPTION 'Invalid quota_type: %. Must be daily or monthly', p_quota_type;
  END IF;
  
  -- Upsert quota usage
  INSERT INTO api_quota_usage (
    service_name,
    quota_type,
    usage_count,
    quota_limit,
    period_start,
    period_end,
    updated_at
  ) VALUES (
    p_service_name,
    p_quota_type,
    p_increment,
    p_quota_limit,
    v_period_start,
    v_period_end,
    v_now
  )
  ON CONFLICT (service_name, quota_type, period_start) 
  DO UPDATE SET
    usage_count = api_quota_usage.usage_count + p_increment,
    updated_at = v_now,
    quota_limit = COALESCE(EXCLUDED.quota_limit, api_quota_usage.quota_limit)
  RETURNING * INTO v_usage_record;
  
  -- Check for alerts if quota_limit is set
  IF v_usage_record.quota_limit IS NOT NULL THEN
    v_usage_count := v_usage_record.usage_count;
    v_percentage := (v_usage_count::NUMERIC / v_usage_record.quota_limit::NUMERIC) * 100;
    
    -- Check for warning (70%) and critical (90%) thresholds
    IF v_percentage >= 90 THEN
      -- Check if critical alert already sent today
      IF NOT EXISTS (
        SELECT 1 FROM quota_alerts
        WHERE service_name = p_service_name
          AND alert_level = 'critical'
          AND sent_at >= v_period_start
          AND resolved_at IS NULL
      ) THEN
        INSERT INTO quota_alerts (
          service_name,
          alert_level,
          usage_percentage,
          usage_count,
          quota_limit,
          message
        ) VALUES (
          p_service_name,
          'critical',
          v_percentage::INTEGER,
          v_usage_count,
          v_usage_record.quota_limit,
          format('%s quota at %.0f%% (%s/%s)', p_service_name, v_percentage, v_usage_count, v_usage_record.quota_limit)
        );
      END IF;
    ELSIF v_percentage >= 70 THEN
      -- Check if warning alert already sent today
      IF NOT EXISTS (
        SELECT 1 FROM quota_alerts
        WHERE service_name = p_service_name
          AND alert_level = 'warning'
          AND sent_at >= v_period_start
          AND resolved_at IS NULL
      ) THEN
        INSERT INTO quota_alerts (
          service_name,
          alert_level,
          usage_percentage,
          usage_count,
          quota_limit,
          message
        ) VALUES (
          p_service_name,
          'warning',
          v_percentage::INTEGER,
          v_usage_count,
          v_usage_record.quota_limit,
          format('%s quota at %.0f%% (%s/%s)', p_service_name, v_percentage, v_usage_count, v_usage_record.quota_limit)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN v_usage_record;
END;
$$ LANGUAGE plpgsql;

-- Function to get current quota status
CREATE OR REPLACE FUNCTION get_quota_status(
  p_service_name TEXT,
  p_quota_type TEXT DEFAULT 'daily'
) RETURNS TABLE (
  usage INTEGER,
  limit_value INTEGER,
  percentage NUMERIC,
  remaining INTEGER,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_period_start TIMESTAMPTZ;
BEGIN
  IF p_quota_type = 'daily' THEN
    v_period_start := date_trunc('day', v_now);
  ELSIF p_quota_type = 'monthly' THEN
    v_period_start := date_trunc('month', v_now);
  ELSE
    RAISE EXCEPTION 'Invalid quota_type: %. Must be daily or monthly', p_quota_type;
  END IF;
  
  RETURN QUERY
  SELECT 
    COALESCE(qu.usage_count, 0)::INTEGER as usage,
    COALESCE(qu.quota_limit, 0)::INTEGER as limit_value,
    CASE 
      WHEN qu.quota_limit > 0 THEN (qu.usage_count::NUMERIC / qu.quota_limit::NUMERIC) * 100
      ELSE 0
    END as percentage,
    GREATEST(0, COALESCE(qu.quota_limit, 0) - COALESCE(qu.usage_count, 0))::INTEGER as remaining,
    v_period_start as period_start,
    v_period_start + CASE 
      WHEN p_quota_type = 'daily' THEN INTERVAL '1 day'
      WHEN p_quota_type = 'monthly' THEN INTERVAL '1 month'
    END as period_end
  FROM api_quota_usage qu
  WHERE qu.service_name = p_service_name
    AND qu.quota_type = p_quota_type
    AND qu.period_start = v_period_start
  UNION ALL
  SELECT 0, 0, 0, 0, v_period_start, v_period_start + CASE 
    WHEN p_quota_type = 'daily' THEN INTERVAL '1 day'
    WHEN p_quota_type = 'monthly' THEN INTERVAL '1 month'
  END
  WHERE NOT EXISTS (
    SELECT 1 FROM api_quota_usage
    WHERE service_name = p_service_name
      AND quota_type = p_quota_type
      AND period_start = v_period_start
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE api_quota_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access quota data
CREATE POLICY "Service role can manage quota usage"
  ON api_quota_usage FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage quota alerts"
  ON quota_alerts FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Users can only see their own queued notifications
CREATE POLICY "Users can view their own queued notifications"
  ON notification_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all notifications
CREATE POLICY "Service role can manage notification queue"
  ON notification_queue FOR ALL
  USING (auth.role() = 'service_role');

