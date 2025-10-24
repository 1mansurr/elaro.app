-- Simplify Foreign Key Relationships and Remove CASCADE Deletes
-- This migration removes CASCADE deletes and implements application-level
-- cascade handling for better data integrity and control

-- ============================================================================
-- REMOVE CASCADE DELETES
-- ============================================================================

-- Drop existing foreign key constraints with CASCADE
ALTER TABLE public.assignments 
DROP CONSTRAINT IF EXISTS assignments_course_id_fkey;

ALTER TABLE public.assignments 
DROP CONSTRAINT IF EXISTS assignments_user_id_fkey;

ALTER TABLE public.lectures 
DROP CONSTRAINT IF EXISTS lectures_course_id_fkey;

ALTER TABLE public.lectures 
DROP CONSTRAINT IF EXISTS lectures_user_id_fkey;

ALTER TABLE public.study_sessions 
DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey;

ALTER TABLE public.reminders 
DROP CONSTRAINT IF EXISTS reminders_assignment_id_fkey;

ALTER TABLE public.reminders 
DROP CONSTRAINT IF EXISTS reminders_lecture_id_fkey;

ALTER TABLE public.reminders 
DROP CONSTRAINT IF EXISTS reminders_session_id_fkey;

ALTER TABLE public.reminders 
DROP CONSTRAINT IF EXISTS reminders_user_id_fkey;

-- ============================================================================
-- ADD SIMPLIFIED FOREIGN KEY CONSTRAINTS (NO CASCADE)
-- ============================================================================

-- Add foreign key constraints without CASCADE
ALTER TABLE public.assignments 
ADD CONSTRAINT assignments_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES public.courses(id);

ALTER TABLE public.assignments 
ADD CONSTRAINT assignments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.lectures 
ADD CONSTRAINT lectures_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES public.courses(id);

ALTER TABLE public.lectures 
ADD CONSTRAINT lectures_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.study_sessions 
ADD CONSTRAINT study_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.reminders 
ADD CONSTRAINT reminders_assignment_id_fkey 
FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);

ALTER TABLE public.reminders 
ADD CONSTRAINT reminders_lecture_id_fkey 
FOREIGN KEY (lecture_id) REFERENCES public.lectures(id);

ALTER TABLE public.reminders 
ADD CONSTRAINT reminders_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES public.study_sessions(id);

ALTER TABLE public.reminders 
ADD CONSTRAINT reminders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id);

-- ============================================================================
-- APPLICATION-LEVEL CASCADE HANDLING
-- ============================================================================

