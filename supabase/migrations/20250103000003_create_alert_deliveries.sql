-- Alert Deliveries Table
-- Tracks delivery of quota and budget alerts via multiple channels

CREATE TABLE IF NOT EXISTS alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('quota', 'budget')),
  service_name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('warning', 'critical')),
  message TEXT NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT false,
  slack_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying recent alerts
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_service_date 
  ON alert_deliveries(service_name, delivered_at DESC);

-- Index for unresolved alerts
-- Removed NOW() from WHERE clause because it is not immutable
-- Filter by delivered_at > NOW() - INTERVAL '7 days' in queries instead
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_recent
  ON alert_deliveries(alert_type, level, delivered_at DESC);

-- Enable RLS (only service role can access)
ALTER TABLE alert_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage alert deliveries"
  ON alert_deliveries FOR ALL
  USING (auth.role() = 'service_role');

