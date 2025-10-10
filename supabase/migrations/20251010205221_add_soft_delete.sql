-- Soft Delete Implementation for Core Task Tables
-- This migration adds soft delete functionality to lectures, assignments, and study_sessions tables
-- by adding deleted_at columns and updating RLS policies to automatically hide soft-deleted items.

-- Step 1: Add the deleted_at column to all core task tables
ALTER TABLE public.lectures ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.assignments ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.study_sessions ADD COLUMN deleted_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.lectures.deleted_at IS 'Timestamp for soft deletion. NULL means active, non-NULL means soft-deleted.';
COMMENT ON COLUMN public.assignments.deleted_at IS 'Timestamp for soft deletion. NULL means active, non-NULL means soft-deleted.';
COMMENT ON COLUMN public.study_sessions.deleted_at IS 'Timestamp for soft deletion. NULL means active, non-NULL means soft-deleted.';

-- Step 2: Update RLS policies to automatically hide soft-deleted items
-- We will drop the existing policies and recreate them with the `deleted_at IS NULL` check.

-- For lectures
DROP POLICY IF EXISTS "Users can manage their own lectures" ON public.lectures;
CREATE POLICY "Users can view their own active lectures" ON public.lectures FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can insert their own lectures" ON public.lectures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own active lectures" ON public.lectures FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can delete their own active lectures" ON public.lectures FOR DELETE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- For assignments
DROP POLICY IF EXISTS "Users can manage their own assignments" ON public.assignments;
CREATE POLICY "Users can view their own active assignments" ON public.assignments FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can insert their own assignments" ON public.assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own active assignments" ON public.assignments FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can delete their own active assignments" ON public.assignments FOR DELETE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- For study_sessions
DROP POLICY IF EXISTS "Users can manage their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can view their own active study sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can insert their own study sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own active study sessions" ON public.study_sessions FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can delete their own active study sessions" ON public.study_sessions FOR DELETE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Step 3: Create indexes for efficient soft delete queries
-- These indexes will help with queries that need to filter by deletion status
CREATE INDEX idx_lectures_deleted_at ON public.lectures(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_assignments_deleted_at ON public.assignments(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_study_sessions_deleted_at ON public.study_sessions(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comments for the indexes
COMMENT ON INDEX idx_lectures_deleted_at IS 'Partial index for efficiently querying soft-deleted lectures.';
COMMENT ON INDEX idx_assignments_deleted_at IS 'Partial index for efficiently querying soft-deleted assignments.';
COMMENT ON INDEX idx_study_sessions_deleted_at IS 'Partial index for efficiently querying soft-deleted study sessions.';
