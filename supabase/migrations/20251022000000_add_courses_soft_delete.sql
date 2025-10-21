-- Add soft delete support to courses table
-- This brings courses table in line with assignments, lectures, and study_sessions

-- Add the deleted_at column
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.courses.deleted_at IS 'Timestamp for soft deletion. NULL means active, non-NULL means soft-deleted.';

-- Add partial index for efficient querying of soft-deleted courses
CREATE INDEX IF NOT EXISTS idx_courses_deleted_at 
ON public.courses(deleted_at) 
WHERE deleted_at IS NOT NULL;

COMMENT ON INDEX idx_courses_deleted_at IS 'Partial index for efficiently querying soft-deleted courses.';

-- Update existing RLS policies to respect soft delete
-- Drop old SELECT policy and recreate with deleted_at check
DROP POLICY IF EXISTS "Users can view their own accessible courses" ON public.courses;

CREATE POLICY "Users can view their own accessible courses" 
ON public.courses 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND deleted_at IS NULL 
  AND id IN (
    SELECT id 
    FROM public.get_accessible_item_ids(auth.uid(), 'courses', 2)
  )
);

-- Update course-related policies
DROP POLICY IF EXISTS "Users can view courses based on their role" ON public.courses;

CREATE POLICY "Users can view courses based on their role" 
ON public.courses 
FOR SELECT 
USING (
  (auth.uid() = user_id AND deleted_at IS NULL) 
  OR (
    SELECT role FROM public.users WHERE id = auth.uid()
  ) = 'admin'
);

-- Update delete policy to set deleted_at instead of hard delete
DROP POLICY IF EXISTS "Users can delete their own accessible courses" ON public.courses;

CREATE POLICY "Users can soft delete their own accessible courses" 
ON public.courses 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND id IN (
    SELECT id 
    FROM public.get_accessible_item_ids(auth.uid(), 'courses', 2)
  )
);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Courses table soft delete support added successfully';
END $$;

