-- Automated Maintenance System
-- This migration implements self-healing database operations and automated maintenance

-- ============================================================================
-- MAINTENANCE TASKS TABLE
-- ============================================================================

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

-- Maintenance schedule table
CREATE TABLE IF NOT EXISTS public.maintenance_schedule (
  id SERIAL PRIMARY KEY,
  task_name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUTOMATED MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to schedule maintenance tasks
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

-- Function to execute maintenance tasks
CREATE OR REPLACE FUNCTION execute_maintenance_task(p_task_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  task_record RECORD;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  result_message TEXT;
  result_status TEXT;
BEGIN
  -- Get task details
  SELECT * INTO task_record FROM public.maintenance_tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN 'Task not found';
  END IF;
  
  IF task_record.status != 'pending' THEN
    RETURN 'Task is not in pending status';
  END IF;
  
  -- Update task status
  UPDATE public.maintenance_tasks 
  SET status = 'running', started_at = NOW()
  WHERE id = p_task_id;
  
  start_time := NOW();
  
  -- Execute task based on type
  CASE task_record.task_type
    WHEN 'optimization' THEN
      PERFORM optimize_database();
      result_message := 'Database optimization completed successfully';
      result_status := 'success';
      
    WHEN 'cleanup' THEN
      PERFORM cleanup_old_events(30);
      PERFORM cleanup_old_user_events(30);
      result_message := 'Cleanup tasks completed successfully';
      result_status := 'success';
      
    WHEN 'analysis' THEN
      PERFORM collect_database_metrics();
      result_message := 'Database analysis completed successfully';
      result_status := 'success';
      
    WHEN 'monitoring' THEN
      PERFORM update_index_usage();
      result_message := 'Monitoring update completed successfully';
      result_status := 'success';
      
    ELSE
      result_message := 'Unknown task type: ' || task_record.task_type;
      result_status := 'failed';
  END CASE;
  
  end_time := NOW();
  
  -- Update task completion
  UPDATE public.maintenance_tasks 
  SET 
    status = CASE WHEN result_status = 'success' THEN 'completed' ELSE 'failed' END,
    completed_at = end_time,
    execution_time = end_time - start_time,
    result_status = result_status,
    result_message = result_message
  WHERE id = p_task_id;
  
  RETURN result_message;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Update task as failed
    UPDATE public.maintenance_tasks 
    SET 
      status = 'failed',
      completed_at = NOW(),
      execution_time = NOW() - start_time,
      result_status = 'error',
      result_message = SQLERRM
    WHERE id = p_task_id;
    
    RETURN 'Task failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to run automated maintenance
CREATE OR REPLACE FUNCTION run_automated_maintenance()
RETURNS TABLE (
  task_id INTEGER,
  task_name TEXT,
  status TEXT,
  result_message TEXT
) AS $$
DECLARE
  task_record RECORD;
  execution_result TEXT;
BEGIN
  -- Get pending tasks ordered by priority
  FOR task_record IN 
    SELECT * FROM public.maintenance_tasks 
    WHERE status = 'pending' 
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    ORDER BY priority ASC, created_at ASC
  LOOP
    execution_result := execute_maintenance_task(task_record.id);
    
    RETURN QUERY
    SELECT 
      task_record.id,
      task_record.task_name,
      (SELECT status FROM public.maintenance_tasks WHERE id = task_record.id),
      execution_result;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create maintenance schedule
CREATE OR REPLACE FUNCTION create_maintenance_schedule(
  p_task_name TEXT,
  p_cron_expression TEXT,
  p_is_active BOOLEAN DEFAULT TRUE
) RETURNS INTEGER AS $$
DECLARE
  schedule_id INTEGER;
BEGIN
  INSERT INTO public.maintenance_schedule (
    task_name, cron_expression, is_active, last_run, next_run
  ) VALUES (
    p_task_name, p_cron_expression, p_is_active, NULL, 
    NOW() + INTERVAL '1 hour' -- Simplified next run calculation
  ) RETURNING id INTO schedule_id;
  
  RETURN schedule_id;
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

-- Function to clean up old maintenance records
CREATE OR REPLACE FUNCTION cleanup_maintenance_history(p_days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.maintenance_tasks 
  WHERE completed_at < NOW() - INTERVAL '1 day' * p_days_to_keep
  AND status IN ('completed', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INTELLIGENT MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to detect maintenance needs
CREATE OR REPLACE FUNCTION detect_maintenance_needs()
RETURNS TABLE (
  need_type TEXT,
  priority INTEGER,
  description TEXT,
  recommended_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Check for slow queries
  SELECT 
    'performance_optimization'::TEXT,
    8 as priority,
    'Slow queries detected that need optimization'::TEXT,
    'Run database optimization and analyze query patterns'::TEXT
  WHERE EXISTS (
    SELECT 1 FROM pg_stat_statements 
    WHERE mean_time > '1 second'::INTERVAL
  )
  
  UNION ALL
  
  -- Check for unused indexes
  SELECT 
    'index_cleanup'::TEXT,
    6 as priority,
    'Unused indexes detected'::TEXT,
    'Review and remove unused indexes to reduce maintenance overhead'::TEXT
  WHERE EXISTS (
    SELECT 1 FROM pg_stat_user_indexes 
    WHERE idx_scan = 0
  )
  
  UNION ALL
  
  -- Check for old events
  SELECT 
    'data_cleanup'::TEXT,
    4 as priority,
    'Old event data needs cleanup'::TEXT,
    'Clean up old processed events to maintain performance'::TEXT
  WHERE EXISTS (
    SELECT 1 FROM public.user_events 
    WHERE processed = TRUE 
    AND created_at < NOW() - INTERVAL '30 days'
  )
  
  UNION ALL
  
  -- Check for missing statistics
  SELECT 
    'statistics_update'::TEXT,
    7 as priority,
    'Database statistics may be outdated'::TEXT,
    'Update table statistics for optimal query planning'::TEXT
  WHERE (
    SELECT MAX(last_analyze) FROM pg_stat_user_tables
  ) < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to auto-schedule maintenance
CREATE OR REPLACE FUNCTION auto_schedule_maintenance()
RETURNS INTEGER AS $$
DECLARE
  need_record RECORD;
  scheduled_count INTEGER := 0;
BEGIN
  -- Schedule maintenance based on detected needs
  FOR need_record IN SELECT * FROM detect_maintenance_needs() LOOP
    PERFORM schedule_maintenance_task(
      need_record.need_type,
      CASE 
        WHEN need_record.need_type = 'performance_optimization' THEN 'optimization'
        WHEN need_record.need_type = 'index_cleanup' THEN 'cleanup'
        WHEN need_record.need_type = 'data_cleanup' THEN 'cleanup'
        WHEN need_record.need_type = 'statistics_update' THEN 'analysis'
        ELSE 'monitoring'
      END,
      need_record.priority,
      NOW() + INTERVAL '5 minutes' -- Schedule for 5 minutes from now
    );
    
    scheduled_count := scheduled_count + 1;
  END LOOP;
  
  RETURN scheduled_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MAINTENANCE SCHEDULING
-- ============================================================================

-- Create default maintenance schedule
INSERT INTO public.maintenance_schedule (task_name, cron_expression, is_active, next_run) VALUES
  ('daily_optimization', '0 2 * * *', TRUE, NOW() + INTERVAL '1 day'), -- 2 AM daily
  ('weekly_analysis', '0 3 * * 0', TRUE, NOW() + INTERVAL '1 week'), -- 3 AM Sunday
  ('monthly_cleanup', '0 4 1 * *', TRUE, NOW() + INTERVAL '1 month'), -- 4 AM 1st of month
  ('hourly_monitoring', '0 * * * *', TRUE, NOW() + INTERVAL '1 hour'); -- Every hour

-- ============================================================================
-- INDEXES FOR MAINTENANCE TABLES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON public.maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_priority ON public.maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_scheduled_at ON public.maintenance_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_type ON public.maintenance_tasks(task_type);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_active ON public.maintenance_schedule(is_active);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_next_run ON public.maintenance_schedule(next_run);

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Automated maintenance system implemented successfully';
  RAISE NOTICE 'Created maintenance task management system';
  RAISE NOTICE 'Added intelligent maintenance detection';
  RAISE NOTICE 'Implemented automated task scheduling';
  RAISE NOTICE 'Created maintenance status monitoring';
  RAISE NOTICE 'Added default maintenance schedule';
  RAISE NOTICE 'Automated maintenance system is now active';
END $$;
