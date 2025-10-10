-- Reminders Cleanup Performance Optimization
-- This migration adds a partial, composite index specifically designed to make the
-- cleanup-old-reminders cron job extremely efficient, even with millions of rows.

-- The index strategy:
-- 1. COMPOSITE: (completed, created_at) - allows efficient filtering by completion status and date
-- 2. PARTIAL: WHERE completed = true - only indexes completed reminders, keeping active data fast
-- 3. OPTIMIZED: Separates "hot" (active) data from "cold" (completed) data for cleanup

-- This partial, composite index is specifically designed to make the
-- cleanup-old-reminders cron job extremely efficient. It only indexes
-- rows that are already marked as completed, keeping the main table fast
-- for active reminders.

CREATE INDEX idx_reminders_completed_created_at
ON public.reminders(completed, created_at)
WHERE completed = true;

-- Add comprehensive documentation
COMMENT ON INDEX idx_reminders_completed_created_at IS 'Partial composite index for efficient cleanup of old completed reminders. Optimizes queries like DELETE FROM reminders WHERE completed = true AND created_at < cutoff_date. Only indexes completed reminders to avoid performance impact on active reminder queries.';
