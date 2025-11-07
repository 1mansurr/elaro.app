-- Cost Tracking and Budget Alerts System
-- Tracks API costs and sends alerts when approaching budgets

-- ============================================================================
-- API COST TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  cost_usd NUMERIC(10, 4) NOT NULL CHECK (cost_usd >= 0),
  operation_type TEXT, -- 'api_call', 'storage', 'compute', 'bandwidth'
  quantity INTEGER,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Allow multiple cost records per service per operation per day
  -- (for different sources or different time periods in the same day)
  UNIQUE(service_name, operation_type, date, created_at)
);

-- Indexes for cost queries
CREATE INDEX IF NOT EXISTS idx_api_cost_service_date 
  ON api_cost_tracking(service_name, date DESC);

CREATE INDEX IF NOT EXISTS idx_api_cost_current_month 
  ON api_cost_tracking(service_name, date) 
  WHERE date >= date_trunc('month', CURRENT_DATE);

-- ============================================================================
-- BUDGET CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  monthly_budget_usd NUMERIC(10, 2) NOT NULL CHECK (monthly_budget_usd > 0),
  alert_threshold_70 NUMERIC(10, 2),
  alert_threshold_90 NUMERIC(10, 2),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_thresholds CHECK (
    (alert_threshold_70 IS NULL OR (alert_threshold_70 > 0 AND alert_threshold_70 < monthly_budget_usd))
    AND
    (alert_threshold_90 IS NULL OR (
      alert_threshold_90 > COALESCE(alert_threshold_70, 0) 
      AND alert_threshold_90 < monthly_budget_usd
    ))
  )
);

-- ============================================================================
-- BUDGET ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  budget_config_id UUID REFERENCES budget_configs(id),
  current_spend NUMERIC(10, 2) NOT NULL CHECK (current_spend >= 0),
  budget_limit NUMERIC(10, 2) NOT NULL CHECK (budget_limit > 0),
  percentage NUMERIC(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  alert_level TEXT NOT NULL CHECK (alert_level IN ('warning', 'critical')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  message TEXT
);

-- Indexes for budget alerts
CREATE INDEX IF NOT EXISTS idx_budget_alerts_service 
  ON budget_alerts(service_name, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_unresolved 
  ON budget_alerts(service_name, resolved_at) 
  WHERE resolved_at IS NULL;

-- ============================================================================
-- COST TRACKING FUNCTIONS
-- ============================================================================

-- Function to record API cost
CREATE OR REPLACE FUNCTION record_api_cost(
  p_service_name TEXT,
  p_cost_usd NUMERIC,
  p_operation_type TEXT DEFAULT 'api_call',
  p_quantity INTEGER DEFAULT 1,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS api_cost_tracking AS $$
DECLARE
  v_cost_record api_cost_tracking;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO api_cost_tracking (
    service_name,
    cost_usd,
    operation_type,
    quantity,
    date,
    created_at
  ) VALUES (
    p_service_name,
    p_cost_usd,
    p_operation_type,
    p_quantity,
    p_date,
    v_now
  )
  ON CONFLICT (service_name, operation_type, date, created_at)
  DO UPDATE SET
    cost_usd = api_cost_tracking.cost_usd + p_cost_usd,
    quantity = api_cost_tracking.quantity + p_quantity
  RETURNING * INTO v_cost_record;
  
  RETURN v_cost_record;
END;
$$ LANGUAGE plpgsql;

-- Function to get current month spend
CREATE OR REPLACE FUNCTION get_current_month_spend(
  p_service_name TEXT
) RETURNS NUMERIC AS $$
DECLARE
  v_month_start DATE;
  v_total_spend NUMERIC;
BEGIN
  v_month_start := date_trunc('month', CURRENT_DATE);
  
  SELECT COALESCE(SUM(cost_usd), 0)
  INTO v_total_spend
  FROM api_cost_tracking
  WHERE service_name = p_service_name
    AND date >= v_month_start;
  
  RETURN v_total_spend;
END;
$$ LANGUAGE plpgsql;

-- Function to check and create budget alerts
CREATE OR REPLACE FUNCTION check_budget_alerts(
  p_service_name TEXT
) RETURNS void AS $$
DECLARE
  v_budget_config budget_configs%ROWTYPE;
  v_current_spend NUMERIC;
  v_percentage NUMERIC;
  v_month_start DATE;
BEGIN
  -- Get budget configuration
  SELECT * INTO v_budget_config
  FROM budget_configs
  WHERE service_name = p_service_name
    AND enabled = true;
  
  IF NOT FOUND THEN
    RETURN; -- No budget configured
  END IF;
  
  -- Get current month spend
  v_current_spend := get_current_month_spend(p_service_name);
  v_percentage := (v_current_spend / v_budget_config.monthly_budget_usd) * 100;
  v_month_start := date_trunc('month', CURRENT_DATE);
  
  -- Check critical threshold (90%)
  IF v_percentage >= 90 THEN
    IF NOT EXISTS (
      SELECT 1 FROM budget_alerts
      WHERE service_name = p_service_name
        AND alert_level = 'critical'
        AND sent_at >= v_month_start
        AND resolved_at IS NULL
    ) THEN
      INSERT INTO budget_alerts (
        service_name,
        budget_config_id,
        current_spend,
        budget_limit,
        percentage,
        alert_level,
        message
      ) VALUES (
        p_service_name,
        v_budget_config.id,
        v_current_spend,
        v_budget_config.monthly_budget_usd,
        v_percentage,
        'critical',
        format('%s budget at %.2f%% ($%.2f / $%.2f)', 
          p_service_name, v_percentage, v_current_spend, v_budget_config.monthly_budget_usd)
      );
    END IF;
  -- Check warning threshold (70%)
  ELSIF v_percentage >= 70 THEN
    IF NOT EXISTS (
      SELECT 1 FROM budget_alerts
      WHERE service_name = p_service_name
        AND alert_level = 'warning'
        AND sent_at >= v_month_start
        AND resolved_at IS NULL
    ) THEN
      INSERT INTO budget_alerts (
        service_name,
        budget_config_id,
        current_spend,
        budget_limit,
        percentage,
        alert_level,
        message
      ) VALUES (
        p_service_name,
        v_budget_config.id,
        v_current_spend,
        v_budget_config.monthly_budget_usd,
        v_percentage,
        'warning',
        format('%s budget at %.2f%% ($%.2f / $%.2f)', 
          p_service_name, v_percentage, v_current_spend, v_budget_config.monthly_budget_usd)
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIALIZE BUDGET CONFIGS
-- ============================================================================

INSERT INTO budget_configs (service_name, monthly_budget_usd, alert_threshold_70, alert_threshold_90)
VALUES
  ('supabase', 100.00, 70.00, 90.00),
  ('expo_push', 50.00, 35.00, 45.00),
  ('revenuecat', 25.00, 17.50, 22.50)
ON CONFLICT (service_name) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE api_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access cost data
CREATE POLICY "Service role can manage cost tracking"
  ON api_cost_tracking FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage budget configs"
  ON budget_configs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage budget alerts"
  ON budget_alerts FOR ALL
  USING (auth.role() = 'service_role');

