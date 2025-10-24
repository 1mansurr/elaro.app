-- Centralized Soft Delete Strategy
-- This migration implements a consistent soft delete pattern across all tables
-- and provides centralized functions for soft delete operations

-- ============================================================================
-- CENTRALIZED SOFT DELETE FUNCTIONS
-- ============================================================================

-- Generic soft delete function for any table
CREATE OR REPLACE FUNCTION soft_delete_record(
  table_name TEXT,
  record_id UUID,
  user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN := FALSE;
  where_clause TEXT;
BEGIN
  -- Build WHERE clause based on whether user_id is provided
  IF user_id IS NOT NULL THEN
    where_clause := format('id = $1 AND user_id = $2 AND deleted_at IS NULL');
    EXECUTE format('UPDATE %I SET deleted_at = NOW() WHERE %s', table_name, where_clause)
    USING record_id, user_id;
  ELSE
    where_clause := format('id = $1 AND deleted_at IS NULL');
    EXECUTE format('UPDATE %I SET deleted_at = NOW() WHERE %s', table_name, where_clause)
    USING record_id;
  END IF;
  
  GET DIAGNOSTICS result = ROW_COUNT;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION soft_delete_record(TEXT, UUID, UUID) IS 'Generic function to soft delete any record by ID, optionally scoped to a user';

-- Soft delete function with cascade for related records
CREATE OR REPLACE FUNCTION soft_delete_record_cascade(
  table_name TEXT,
  record_id UUID,
  user_id UUID DEFAULT NULL,
  cascade_tables TEXT[] DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN := FALSE;
  cascade_table TEXT;
  cascade_column TEXT;
BEGIN
  -- First, soft delete the main record
  result := soft_delete_record(table_name, record_id, user_id);
  
  -- If cascade tables are specified, soft delete related records
  IF result AND cascade_tables IS NOT NULL THEN
    FOREACH cascade_table IN ARRAY cascade_tables LOOP
      -- Determine the foreign key column name based on the main table
      CASE table_name
        WHEN 'courses' THEN
          cascade_column := 'course_id';
        WHEN 'assignments' THEN
          cascade_column := 'assignment_id';
        WHEN 'lectures' THEN
          cascade_column := 'lecture_id';
        WHEN 'study_sessions' THEN
          cascade_column := 'session_id';
        ELSE
          cascade_column := table_name || '_id';
      END CASE;
      
      -- Soft delete related records
      EXECUTE format('UPDATE %I SET deleted_at = NOW() WHERE %s = $1 AND deleted_at IS NULL', 
                     cascade_table, cascade_column)
      USING record_id;
    END LOOP;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION soft_delete_record_cascade(TEXT, UUID, UUID, TEXT[]) IS 'Soft delete a record and optionally cascade to related records';

-- Restore soft deleted record
CREATE OR REPLACE FUNCTION restore_soft_deleted_record(
  table_name TEXT,
  record_id UUID,
  user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN := FALSE;
  where_clause TEXT;
BEGIN
  -- Build WHERE clause based on whether user_id is provided
  IF user_id IS NOT NULL THEN
    where_clause := format('id = $1 AND user_id = $2 AND deleted_at IS NOT NULL');
    EXECUTE format('UPDATE %I SET deleted_at = NULL WHERE %s', table_name, where_clause)
    USING record_id, user_id;
  ELSE
    where_clause := format('id = $1 AND deleted_at IS NOT NULL');
    EXECUTE format('UPDATE %I SET deleted_at = NULL WHERE %s', table_name, where_clause)
    USING record_id;
  END IF;
  
  GET DIAGNOSTICS result = ROW_COUNT;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_soft_deleted_record(TEXT, UUID, UUID) IS 'Restore a soft deleted record by setting deleted_at to NULL';

-- ============================================================================
-- SOFT DELETE VIEWS
-- ============================================================================

-- Create views for active (non-deleted) records
CREATE OR REPLACE VIEW active_assignments AS
SELECT * FROM public.assignments WHERE deleted_at IS NULL;

COMMENT ON VIEW active_assignments IS 'View of assignments that are not soft deleted';

CREATE OR REPLACE VIEW active_lectures AS
SELECT * FROM public.lectures WHERE deleted_at IS NULL;

COMMENT ON VIEW active_lectures IS 'View of lectures that are not soft deleted';

CREATE OR REPLACE VIEW active_study_sessions AS
SELECT * FROM public.study_sessions WHERE deleted_at IS NULL;

COMMENT ON VIEW active_study_sessions IS 'View of study sessions that are not soft deleted';

CREATE OR REPLACE VIEW active_courses AS
SELECT * FROM public.courses WHERE deleted_at IS NULL;

COMMENT ON VIEW active_courses IS 'View of courses that are not soft deleted';

-- Create views for soft deleted records
CREATE OR REPLACE VIEW deleted_assignments AS
SELECT * FROM public.assignments WHERE deleted_at IS NOT NULL;

COMMENT ON VIEW deleted_assignments IS 'View of soft deleted assignments';

CREATE OR REPLACE VIEW deleted_lectures AS
SELECT * FROM public.lectures WHERE deleted_at IS NOT NULL;

COMMENT ON VIEW deleted_lectures IS 'View of soft deleted lectures';

CREATE OR REPLACE VIEW deleted_study_sessions AS
SELECT * FROM public.study_sessions WHERE deleted_at IS NOT NULL;

COMMENT ON VIEW deleted_study_sessions IS 'View of soft deleted study sessions';

CREATE OR REPLACE VIEW deleted_courses AS
SELECT * FROM public.courses WHERE deleted_at IS NOT NULL;

COMMENT ON VIEW deleted_courses IS 'View of soft deleted courses';

-- ============================================================================
-- SOFT DELETE TRIGGERS
-- ============================================================================

-- Function to handle soft delete cascading
CREATE OR REPLACE FUNCTION handle_soft_delete_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the record is being soft deleted (deleted_at is being set)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Handle course deletion cascade
    IF TG_TABLE_NAME = 'courses' THEN
      -- Soft delete related assignments
      UPDATE public.assignments 
      SET deleted_at = NOW() 
      WHERE course_id = NEW.id AND deleted_at IS NULL;
      
      -- Soft delete related lectures
      UPDATE public.lectures 
      SET deleted_at = NOW() 
      WHERE course_id = NEW.id AND deleted_at IS NULL;
    END IF;
    
    -- Handle assignment deletion cascade
    IF TG_TABLE_NAME = 'assignments' THEN
      -- Soft delete related reminders
      UPDATE public.reminders 
      SET deleted_at = NOW() 
      WHERE assignment_id = NEW.id AND deleted_at IS NULL;
    END IF;
    
    -- Handle lecture deletion cascade
    IF TG_TABLE_NAME = 'lectures' THEN
      -- Soft delete related reminders
      UPDATE public.reminders 
      SET deleted_at = NOW() 
      WHERE lecture_id = NEW.id AND deleted_at IS NULL;
    END IF;
    
    -- Handle study session deletion cascade
    IF TG_TABLE_NAME = 'study_sessions' THEN
      -- Soft delete related reminders
      UPDATE public.reminders 
      SET deleted_at = NOW() 
      WHERE session_id = NEW.id AND deleted_at IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for soft delete cascading
CREATE TRIGGER trigger_courses_soft_delete_cascade
  AFTER UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION handle_soft_delete_cascade();

CREATE TRIGGER trigger_assignments_soft_delete_cascade
  AFTER UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION handle_soft_delete_cascade();

CREATE TRIGGER trigger_lectures_soft_delete_cascade
  AFTER UPDATE ON public.lectures
  FOR EACH ROW
  EXECUTE FUNCTION handle_soft_delete_cascade();

CREATE TRIGGER trigger_study_sessions_soft_delete_cascade
  AFTER UPDATE ON public.study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_soft_delete_cascade();

-- ============================================================================
-- SOFT DELETE UTILITY FUNCTIONS
-- ============================================================================

-- Get soft delete statistics for a user
CREATE OR REPLACE FUNCTION get_soft_delete_stats(user_id UUID)
RETURNS TABLE(
  table_name TEXT,
  total_count BIGINT,
  active_count BIGINT,
  deleted_count BIGINT,
  deleted_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'assignments'::TEXT,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_count,
    ROUND(
      (COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as deleted_percentage
  FROM public.assignments 
  WHERE assignments.user_id = get_soft_delete_stats.user_id
  
  UNION ALL
  
  SELECT 
    'lectures'::TEXT,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_count,
    ROUND(
      (COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as deleted_percentage
  FROM public.lectures 
  WHERE lectures.user_id = get_soft_delete_stats.user_id
  
  UNION ALL
  
  SELECT 
    'study_sessions'::TEXT,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_count,
    ROUND(
      (COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as deleted_percentage
  FROM public.study_sessions 
  WHERE study_sessions.user_id = get_soft_delete_stats.user_id
  
  UNION ALL
  
  SELECT 
    'courses'::TEXT,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_count,
    ROUND(
      (COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as deleted_percentage
  FROM public.courses 
  WHERE courses.user_id = get_soft_delete_stats.user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_soft_delete_stats(UUID) IS 'Get soft delete statistics for a specific user across all tables';

-- Clean up old soft deleted records
CREATE OR REPLACE FUNCTION cleanup_old_soft_deleted_records(
  table_name TEXT,
  retention_days INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  EXECUTE format('DELETE FROM %I WHERE deleted_at IS NOT NULL AND deleted_at < $1', table_name)
  USING cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_soft_deleted_records(TEXT, INTEGER) IS 'Permanently delete old soft deleted records after retention period';

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES FOR SOFT DELETE
-- ============================================================================

-- Update RLS policies to respect soft delete
-- Note: These policies should be added to existing RLS policies

-- Example policy for assignments (should be added to existing policies)
-- CREATE POLICY "Users can view their own active assignments" ON public.assignments
-- FOR SELECT USING (
--   auth.uid() = user_id 
--   AND deleted_at IS NULL
-- );

-- Example policy for soft deleted records (admin only)
-- CREATE POLICY "Admins can view soft deleted records" ON public.assignments
-- FOR SELECT USING (
--   EXISTS (
--     SELECT 1 FROM public.users 
--     WHERE id = auth.uid() AND role = 'admin'
--   )
-- );

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Centralized soft delete strategy implemented successfully';
  RAISE NOTICE 'Created generic soft delete functions';
  RAISE NOTICE 'Created active/deleted views for all tables';
  RAISE NOTICE 'Added soft delete cascade triggers';
  RAISE NOTICE 'Created utility functions for statistics and cleanup';
  RAISE NOTICE 'Soft delete is now consistent across all tables';
END $$;
