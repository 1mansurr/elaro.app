-- FILE: supabase/migrations/20250115160000_create_count_tasks_rpc.sql
CREATE OR REPLACE FUNCTION count_tasks_since(since_date timestamptz)
RETURNS integer AS $$
DECLARE
  total_count integer;
BEGIN
  SELECT (
    (SELECT count(*) FROM public.lectures WHERE user_id = auth.uid() AND created_at >= since_date) +
    (SELECT count(*) FROM public.study_sessions WHERE user_id = auth.uid() AND created_at >= since_date) +
    (SELECT count(*) FROM public.assignments WHERE user_id = auth.uid() AND created_at >= since_date)
  ) INTO total_count;
  
  RETURN total_count;
END;
$$ LANGUAGE plpgsql;
