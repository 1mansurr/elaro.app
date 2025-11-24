-- Fix get_home_screen_data_for_user to return correct structure matching HomeScreenData interface
-- This migration updates the RPC function to return:
-- - nextUpcomingTask: Single task object or null (instead of upcomingTasks array)
-- - todayOverview: Object with counts for today (lectures, studySessions, assignments, reviews)
-- - monthlyTaskCount: Count of tasks created in last 30 days

CREATE OR REPLACE FUNCTION "public"."get_home_screen_data_for_user"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  next_upcoming_task JSONB;
  today_overview JSONB;
  monthly_task_count INTEGER;
  today_start TIMESTAMP;
  today_end TIMESTAMP;
  month_start TIMESTAMP;
BEGIN
  -- Set date ranges
  today_start := DATE_TRUNC('day', NOW());
  today_end := today_start + INTERVAL '1 day';
  month_start := NOW() - INTERVAL '30 days';

  -- 1. Get the next upcoming task (single task, not array)
  WITH all_tasks AS (
    -- Lectures
    SELECT
      id,
      'lecture' AS type,
      lecture_name AS title,
      start_time,
      end_time,
      course_id,
      created_at
    FROM lectures
    WHERE user_id = p_user_id 
      AND deleted_at IS NULL
      AND start_time > NOW()

    UNION ALL

    -- Assignments
    SELECT
      id,
      'assignment' AS type,
      title,
      due_date AS start_time,
      NULL AS end_time,
      course_id,
      created_at
    FROM assignments
    WHERE user_id = p_user_id 
      AND deleted_at IS NULL
      AND due_date > NOW()

    UNION ALL

    -- Study Sessions
    SELECT
      id,
      'study_session' AS type,
      topic AS title,
      session_date AS start_time,
      NULL AS end_time,
      course_id,
      created_at
    FROM study_sessions
    WHERE user_id = p_user_id 
      AND deleted_at IS NULL
      AND session_date > NOW()
  )
  SELECT to_jsonb(t)
  INTO next_upcoming_task
  FROM (
    SELECT
      t.id,
      t.type,
      t.title,
      t.start_time,
      t.end_time,
      c.course_name,
      c.course_code
    FROM all_tasks t
    JOIN courses c ON t.course_id = c.id
    ORDER BY t.start_time ASC
    LIMIT 1
  ) t;

  -- 2. Calculate today's overview (counts for today)
  SELECT jsonb_build_object(
    'lectures', COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM lectures
      WHERE user_id = p_user_id
        AND deleted_at IS NULL
        AND DATE(start_time) = DATE(NOW())
    ), 0),
    'studySessions', COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM study_sessions
      WHERE user_id = p_user_id
        AND deleted_at IS NULL
        AND DATE(session_date) = DATE(NOW())
    ), 0),
    'assignments', COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM assignments
      WHERE user_id = p_user_id
        AND deleted_at IS NULL
        AND DATE(due_date) = DATE(NOW())
    ), 0),
    'reviews', 0  -- SRS reviews can be calculated separately if needed
  ) INTO today_overview;

  -- 3. Calculate monthly task count (tasks created in last 30 days)
  SELECT COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM (
      SELECT id FROM lectures
      WHERE user_id = p_user_id AND created_at >= month_start
      UNION ALL
      SELECT id FROM assignments
      WHERE user_id = p_user_id AND created_at >= month_start
      UNION ALL
      SELECT id FROM study_sessions
      WHERE user_id = p_user_id AND created_at >= month_start
    ) monthly_tasks
  ), 0) INTO monthly_task_count;

  -- 4. Return the correct structure matching HomeScreenData interface
  RETURN jsonb_build_object(
    'nextUpcomingTask', COALESCE(next_upcoming_task, NULL::jsonb),
    'todayOverview', COALESCE(today_overview, jsonb_build_object(
      'lectures', 0,
      'studySessions', 0,
      'assignments', 0,
      'reviews', 0
    )),
    'monthlyTaskCount', monthly_task_count
  );
END;
$$;

