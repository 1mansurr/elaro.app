-- Performance Optimization: Add composite indexes for efficient task queries
-- This migration dramatically improves the performance of fetching tasks (lectures, assignments, study sessions)
-- by adding composite indexes on (user_id, date_column) for each table.
-- These indexes allow the database to instantly find all relevant tasks for a specific user within a date range,
-- making queries exponentially faster as the tables grow.

-- Index for efficiently fetching a user's lectures by date
-- This composite index optimizes queries like:
-- SELECT * FROM lectures WHERE user_id = ? AND start_time BETWEEN ? AND ?
CREATE INDEX idx_lectures_user_start_time ON public.lectures(user_id, start_time);

-- Index for efficiently fetching a user's assignments by date
-- This composite index optimizes queries like:
-- SELECT * FROM assignments WHERE user_id = ? AND due_date BETWEEN ? AND ?
CREATE INDEX idx_assignments_user_due_date ON public.assignments(user_id, due_date);

-- Index for efficiently fetching a user's study sessions by date
-- Note: An index on (user_id, session_date) is more efficient for our queries than two separate indexes.
-- We will drop the old single-column index on user_id for study_sessions to avoid redundancy.
DROP INDEX IF EXISTS idx_study_sessions_user_id;
CREATE INDEX idx_study_sessions_user_session_date ON public.study_sessions(user_id, session_date);

-- Add comments for documentation
COMMENT ON INDEX idx_lectures_user_start_time IS 'Improves performance of fetching lectures for a specific user within a date range. Optimizes queries filtering by user_id and start_time.';
COMMENT ON INDEX idx_assignments_user_due_date IS 'Improves performance of fetching assignments for a specific user within a date range. Optimizes queries filtering by user_id and due_date.';
COMMENT ON INDEX idx_study_sessions_user_session_date IS 'Improves performance of fetching study sessions for a specific user within a date range. Optimizes queries filtering by user_id and session_date.';
