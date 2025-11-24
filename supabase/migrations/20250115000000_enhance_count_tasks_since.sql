-- Enhance count_tasks_since to exclude soft-deleted tasks (5-minute grace period)
-- This ensures tasks deleted within 5 minutes of creation don't count toward limits
-- Part of Launch Readiness Fix Plan - Issue #2

CREATE OR REPLACE FUNCTION "public"."count_tasks_since"("since_date" timestamp with time zone) 
RETURNS integer
LANGUAGE "plpgsql"
AS $$
DECLARE
  total_count integer;
BEGIN
  SELECT (
    -- Count assignments (exclude if deleted within 5 mins of creation)
    (SELECT count(*) 
     FROM public.assignments 
     WHERE user_id = auth.uid() 
       AND created_at >= since_date
       AND (deleted_at IS NULL 
            OR deleted_at > created_at + INTERVAL '5 minutes')) +
    -- Count lectures
    (SELECT count(*) 
     FROM public.lectures 
     WHERE user_id = auth.uid() 
       AND created_at >= since_date
       AND (deleted_at IS NULL 
            OR deleted_at > created_at + INTERVAL '5 minutes')) +
    -- Count study sessions
    (SELECT count(*) 
     FROM public.study_sessions 
     WHERE user_id = auth.uid() 
       AND created_at >= since_date
       AND (deleted_at IS NULL 
            OR deleted_at > created_at + INTERVAL '5 minutes'))
  ) INTO total_count;
  
  RETURN total_count;
END;
$$;

COMMENT ON FUNCTION "public"."count_tasks_since" IS 'Counts tasks created since given date, excluding tasks deleted within 5 minutes of creation (soft delete grace period). Used for enforcing subscription tier task limits.';





