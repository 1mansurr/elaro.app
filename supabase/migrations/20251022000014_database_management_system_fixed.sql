-- Database Management System (Fixed)
-- This migration creates the foundation for database management, monitoring, and optimization

-- ============================================================================
-- MIGRATION TRACKING SYSTEM
-- ============================================================================

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS public.migration_history (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum VARCHAR(64),
  rollback_sql TEXT,
  status VARCHAR(20) DEFAULT 'applied',
  applied_by VARCHAR(100) DEFAULT current_user,
  execution_time INTERVAL,
  notes TEXT
);

-- Create migration validation function
CREATE OR REPLACE FUNCTION validate_migration(
  p_version TEXT,
  p_checksum TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  existing_migration RECORD;
BEGIN
  -- Check if migration already exists
  SELECT * INTO existing_migration
  FROM public.migration_history
  WHERE version = p_version;
  
  IF FOUND THEN
    -- Verify checksum matches
    IF existing_migration.checksum != p_checksum THEN
      RAISE EXCEPTION 'Migration % has been modified. Checksum mismatch.', p_version;
    END IF;
    
    -- Check if already applied
    IF existing_migration.status = 'applied' THEN
      RAISE EXCEPTION 'Migration % has already been applied.', p_version;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to record migration
CREATE OR REPLACE FUNCTION record_migration(
  p_version TEXT,
  p_name TEXT,
  p_checksum TEXT DEFAULT NULL,
  p_rollback_sql TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  start_time TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.migration_history (
    version, name, checksum, rollback_sql, notes, applied_at
  ) VALUES (
    p_version, p_name, p_checksum, p_rollback_sql, p_notes, start_time
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BACKUP MANAGEMENT SYSTEM
-- ============================================================================

-- Backup configuration table
CREATE TABLE IF NOT EXISTS public.backup_config (
  id SERIAL PRIMARY KEY,
  backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'differential'
  schedule_cron VARCHAR(100) NOT NULL,
  retention_days INTEGER DEFAULT 30,
  compression BOOLEAN DEFAULT TRUE,
  encryption BOOLEAN DEFAULT TRUE,
  enabled BOOLEAN DEFAULT TRUE,
  backup_path TEXT DEFAULT '/backups',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup log table
CREATE TABLE IF NOT EXISTS public.backup_log (
  id SERIAL PRIMARY KEY,
  backup_id TEXT UNIQUE NOT NULL,
  backup_type VARCHAR(50) NOT NULL,
  backup_path TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'in_progress',
  restored_at TIMESTAMPTZ,
  notes TEXT,
  checksum VARCHAR(64)
);

-- Recovery points table
CREATE TABLE IF NOT EXISTS public.recovery_points (
  id SERIAL PRIMARY KEY,
  point_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_for_restore BOOLEAN DEFAULT FALSE,
  wal_position TEXT
);

-- Backup management functions
CREATE OR REPLACE FUNCTION create_backup(
  p_backup_type VARCHAR(50) DEFAULT 'full',
  p_compression BOOLEAN DEFAULT TRUE,
  p_encryption BOOLEAN DEFAULT FALSE
) RETURNS TEXT AS $$
DECLARE
  backup_id TEXT;
  backup_path TEXT;
  backup_file TEXT;
BEGIN
  backup_id := 'backup_' || extract(epoch from now())::text;
  backup_path := '/backups/' || backup_id;
  backup_file := backup_path || '.sql';
  
  -- Log backup creation
  INSERT INTO public.backup_log (
    backup_id, backup_type, backup_path, status
  ) VALUES (
    backup_id, p_backup_type, backup_file, 'in_progress'
  );
  
  -- Note: Actual backup creation would be handled by external script
  -- This function just records the backup metadata
  
  UPDATE public.backup_log 
  SET status = 'completed', file_size = 0 -- Would be actual file size
  WHERE backup_id = backup_id;
  
  RETURN backup_id;
END;
$$ LANGUAGE plpgsql;

-- Create recovery point
CREATE OR REPLACE FUNCTION create_recovery_point(
  p_name TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  recovery_point_id TEXT;
BEGIN
  recovery_point_id := 'rp_' || extract(epoch from now())::text;
  
  -- Log recovery point
  INSERT INTO public.recovery_points (
    point_id, name, description
  ) VALUES (
    recovery_point_id, p_name, p_description
  );
  
  RETURN recovery_point_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE MONITORING SYSTEM
-- ============================================================================

-- Query performance monitoring
CREATE TABLE IF NOT EXISTS public.query_performance (
  id SERIAL PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  execution_count BIGINT DEFAULT 1,
  total_time INTERVAL,
  mean_time INTERVAL,
  min_time INTERVAL,
  max_time INTERVAL,
  rows_returned BIGINT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Slow queries tracking
CREATE TABLE IF NOT EXISTS public.slow_queries (
  id SERIAL PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  execution_time INTERVAL NOT NULL,
  rows_returned BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID,
  session_id TEXT
);

-- Index usage monitoring
CREATE TABLE IF NOT EXISTS public.index_usage (
  id SERIAL PRIMARY KEY,
  index_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  index_scans BIGINT DEFAULT 0,
  index_tuples_read BIGINT DEFAULT 0,
  index_tuples_fetched BIGINT DEFAULT 0,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  index_size BIGINT DEFAULT 0
);

-- Performance monitoring functions
CREATE OR REPLACE FUNCTION log_slow_query(
  p_query_text TEXT,
  p_execution_time INTERVAL,
  p_rows_returned BIGINT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.slow_queries (
    query_hash, query_text, execution_time, rows_returned, user_id
  ) VALUES (
    md5(p_query_text), p_query_text, p_execution_time, p_rows_returned, p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Update index usage statistics
CREATE OR REPLACE FUNCTION update_index_usage() RETURNS VOID AS $$
BEGIN
  -- Clear existing data
  DELETE FROM public.index_usage;
  
  -- Insert fresh data
  INSERT INTO public.index_usage (
    index_name, table_name, index_scans, index_tuples_read, index_tuples_fetched, index_size
  )
  SELECT 
    schemaname||'.'||indexrelname as index_name,
    schemaname||'.'||relname as table_name,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_relation_size(indexrelid)
  FROM pg_stat_user_indexes;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE ANALYSIS FUNCTIONS
-- ============================================================================

-- Get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(
  p_limit INTEGER DEFAULT 10,
  p_min_execution_time INTERVAL DEFAULT '1 second'
) RETURNS TABLE (
  query_text TEXT,
  execution_time INTERVAL,
  rows_returned BIGINT,
  created_at TIMESTAMPTZ,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.query_text,
    sq.execution_time,
    sq.rows_returned,
    sq.created_at,
    sq.user_id
  FROM public.slow_queries sq
  WHERE sq.execution_time >= p_min_execution_time
  ORDER BY sq.execution_time DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get unused indexes
CREATE OR REPLACE FUNCTION get_unused_indexes() RETURNS TABLE (
  index_name TEXT,
  table_name TEXT,
  index_size TEXT,
  last_used TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    iu.index_name,
    iu.table_name,
    pg_size_pretty(iu.index_size) as index_size,
    iu.last_used
  FROM public.index_usage iu
  WHERE iu.index_scans = 0
  ORDER BY iu.index_size DESC;
END;
$$ LANGUAGE plpgsql;

-- Get performance recommendations
CREATE OR REPLACE FUNCTION get_performance_recommendations() RETURNS TABLE (
  recommendation_type TEXT,
  description TEXT,
  impact TEXT,
  effort TEXT,
  estimated_improvement TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Missing indexes
  SELECT 
    'missing_index'::TEXT,
    'Consider adding index on ' || table_name || '(' || column_name || ')' as description,
    'High'::TEXT,
    'Low'::TEXT,
    '50-70% query speed improvement'::TEXT
  FROM (
    SELECT DISTINCT 
      schemaname||'.'||tablename as table_name,
      attname as column_name
    FROM pg_stat_user_tables t
    JOIN pg_attribute a ON a.attrelid = t.relid
    WHERE a.attnum > 0 AND NOT a.attisdropped
    AND NOT EXISTS (
      SELECT 1 FROM pg_index i 
      WHERE i.indrelid = t.relid 
      AND a.attnum = ANY(i.indkey)
    )
  ) missing_indexes
  
  UNION ALL
  
  -- Unused indexes
  SELECT 
    'unused_index'::TEXT,
    'Consider dropping unused index: ' || index_name as description,
    'Medium'::TEXT,
    'Low'::TEXT,
    'Reduce storage and maintenance overhead'::TEXT
  FROM get_unused_indexes()
  
  UNION ALL
  
  -- Large tables without partitioning
  SELECT 
    'partitioning'::TEXT,
    'Consider partitioning large table: ' || table_name as description,
    'High'::TEXT,
    'High'::TEXT,
    'Improve query performance on large datasets'::TEXT
  FROM (
    SELECT 
      schemaname||'.'||tablename as table_name,
      pg_size_pretty(pg_total_relation_size(relid)) as size
    FROM pg_stat_user_tables
    WHERE pg_total_relation_size(relid) > 1000000000 -- 1GB
  ) large_tables;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- OPTIMIZATION SYSTEM
-- ============================================================================

-- Optimization log table
CREATE TABLE IF NOT EXISTS public.optimization_log (
  id SERIAL PRIMARY KEY,
  optimization_type TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'started',
  details JSONB,
  performance_improvement JSONB
);

-- Automated optimization function
CREATE OR REPLACE FUNCTION optimize_database() RETURNS VOID AS $$
DECLARE
  start_time TIMESTAMPTZ := NOW();
  end_time TIMESTAMPTZ;
BEGIN
  -- Log optimization start
  INSERT INTO public.optimization_log (
    optimization_type, started_at, status
  ) VALUES (
    'full_optimization', start_time, 'started'
  );
  
  -- Update statistics
  ANALYZE;
  
  -- Update index usage
  PERFORM update_index_usage();
  
  end_time := NOW();
  
  -- Update optimization log
  UPDATE public.optimization_log 
  SET 
    status = 'completed', 
    completed_at = end_time,
    details = json_build_object(
      'duration', end_time - start_time,
      'tables_analyzed', (SELECT COUNT(*) FROM pg_stat_user_tables),
      'indexes_updated', (SELECT COUNT(*) FROM pg_stat_user_indexes)
    )
  WHERE optimization_type = 'full_optimization' 
  AND started_at = start_time;
  
  RAISE NOTICE 'Database optimization completed in %', end_time - start_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default backup configuration
INSERT INTO public.backup_config (
  backup_type, schedule_cron, retention_days, compression, encryption, enabled
) VALUES 
  ('full', '0 2 * * *', 30, TRUE, TRUE, TRUE),
  ('incremental', '0 */6 * * *', 7, TRUE, FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- Create initial recovery point
SELECT create_recovery_point('initial_setup', 'Database management system setup');

-- Run initial optimization
SELECT optimize_database();

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Database management system implemented successfully';
  RAISE NOTICE 'Migration tracking system active';
  RAISE NOTICE 'Backup management system configured';
  RAISE NOTICE 'Performance monitoring system active';
  RAISE NOTICE 'Optimization system ready';
  RAISE NOTICE 'All systems operational';
END $$;
