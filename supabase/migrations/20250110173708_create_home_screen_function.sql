-- Create the get_home_screen_data_for_user SQL function
-- This function consolidates multiple queries into a single efficient database call
-- to solve the N+1 query problem in the home screen data fetching

-- This function fetches all necessary data for the home screen in a single query.
CREATE OR REPLACE FUNCTION get_home_screen_data_for_user(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  upcoming_tasks JSONB;
  recent_courses JSONB;
  result JSONB;
BEGIN
  -- 1. Get the next 5 upcoming tasks (lectures, assignments, study sessions)
  WITH all_tasks AS (
    -- Lectures
    SELECT
      id,
      'lecture' AS type,
      lecture_name AS title,
      start_time,
      end_time,
      course_id
    FROM lectures
    WHERE user_id = p_user_id AND start_time > NOW()

    UNION ALL

    -- Assignments
    SELECT
      id,
      'assignment' AS type,
      title,
      due_date AS start_time,
      NULL AS end_time,
      course_id
    FROM assignments
    WHERE user_id = p_user_id AND due_date > NOW()

    UNION ALL

    -- Study Sessions
    SELECT
      id,
      'study_session' AS type,
      topic AS title,
      session_date AS start_time,
      NULL AS end_time,
      course_id
    FROM study_sessions
    WHERE user_id = p_user_id AND session_date > NOW()
  )
  SELECT jsonb_agg(t)
  INTO upcoming_tasks
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
    LIMIT 5
  ) t;

  -- 2. Get the 4 most recently updated courses
  SELECT jsonb_agg(rc)
  INTO recent_courses
  FROM (
    SELECT id, course_name, course_code, updated_at
    FROM courses
    WHERE user_id = p_user_id AND deleted_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 4
  ) rc;

  -- 3. Combine results into a single JSON object
  result := jsonb_build_object(
    'upcomingTasks', COALESCE(upcoming_tasks, '[]'::jsonb),
    'recentCourses', COALESCE(recent_courses, '[]'::jsonb)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;
