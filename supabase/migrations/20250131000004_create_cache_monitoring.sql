-- Cache Monitoring System
-- Tracks cache hit rates and alerts when hit rate drops below 80% for > 30 minutes

CREATE TABLE IF NOT EXISTS cache_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hit_rate NUMERIC(5, 2) NOT NULL,
  hits INTEGER NOT NULL,
  misses INTEGER NOT NULL,
  total_requests INTEGER NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_cache_metrics_checked_at 
  ON cache_metrics(checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_cache_metrics_window 
  ON cache_metrics(window_start, checked_at DESC);

-- Cache alerts table
CREATE TABLE IF NOT EXISTS cache_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hit_rate NUMERIC(5, 2) NOT NULL,
  hits INTEGER NOT NULL,
  misses INTEGER NOT NULL,
  total_requests INTEGER NOT NULL,
  threshold NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
  duration_minutes INTEGER NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ
);

-- Index for alert queries
CREATE INDEX IF NOT EXISTS idx_cache_alerts_sent_at 
  ON cache_alerts(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_cache_alerts_unresolved 
  ON cache_alerts(resolved_at) 
  WHERE resolved_at IS NULL;

-- Function to record cache metrics
CREATE OR REPLACE FUNCTION record_cache_metrics(
  p_hit_rate NUMERIC,
  p_hits INTEGER,
  p_misses INTEGER,
  p_total_requests INTEGER,
  p_window_start TIMESTAMPTZ
) RETURNS cache_metrics AS $$
DECLARE
  v_metric cache_metrics;
BEGIN
  INSERT INTO cache_metrics (
    hit_rate,
    hits,
    misses,
    total_requests,
    window_start
  ) VALUES (
    p_hit_rate,
    p_hits,
    p_misses,
    p_total_requests,
    p_window_start
  )
  RETURNING * INTO v_metric;
  
  RETURN v_metric;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create cache alert
CREATE OR REPLACE FUNCTION create_cache_alert(
  p_hit_rate NUMERIC,
  p_hits INTEGER,
  p_misses INTEGER,
  p_total_requests INTEGER,
  p_duration_minutes INTEGER
) RETURNS cache_alerts AS $$
DECLARE
  v_alert cache_alerts;
BEGIN
  INSERT INTO cache_alerts (
    hit_rate,
    hits,
    misses,
    total_requests,
    duration_minutes,
    message
  ) VALUES (
    p_hit_rate,
    p_hits,
    p_misses,
    p_total_requests,
    p_duration_minutes,
    format('Cache hit rate is %.2f%% (below 80%% threshold) for %s minutes. Hits: %s, Misses: %s, Total: %s',
           p_hit_rate, p_duration_minutes, p_hits, p_misses, p_total_requests)
  )
  RETURNING * INTO v_alert;
  
  RETURN v_alert;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE cache_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access cache metrics
CREATE POLICY "Service role can manage cache metrics"
  ON cache_metrics FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage cache alerts"
  ON cache_alerts FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE cache_metrics IS 'Tracks cache hit rate metrics for monitoring';
COMMENT ON TABLE cache_alerts IS 'Alerts when cache hit rate drops below 80% for more than 30 minutes';