-- Function to handle course deletion with proper cascade
CREATE OR REPLACE FUNCTION public.handle_course_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the course is being soft deleted
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Soft delete related assignments
    UPDATE public.assignments 
    SET deleted_at = NOW() 
    WHERE course_id = OLD.id AND deleted_at IS NULL;
    
    -- Soft delete related lectures
    UPDATE public.lectures 
    SET deleted_at = NOW() 
    WHERE course_id = OLD.id AND deleted_at IS NULL;
    
    -- Log the cascade operation
    INSERT INTO public.deletion_log (
      deleted_item_type,
      deleted_item_id,
      cascade_count,
      cascade_details
    ) VALUES (
      'course',
      OLD.id,
      (
        SELECT COUNT(*) FROM public.assignments WHERE course_id = OLD.id AND deleted_at IS NOT NULL
      ) + (
        SELECT COUNT(*) FROM public.lectures WHERE course_id = OLD.id AND deleted_at IS NOT NULL
      ),
      jsonb_build_object(
        'assignments_deleted', (
          SELECT COUNT(*) FROM public.assignments WHERE course_id = OLD.id AND deleted_at IS NOT NULL
        ),
        'lectures_deleted', (
          SELECT COUNT(*) FROM public.lectures WHERE course_id = OLD.id AND deleted_at IS NOT NULL
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle assignment deletion with proper cascade
CREATE OR REPLACE FUNCTION public.handle_assignment_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the assignment is being soft deleted
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Soft delete related reminders
    UPDATE public.reminders 
    SET deleted_at = NOW() 
    WHERE assignment_id = OLD.id AND deleted_at IS NULL;
    
    -- Log the cascade operation
    INSERT INTO public.deletion_log (
      deleted_item_type,
      deleted_item_id,
      cascade_count,
      cascade_details
    ) VALUES (
      'assignment',
      OLD.id,
      (SELECT COUNT(*) FROM public.reminders WHERE assignment_id = OLD.id AND deleted_at IS NOT NULL),
      jsonb_build_object(
        'reminders_deleted', (
          SELECT COUNT(*) FROM public.reminders WHERE assignment_id = OLD.id AND deleted_at IS NOT NULL
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle lecture deletion with proper cascade
CREATE OR REPLACE FUNCTION public.handle_lecture_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the lecture is being soft deleted
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Soft delete related reminders
    UPDATE public.reminders 
    SET deleted_at = NOW() 
    WHERE lecture_id = OLD.id AND deleted_at IS NULL;
    
    -- Log the cascade operation
    INSERT INTO public.deletion_log (
      deleted_item_type,
      deleted_item_id,
      cascade_count,
      cascade_details
    ) VALUES (
      'lecture',
      OLD.id,
      (SELECT COUNT(*) FROM public.reminders WHERE lecture_id = OLD.id AND deleted_at IS NOT NULL),
      jsonb_build_object(
        'reminders_deleted', (
          SELECT COUNT(*) FROM public.reminders WHERE lecture_id = OLD.id AND deleted_at IS NOT NULL
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle study session deletion with proper cascade
CREATE OR REPLACE FUNCTION public.handle_study_session_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the study session is being soft deleted
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Soft delete related reminders
    UPDATE public.reminders 
    SET deleted_at = NOW() 
    WHERE session_id = OLD.id AND deleted_at IS NULL;
    
    -- Log the cascade operation
    INSERT INTO public.deletion_log (
      deleted_item_type,
      deleted_item_id,
      cascade_count,
      cascade_details
    ) VALUES (
      'study_session',
      OLD.id,
      (SELECT COUNT(*) FROM public.reminders WHERE session_id = OLD.id AND deleted_at IS NOT NULL),
      jsonb_build_object(
        'reminders_deleted', (
          SELECT COUNT(*) FROM public.reminders WHERE session_id = OLD.id AND deleted_at IS NOT NULL
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DELETION LOG TABLE
-- ============================================================================

-- Create table to log cascade deletions
CREATE TABLE IF NOT EXISTS public.deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_item_type TEXT NOT NULL,
  deleted_item_id UUID NOT NULL,
  cascade_count INTEGER DEFAULT 0,
  cascade_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_deletion_log_type ON public.deletion_log(deleted_item_type);
CREATE INDEX IF NOT EXISTS idx_deletion_log_created_at ON public.deletion_log(created_at);

COMMENT ON TABLE public.deletion_log IS 'Logs cascade deletions for audit and monitoring purposes';

-- ============================================================================
-- CREATE CASCADE TRIGGERS
-- ============================================================================

-- Create triggers for application-level cascade handling
CREATE TRIGGER trigger_course_deletion_cascade
  AFTER UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_course_deletion();

CREATE TRIGGER trigger_assignment_deletion_cascade
  AFTER UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_assignment_deletion();

CREATE TRIGGER trigger_lecture_deletion_cascade
  AFTER UPDATE ON public.lectures
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_lecture_deletion();

CREATE TRIGGER trigger_study_session_deletion_cascade
  AFTER UPDATE ON public.study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_study_session_deletion();

-- ============================================================================
-- DATA INTEGRITY FUNCTIONS
-- ============================================================================

-- Function to check for orphaned records
CREATE OR REPLACE FUNCTION public.check_orphaned_records()
RETURNS TABLE(
  table_name TEXT,
  orphaned_count BIGINT,
  orphaned_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'assignments'::TEXT,
    COUNT(*),
    ARRAY_AGG(id)
  FROM public.assignments a
  WHERE a.course_id NOT IN (
    SELECT id FROM public.courses WHERE deleted_at IS NULL
  )
  AND a.deleted_at IS NULL
  
  UNION ALL
  
  SELECT 
    'lectures'::TEXT,
    COUNT(*),
    ARRAY_AGG(id)
  FROM public.lectures l
  WHERE l.course_id NOT IN (
    SELECT id FROM public.courses WHERE deleted_at IS NULL
  )
  AND l.deleted_at IS NULL
  
  UNION ALL
  
  SELECT 
    'reminders'::TEXT,
    COUNT(*),
    ARRAY_AGG(id)
  FROM public.reminders r
  WHERE (
    (r.assignment_id IS NOT NULL AND r.assignment_id NOT IN (
      SELECT id FROM public.assignments WHERE deleted_at IS NULL
    ))
    OR
    (r.lecture_id IS NOT NULL AND r.lecture_id NOT IN (
      SELECT id FROM public.lectures WHERE deleted_at IS NULL
    ))
    OR
    (r.session_id IS NOT NULL AND r.session_id NOT IN (
      SELECT id FROM public.study_sessions WHERE deleted_at IS NULL
    ))
  )
  AND r.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_orphaned_records() IS 'Checks for orphaned records that reference deleted items';

-- Function to repair orphaned records
CREATE OR REPLACE FUNCTION public.repair_orphaned_records()
RETURNS TABLE(
  table_name TEXT,
  repaired_count BIGINT
) AS $$
DECLARE
  repaired_assignments BIGINT := 0;
  repaired_lectures BIGINT := 0;
  repaired_reminders BIGINT := 0;
BEGIN
  -- Repair orphaned assignments by soft deleting them
  UPDATE public.assignments 
  SET deleted_at = NOW() 
  WHERE course_id NOT IN (
    SELECT id FROM public.courses WHERE deleted_at IS NULL
  )
  AND deleted_at IS NULL;
  
  GET DIAGNOSTICS repaired_assignments = ROW_COUNT;
  
  -- Repair orphaned lectures by soft deleting them
  UPDATE public.lectures 
  SET deleted_at = NOW() 
  WHERE course_id NOT IN (
    SELECT id FROM public.courses WHERE deleted_at IS NULL
  )
  AND deleted_at IS NULL;
  
  GET DIAGNOSTICS repaired_lectures = ROW_COUNT;
  
  -- Repair orphaned reminders by soft deleting them
  UPDATE public.reminders 
  SET deleted_at = NOW() 
  WHERE (
    (assignment_id IS NOT NULL AND assignment_id NOT IN (
      SELECT id FROM public.assignments WHERE deleted_at IS NULL
    ))
    OR
    (lecture_id IS NOT NULL AND lecture_id NOT IN (
      SELECT id FROM public.lectures WHERE deleted_at IS NULL
    ))
    OR
    (session_id IS NOT NULL AND session_id NOT IN (
      SELECT id FROM public.study_sessions WHERE deleted_at IS NULL
    ))
  )
  AND deleted_at IS NULL;
  
  GET DIAGNOSTICS repaired_reminders = ROW_COUNT;
  
  RETURN QUERY
  SELECT 'assignments'::TEXT, repaired_assignments
  UNION ALL
  SELECT 'lectures'::TEXT, repaired_lectures
  UNION ALL
  SELECT 'reminders'::TEXT, repaired_reminders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.repair_orphaned_records() IS 'Repairs orphaned records by soft deleting them';

-- ============================================================================
-- RELATIONSHIP VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate foreign key relationships
CREATE OR REPLACE FUNCTION public.validate_foreign_keys()
RETURNS TABLE(
  constraint_name TEXT,
  table_name TEXT,
  column_name TEXT,
  is_valid BOOLEAN,
  invalid_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'assignments_course_id_fkey'::TEXT,
    'assignments'::TEXT,
    'course_id'::TEXT,
    NOT EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.course_id NOT IN (
        SELECT id FROM public.courses
      )
    ),
    (
      SELECT COUNT(*) FROM public.assignments a
      WHERE a.course_id NOT IN (
        SELECT id FROM public.courses
      )
    )
  
  UNION ALL
  
  SELECT 
    'lectures_course_id_fkey'::TEXT,
    'lectures'::TEXT,
    'course_id'::TEXT,
    NOT EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.course_id NOT IN (
        SELECT id FROM public.courses
      )
    ),
    (
      SELECT COUNT(*) FROM public.lectures l
      WHERE l.course_id NOT IN (
        SELECT id FROM public.courses
      )
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.validate_foreign_keys() IS 'Validates foreign key relationships and reports any violations';

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Foreign key relationships simplified successfully';
  RAISE NOTICE 'Removed CASCADE deletes from all foreign key constraints';
  RAISE NOTICE 'Added application-level cascade handling with triggers';
  RAISE NOTICE 'Created deletion log table for audit trail';
  RAISE NOTICE 'Added data integrity validation functions';
  RAISE NOTICE 'Foreign key relationships now use soft delete cascade';
  RAISE NOTICE 'Better data integrity control with application-level handling';
END $$;
