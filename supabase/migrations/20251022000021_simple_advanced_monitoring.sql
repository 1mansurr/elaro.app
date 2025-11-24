-- Simple Advanced Monitoring System
-- This migration implements basic advanced monitoring without complex functions

-- ============================================================================
-- ADVANCED MONITORING TABLES
-- ============================================================================

-- Health metrics table
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id SERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  threshold_warning NUMERIC,
  threshold_critical NUMERIC,
  status TEXT CHECK (status IN ('healthy', 'warning', 'critical')),
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB
);

-- Maintenance tasks table
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id SERIAL PRIMARY KEY,
  task_name TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('optimization', 'cleanup', 'analysis', 'backup', 'monitoring')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  execution_time INTERVAL,
  result_status TEXT,
  result_message TEXT,
  result_data JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SIMPLE MONITORING FUNCTIONS
-- ============================================================================

-- Function to collect basic metrics
CREATE OR REPLACE FUNCTION collect_basic_metrics()
RETURNS VOID AS $$
DECLARE
  query_count INTEGER := 0;
  index_count INTEGER;
  table_count INTEGER;
  total_size BIGINT;
BEGIN
  -- Get basic counts
  -- pg_stat_statements might not be available, so handle gracefully
  BEGIN
    SELECT COUNT(*) INTO query_count FROM pg_stat_statements;
  EXCEPTION WHEN OTHERS THEN
    query_count := 0;
  END;
  
  SELECT COUNT(*) INTO index_count FROM pg_stat_user_indexes;
  SELECT COUNT(*) INTO table_count FROM pg_stat_user_tables;
  SELECT SUM(pg_total_relation_size(relid)) INTO total_size FROM pg_stat_user_tables;
  
  -- Insert health metrics
  INSERT INTO public.health_metrics (metric_name, metric_value, metric_unit, threshold_warning, threshold_critical, status, details)
  VALUES 
    ('total_queries', query_count, 'count', 1000, 5000, 
     CASE WHEN query_count > 5000 THEN 'critical' WHEN query_count > 1000 THEN 'warning' ELSE 'healthy' END,
     json_build_object('description', 'Total number of unique queries tracked')),
    
    ('total_indexes', index_count, 'count', 100, 500,
     CASE WHEN index_count > 500 THEN 'critical' WHEN index_count > 100 THEN 'warning' ELSE 'healthy' END,
     json_build_object('description', 'Total number of user indexes')),
    
    ('total_tables', table_count, 'count', 50, 200,
     CASE WHEN table_count > 200 THEN 'critical' WHEN table_count > 50 THEN 'warning' ELSE 'healthy' END,
     json_build_object('description', 'Total number of user tables')),
    
    ('database_size', total_size, 'bytes', 1000000000, 10000000000, -- 1GB, 10GB
     CASE WHEN total_size > 10000000000 THEN 'critical' WHEN total_size > 1000000000 THEN 'warning' ELSE 'healthy' END,
     json_build_object('description', 'Total database size in bytes', 'size_pretty', pg_size_pretty(total_size)));
  
  RAISE NOTICE 'Basic metrics collected successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to get maintenance status
CREATE OR REPLACE FUNCTION get_maintenance_status()
RETURNS TABLE (
  total_tasks BIGINT,
  pending_tasks BIGINT,
  running_tasks BIGINT,
  completed_tasks BIGINT,
  failed_tasks BIGINT,
  failed_tasks_24h BIGINT,
  avg_execution_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'running') as running_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
    COUNT(*) FILTER (WHERE status = 'failed' AND completed_at > NOW() - INTERVAL '24 hours') as failed_tasks_24h,
    AVG(execution_time) FILTER (WHERE execution_time IS NOT NULL) as avg_execution_time
  FROM public.maintenance_tasks;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule maintenance task
CREATE OR REPLACE FUNCTION schedule_maintenance_task(
  p_task_name TEXT,
  p_task_type TEXT,
  p_priority INTEGER DEFAULT 5,
  p_scheduled_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS INTEGER AS $$
DECLARE
  task_id INTEGER;
BEGIN
  INSERT INTO public.maintenance_tasks (
    task_name, task_type, priority, scheduled_at, status
  ) VALUES (
    p_task_name, p_task_type, p_priority, p_scheduled_at, 'pending'
  ) RETURNING id INTO task_id;
  
  RETURN task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get health overview
CREATE OR REPLACE FUNCTION get_health_overview()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  status TEXT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hm.metric_name,
    hm.metric_value,
    hm.status,
    COALESCE(hm.details->>'description', 'No description available') as description
  FROM public.health_metrics hm
  WHERE hm.measured_at > NOW() - INTERVAL '1 hour'
  ORDER BY hm.measured_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR MONITORING TABLES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_health_metrics_name ON public.health_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_health_metrics_status ON public.health_metrics(status);
CREATE INDEX IF NOT EXISTS idx_health_metrics_measured_at ON public.health_metrics(measured_at);

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON public.maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_priority ON public.maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_scheduled_at ON public.maintenance_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_type ON public.maintenance_tasks(task_type);

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Collect initial metrics
SELECT collect_basic_metrics();

-- Schedule some default maintenance tasks
SELECT schedule_maintenance_task('daily_optimization', 'optimization', 8);
SELECT schedule_maintenance_task('weekly_cleanup', 'cleanup', 6);
SELECT schedule_maintenance_task('monthly_analysis', 'analysis', 4);

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Simple advanced monitoring system implemented successfully';
  RAISE NOTICE 'Created health metrics tracking';
  RAISE NOTICE 'Added maintenance task management';
  RAISE NOTICE 'Implemented basic monitoring functions';
  RAISE NOTICE 'Added initial metrics collection';
  RAISE NOTICE 'Simple advanced monitoring is now active';
END $$;
