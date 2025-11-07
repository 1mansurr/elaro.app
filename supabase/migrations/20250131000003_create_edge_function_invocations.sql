-- Edge Function Invocation Tracking System
-- Tracks per-function invocations for monitoring and cost optimization

-- ============================================================================
-- EDGE FUNCTION INVOCATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS edge_function_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  user_id UUID,
  metadata JSONB,
  
  -- Index for queries
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_edge_function_name_date 
  ON edge_function_invocations(function_name, invoked_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_function_user 
  ON edge_function_invocations(user_id, invoked_at DESC) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_edge_function_errors 
  ON edge_function_invocations(function_name, invoked_at DESC) 
  WHERE error_message IS NOT NULL;

-- ============================================================================
-- EDGE FUNCTION STATISTICS VIEW (for monitoring)
-- ============================================================================

CREATE OR REPLACE VIEW edge_function_stats AS
SELECT 
  function_name,
  DATE_TRUNC('day', invoked_at) as date,
  COUNT(*) as invocation_count,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as error_count,
  AVG(duration_ms) as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MIN(invoked_at) as first_invocation,
  MAX(invoked_at) as last_invocation
FROM edge_function_invocations
GROUP BY function_name, DATE_TRUNC('day', invoked_at);

-- ============================================================================
-- HIGH FREQUENCY FUNCTION ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS edge_function_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('high_frequency', 'high_cost', 'high_error_rate')),
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ
);

-- Indexes for alert queries
CREATE INDEX IF NOT EXISTS idx_edge_function_alerts_name 
  ON edge_function_alerts(function_name, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_function_alerts_unresolved 
  ON edge_function_alerts(function_name, resolved_at) 
  WHERE resolved_at IS NULL;

-- ============================================================================
-- FUNCTIONS FOR TRACKING AND MONITORING
-- ============================================================================

-- Function to record function invocation
CREATE OR REPLACE FUNCTION record_function_invocation(
  p_function_name TEXT,
  p_duration_ms INTEGER DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS edge_function_invocations AS $$
DECLARE
  v_invocation edge_function_invocations;
BEGIN
  INSERT INTO edge_function_invocations (
    function_name,
    duration_ms,
    status_code,
    error_message,
    user_id,
    metadata
  ) VALUES (
    p_function_name,
    p_duration_ms,
    p_status_code,
    p_error_message,
    p_user_id,
    p_metadata
  )
  RETURNING * INTO v_invocation;
  
  RETURN v_invocation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for high-frequency functions (alerts if > 1000 invocations/day)
CREATE OR REPLACE FUNCTION check_high_frequency_functions()
RETURNS TABLE (
  function_name TEXT,
  invocation_count BIGINT,
  threshold BIGINT,
  alert_needed BOOLEAN
) AS $$
DECLARE
  v_today_start TIMESTAMPTZ := DATE_TRUNC('day', NOW());
BEGIN
  RETURN QUERY
  SELECT 
    efs.function_name,
    efs.invocation_count::BIGINT,
    1000::BIGINT as threshold,
    (efs.invocation_count > 1000) as alert_needed
  FROM edge_function_stats efs
  WHERE efs.date = v_today_start
    AND efs.invocation_count > 1000
  ORDER BY efs.invocation_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for high error rate functions (alerts if error rate > 10%)
CREATE OR REPLACE FUNCTION check_high_error_rate_functions()
RETURNS TABLE (
  function_name TEXT,
  error_rate NUMERIC,
  error_count BIGINT,
  total_count BIGINT,
  alert_needed BOOLEAN
) AS $$
DECLARE
  v_today_start TIMESTAMPTZ := DATE_TRUNC('day', NOW());
BEGIN
  RETURN QUERY
  SELECT 
    efs.function_name,
    (efs.error_count::NUMERIC / NULLIF(efs.invocation_count, 0) * 100) as error_rate,
    efs.error_count,
    efs.invocation_count,
    ((efs.error_count::NUMERIC / NULLIF(efs.invocation_count, 0) * 100) > 10) as alert_needed
  FROM edge_function_stats efs
  WHERE efs.date = v_today_start
    AND efs.invocation_count > 0
    AND (efs.error_count::NUMERIC / NULLIF(efs.invocation_count, 0) * 100) > 10
  ORDER BY error_rate DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE edge_function_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_function_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access invocation data
CREATE POLICY "Service role can manage function invocations"
  ON edge_function_invocations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage function alerts"
  ON edge_function_alerts FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- CLEANUP FUNCTION (remove old data after 30 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_function_invocations()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM edge_function_invocations
  WHERE invoked_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE edge_function_invocations IS 'Tracks all edge function invocations for monitoring and cost analysis';
COMMENT ON TABLE edge_function_alerts IS 'Alerts for high-frequency, high-cost, or high-error-rate functions';
COMMENT ON VIEW edge_function_stats IS 'Daily statistics view for edge function invocations';

