-- Monitoring and Observability Tables
-- This migration creates tables for comprehensive monitoring, logging, and analytics

-- ============================================================================
-- PERFORMANCE METRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  execution_time INTEGER NOT NULL, -- milliseconds
  memory_usage BIGINT, -- bytes
  cpu_usage NUMERIC, -- percentage
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_function_name ON public.performance_metrics(function_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON public.performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_success ON public.performance_metrics(success);

COMMENT ON TABLE public.performance_metrics IS 'Stores performance metrics for Edge Functions and API endpoints';

-- ============================================================================
-- DATABASE METRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.database_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_type TEXT NOT NULL,
  execution_time INTEGER NOT NULL, -- milliseconds
  rows_affected INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  query_text TEXT, -- For debugging (truncated)
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_database_metrics_query_type ON public.database_metrics(query_type);
CREATE INDEX IF NOT EXISTS idx_database_metrics_timestamp ON public.database_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_database_metrics_user_id ON public.database_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_database_metrics_success ON public.database_metrics(success);

COMMENT ON TABLE public.database_metrics IS 'Stores performance metrics for database operations';

-- ============================================================================
-- BUSINESS METRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 1,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_metrics_event_type ON public.business_metrics(event_type);
CREATE INDEX IF NOT EXISTS idx_business_metrics_timestamp ON public.business_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_business_metrics_user_id ON public.business_metrics(user_id);

COMMENT ON TABLE public.business_metrics IS 'Stores business metrics and user engagement data';

-- ============================================================================
-- ERROR LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  function_name TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'error', -- error, warning, info
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  context JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON public.error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);

COMMENT ON TABLE public.error_logs IS 'Stores application errors and exceptions for debugging and monitoring';

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);

COMMENT ON TABLE public.audit_logs IS 'Stores audit trail for user actions and data changes';

