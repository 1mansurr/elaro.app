-- Storage Monitoring System for Supabase Free Plan
-- Tracks database size, file storage, upload size, and bandwidth usage
-- Alerts at 70% and 90% thresholds to prevent service disruption

-- ============================================================================
-- STORAGE QUOTA USAGE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS storage_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_type TEXT NOT NULL CHECK (storage_type IN ('database', 'file_storage', 'file_upload_size', 'bandwidth_cached', 'bandwidth_uncached', 'bandwidth_total')),
  usage_bytes BIGINT NOT NULL DEFAULT 0,
  quota_limit_bytes BIGINT NOT NULL,
  usage_percentage NUMERIC(5, 2) NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one record per storage type per period
  UNIQUE(storage_type, period_start)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_storage_quota_type_period 
  ON storage_quota_usage(storage_type, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_storage_quota_current 
  ON storage_quota_usage(storage_type, period_start DESC) 
  WHERE period_start <= NOW() AND period_end >= NOW();

-- ============================================================================
-- STORAGE QUOTA ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS storage_quota_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_type TEXT NOT NULL,
  alert_level TEXT NOT NULL CHECK (alert_level IN ('warning', 'critical')),
  usage_bytes BIGINT NOT NULL,
  quota_limit_bytes BIGINT NOT NULL,
  usage_percentage NUMERIC(5, 2) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  
  CONSTRAINT valid_storage_percentage CHECK (usage_percentage >= 0 AND usage_percentage <= 100)
);