-- ============================================================================
-- SYSTEM HEALTH TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL, -- healthy, degraded, unhealthy
  checks JSONB NOT NULL, -- Health check results
  metrics JSONB NOT NULL, -- System metrics
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  details JSONB
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON public.system_health(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON public.system_health(status);

COMMENT ON TABLE public.system_health IS 'Stores system health status and metrics over time';

-- ============================================================================
-- ALERT RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL, -- performance, business, error
  threshold_value NUMERIC NOT NULL,
  threshold_operator TEXT NOT NULL, -- gt, lt, eq, gte, lte
  time_window_minutes INTEGER DEFAULT 5,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON public.alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_metric_type ON public.alert_rules(metric_type);

COMMENT ON TABLE public.alert_rules IS 'Defines alerting rules for monitoring thresholds';

-- ============================================================================
-- ALERT HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  severity TEXT NOT NULL DEFAULT 'warning', -- info, warning, error, critical
  message TEXT NOT NULL,
  context JSONB,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON public.alert_history(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_rule_id ON public.alert_history(alert_rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_acknowledged ON public.alert_history(acknowledged);

COMMENT ON TABLE public.alert_history IS 'Stores history of triggered alerts';

-- ============================================================================
-- MONITORING FUNCTIONS
-- ============================================================================

-- Function to get system health summary
CREATE OR REPLACE FUNCTION public.get_system_health_summary(
  hours_back INTEGER DEFAULT 24
)
RETURNS TABLE(
  status TEXT,
  avg_response_time NUMERIC,
  error_rate NUMERIC,
  total_requests BIGINT,
  healthy_checks INTEGER,
  total_checks INTEGER
) AS $$
DECLARE
  start_time TIMESTAMPTZ;
BEGIN
  start_time := NOW() - (hours_back || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    sh.status,
    COALESCE(AVG(pm.execution_time), 0) as avg_response_time,
    COALESCE(
      (COUNT(*) FILTER (WHERE pm.success = false)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
      0
    ) as error_rate,
    COUNT(pm.id) as total_requests,
    (
      SELECT COUNT(*)::INTEGER 
      FROM jsonb_each(sh.checks) 
      WHERE value::boolean = true
    ) as healthy_checks,
    (
      SELECT COUNT(*)::INTEGER 
      FROM jsonb_each(sh.checks)
    ) as total_checks
  FROM public.system_health sh
  LEFT JOIN public.performance_metrics pm ON pm.timestamp >= start_time
  WHERE sh.timestamp >= start_time
  GROUP BY sh.status, sh.checks
  ORDER BY sh.timestamp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_system_health_summary(INTEGER) IS 'Returns system health summary for the specified time period';

-- Function to get performance analytics
CREATE OR REPLACE FUNCTION public.get_performance_analytics(
  hours_back INTEGER DEFAULT 24
)
RETURNS TABLE(
  function_name TEXT,
  total_calls BIGINT,
  avg_execution_time NUMERIC,
  max_execution_time NUMERIC,
  error_rate NUMERIC,
  total_errors BIGINT
) AS $$
DECLARE
  start_time TIMESTAMPTZ;
BEGIN
  start_time := NOW() - (hours_back || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    pm.function_name,
    COUNT(*) as total_calls,
    ROUND(AVG(pm.execution_time), 2) as avg_execution_time,
    MAX(pm.execution_time) as max_execution_time,
    ROUND(
      (COUNT(*) FILTER (WHERE pm.success = false)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as error_rate,
    COUNT(*) FILTER (WHERE pm.success = false) as total_errors
  FROM public.performance_metrics pm
  WHERE pm.timestamp >= start_time
  GROUP BY pm.function_name
  ORDER BY avg_execution_time DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_performance_analytics(INTEGER) IS 'Returns performance analytics for Edge Functions';

-- Function to get business analytics
CREATE OR REPLACE FUNCTION public.get_business_analytics(
  hours_back INTEGER DEFAULT 24
)
RETURNS TABLE(
  event_type TEXT,
  total_events BIGINT,
  unique_users BIGINT,
  avg_events_per_user NUMERIC
) AS $$
DECLARE
  start_time TIMESTAMPTZ;
BEGIN
  start_time := NOW() - (hours_back || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    bm.event_type,
    SUM(bm.event_count) as total_events,
    COUNT(DISTINCT bm.user_id) as unique_users,
    ROUND(
      SUM(bm.event_count)::NUMERIC / NULLIF(COUNT(DISTINCT bm.user_id), 0), 
      2
    ) as avg_events_per_user
  FROM public.business_metrics bm
  WHERE bm.timestamp >= start_time
  GROUP BY bm.event_type
  ORDER BY total_events DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_business_analytics(INTEGER) IS 'Returns business analytics and user engagement metrics';

-- Function to cleanup old monitoring data
CREATE OR REPLACE FUNCTION public.cleanup_monitoring_data(
  retention_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  table_name TEXT,
  deleted_count BIGINT
) AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  deleted_performance BIGINT := 0;
  deleted_database BIGINT := 0;
  deleted_business BIGINT := 0;
  deleted_errors BIGINT := 0;
  deleted_audit BIGINT := 0;
  deleted_health BIGINT := 0;
  deleted_alerts BIGINT := 0;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  -- Cleanup performance metrics
  DELETE FROM public.performance_metrics WHERE timestamp < cutoff_date;
  GET DIAGNOSTICS deleted_performance = ROW_COUNT;
  
  -- Cleanup database metrics
  DELETE FROM public.database_metrics WHERE timestamp < cutoff_date;
  GET DIAGNOSTICS deleted_database = ROW_COUNT;
  
  -- Cleanup business metrics
  DELETE FROM public.business_metrics WHERE timestamp < cutoff_date;
  GET DIAGNOSTICS deleted_business = ROW_COUNT;
  
  -- Cleanup error logs (keep longer for debugging)
  DELETE FROM public.error_logs 
  WHERE timestamp < cutoff_date AND resolved = true;
  GET DIAGNOSTICS deleted_errors = ROW_COUNT;
  
  -- Cleanup audit logs
  DELETE FROM public.audit_logs WHERE timestamp < cutoff_date;
  GET DIAGNOSTICS deleted_audit = ROW_COUNT;
  
  -- Cleanup system health (keep recent data)
  DELETE FROM public.system_health WHERE timestamp < cutoff_date;
  GET DIAGNOSTICS deleted_health = ROW_COUNT;
  
  -- Cleanup old alerts
  DELETE FROM public.alert_history 
  WHERE triggered_at < cutoff_date AND acknowledged = true;
  GET DIAGNOSTICS deleted_alerts = ROW_COUNT;
  
  RETURN QUERY
  SELECT 'performance_metrics'::TEXT, deleted_performance
  UNION ALL
  SELECT 'database_metrics'::TEXT, deleted_database
  UNION ALL
  SELECT 'business_metrics'::TEXT, deleted_business
  UNION ALL
  SELECT 'error_logs'::TEXT, deleted_errors
  UNION ALL
  SELECT 'audit_logs'::TEXT, deleted_audit
  UNION ALL
  SELECT 'system_health'::TEXT, deleted_health
  UNION ALL
  SELECT 'alert_history'::TEXT, deleted_alerts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_monitoring_data(INTEGER) IS 'Cleans up old monitoring data based on retention period';

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on monitoring tables
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Policies for performance metrics (users can see their own data)
CREATE POLICY "Users can view their own performance metrics" ON public.performance_metrics
FOR SELECT USING (auth.uid() = user_id);

-- Policies for business metrics (users can see their own data)
CREATE POLICY "Users can view their own business metrics" ON public.business_metrics
FOR SELECT USING (auth.uid() = user_id);

-- Policies for audit logs (users can see their own actions)
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
FOR SELECT USING (auth.uid() = user_id);

-- Admin policies (admins can see all data)
CREATE POLICY "Admins can view all monitoring data" ON public.performance_metrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view all database metrics" ON public.database_metrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view all business metrics" ON public.business_metrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view all error logs" ON public.error_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view system health" ON public.system_health
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage alert rules" ON public.alert_rules
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view alert history" ON public.alert_history
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Monitoring and observability tables created successfully';
  RAISE NOTICE 'Added performance metrics tracking';
  RAISE NOTICE 'Added database metrics tracking';
  RAISE NOTICE 'Added business metrics tracking';
  RAISE NOTICE 'Added error logging system';
  RAISE NOTICE 'Added audit trail system';
  RAISE NOTICE 'Added system health monitoring';
  RAISE NOTICE 'Added alerting system';
  RAISE NOTICE 'Created analytics functions';
  RAISE NOTICE 'Added RLS policies for data security';
  RAISE NOTICE 'Comprehensive monitoring system is now active';
END $$;