-- Indexes for alert queries
CREATE INDEX IF NOT EXISTS idx_storage_alerts_type 
  ON storage_quota_alerts(storage_type, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_alerts_unresolved 
  ON storage_quota_alerts(storage_type, resolved_at) 
  WHERE resolved_at IS NULL;

-- ============================================================================
-- STORAGE MONITORING FUNCTIONS
-- ============================================================================

-- Function to track storage quota usage
CREATE OR REPLACE FUNCTION track_storage_quota(
  p_storage_type TEXT,
  p_usage_bytes BIGINT,
  p_quota_limit_bytes BIGINT
) RETURNS storage_quota_usage AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_usage_record storage_quota_usage;
  v_percentage NUMERIC;
BEGIN
  -- Calculate period boundaries (monthly for storage, daily for bandwidth)
  IF p_storage_type IN ('bandwidth_cached', 'bandwidth_uncached', 'bandwidth_total') THEN
    v_period_start := date_trunc('day', v_now);
    v_period_end := v_period_start + INTERVAL '1 day';
  ELSE
    v_period_start := date_trunc('month', v_now);
    v_period_end := v_period_start + INTERVAL '1 month';
  END IF;
  
  -- Calculate percentage
  v_percentage := (p_usage_bytes::NUMERIC / p_quota_limit_bytes::NUMERIC) * 100;
  
  -- Upsert storage quota usage
  INSERT INTO storage_quota_usage (
    storage_type,
    usage_bytes,
    quota_limit_bytes,
    usage_percentage,
    period_start,
    period_end,
    updated_at
  ) VALUES (
    p_storage_type,
    p_usage_bytes,
    p_quota_limit_bytes,
    v_percentage,
    v_period_start,
    v_period_end,
    v_now
  )
  ON CONFLICT (storage_type, period_start) 
  DO UPDATE SET
    usage_bytes = EXCLUDED.usage_bytes,
    quota_limit_bytes = EXCLUDED.quota_limit_bytes,
    usage_percentage = EXCLUDED.usage_percentage,
    updated_at = v_now,
    checked_at = v_now
  RETURNING * INTO v_usage_record;
  
  -- Check for alerts at 70% (warning) and 90% (critical) thresholds
  IF v_percentage >= 90 THEN
    -- Check if critical alert already sent today
    IF NOT EXISTS (
      SELECT 1 FROM storage_quota_alerts
      WHERE storage_type = p_storage_type
        AND alert_level = 'critical'
        AND sent_at >= v_period_start
        AND resolved_at IS NULL
    ) THEN
      INSERT INTO storage_quota_alerts (
        storage_type,
        alert_level,
        usage_bytes,
        quota_limit_bytes,
        usage_percentage,
        message
      ) VALUES (
        p_storage_type,
        'critical',
        p_usage_bytes,
        p_quota_limit_bytes,
        v_percentage,
        format('%s storage at %.0f%% (%s/%s)', p_storage_type, v_percentage, 
               pg_size_pretty(p_usage_bytes), pg_size_pretty(p_quota_limit_bytes))
      );
    END IF;
  ELSIF v_percentage >= 70 THEN
    -- Check if warning alert already sent today
    IF NOT EXISTS (
      SELECT 1 FROM storage_quota_alerts
      WHERE storage_type = p_storage_type
        AND alert_level = 'warning'
        AND sent_at >= v_period_start
        AND resolved_at IS NULL
    ) THEN
      INSERT INTO storage_quota_alerts (
        storage_type,
        alert_level,
        usage_bytes,
        quota_limit_bytes,
        usage_percentage,
        message
      ) VALUES (
        p_storage_type,
        'warning',
        p_usage_bytes,
        p_quota_limit_bytes,
        v_percentage,
        format('%s storage at %.0f%% (%s/%s)', p_storage_type, v_percentage,
               pg_size_pretty(p_usage_bytes), pg_size_pretty(p_quota_limit_bytes))
      );
    END IF;
  END IF;
  
  RETURN v_usage_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current storage quota status
CREATE OR REPLACE FUNCTION get_storage_quota_status(
  p_storage_type TEXT
) RETURNS TABLE (
  storage_type TEXT,
  usage_bytes BIGINT,
  quota_limit_bytes BIGINT,
  usage_percentage NUMERIC,
  remaining_bytes BIGINT,
  usage_readable TEXT,
  limit_readable TEXT,
  remaining_readable TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_period_start TIMESTAMPTZ;
BEGIN
  -- Calculate period based on storage type
  IF p_storage_type IN ('bandwidth_cached', 'bandwidth_uncached', 'bandwidth_total') THEN
    v_period_start := date_trunc('day', v_now);
  ELSE
    v_period_start := date_trunc('month', v_now);
  END IF;
  
  RETURN QUERY
  SELECT 
    sq.storage_type,
    sq.usage_bytes,
    sq.quota_limit_bytes,
    sq.usage_percentage,
    GREATEST(0, sq.quota_limit_bytes - sq.usage_bytes) as remaining_bytes,
    pg_size_pretty(sq.usage_bytes) as usage_readable,
    pg_size_pretty(sq.quota_limit_bytes) as limit_readable,
    pg_size_pretty(GREATEST(0, sq.quota_limit_bytes - sq.usage_bytes)) as remaining_readable,
    sq.period_start,
    sq.period_end
  FROM storage_quota_usage sq
  WHERE sq.storage_type = p_storage_type
    AND sq.period_start <= v_now
    AND sq.period_end >= v_now
  ORDER BY sq.period_start DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE storage_quota_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_quota_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access storage quota data
CREATE POLICY "Service role can manage storage quota usage"
  ON storage_quota_usage FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage storage quota alerts"
  ON storage_quota_alerts FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTION FOR DATABASE SIZE
-- ============================================================================

-- Function to get current database size
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS BIGINT AS $$
BEGIN
  RETURN pg_database_size(current_database());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE storage_quota_usage IS 'Tracks storage usage against Supabase Free Plan limits';
COMMENT ON TABLE storage_quota_alerts IS 'Alerts when storage usage exceeds 70% (warning) or 90% (critical) thresholds';

COMMENT ON COLUMN storage_quota_usage.storage_type IS 'Type: database, file_storage, file_upload_size, bandwidth_cached, bandwidth_uncached, bandwidth_total';
COMMENT ON COLUMN storage_quota_usage.usage_bytes IS 'Current usage in bytes';
COMMENT ON COLUMN storage_quota_usage.quota_limit_bytes IS 'Quota limit in bytes (Supabase Free Plan limits)';

