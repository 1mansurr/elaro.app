

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."can_create_srs_reminders"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  subscription_tier TEXT;
  srs_count INT;
  srs_limit INT;
BEGIN
  -- Get the user's subscription tier
  SELECT u.subscription_tier INTO subscription_tier
  FROM public.users u
  WHERE u.id = p_user_id;

  -- Set monthly SRS limits based on subscription tier
  IF subscription_tier = 'free' THEN
    srs_limit := 15; -- 15 SRS reminders per month for free users
  ELSIF subscription_tier = 'oddity' THEN
    srs_limit := 70; -- 70 SRS reminders per month for oddity users
  ELSE
    srs_limit := 15; -- Default to free limit if tier is unknown
  END IF;

  -- Count SRS reminders created in the last 30 days
  SELECT COUNT(*) INTO srs_count
  FROM public.reminders
  WHERE user_id = p_user_id 
    AND reminder_type = 'spaced_repetition'
    AND created_at >= NOW() - INTERVAL '30 days';

  -- Return true if under limit
  RETURN srs_count < srs_limit;
END;
$$;


ALTER FUNCTION "public"."can_create_srs_reminders"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_create_srs_reminders"("p_user_id" "uuid") IS 'Checks if a user is allowed to create SRS reminders based on their subscription tier and monthly activity limits.';



CREATE OR REPLACE FUNCTION "public"."can_create_task"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  subscription_tier TEXT;
  task_count INT;
  task_limit INT;
BEGIN
  -- Get the user's subscription tier
  SELECT u.subscription_tier INTO subscription_tier
  FROM public.users u
  WHERE u.id = p_user_id;

  -- Set monthly limits based on subscription tier
  IF subscription_tier = 'free' THEN
    task_limit := 15; -- 15 tasks per month for free users
  ELSIF subscription_tier = 'oddity' THEN
    task_limit := 70; -- 70 tasks per month for oddity users
  ELSE
    task_limit := 15; -- Default to free limit if tier is unknown
  END IF;

  -- Count tasks created in the last 30 days
  SELECT COUNT(*) INTO task_count
  FROM (
    SELECT created_at FROM public.assignments WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '30 days'
    UNION ALL
    SELECT created_at FROM public.lectures WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '30 days'
    UNION ALL
    SELECT created_at FROM public.study_sessions WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '30 days'
  ) AS recent_tasks;

  -- Return true if under limit
  RETURN task_count < task_limit;
END;
$$;


ALTER FUNCTION "public"."can_create_task"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_create_task"("p_user_id" "uuid") IS 'Checks if a user is allowed to create a new task based on their subscription tier and monthly activity limits.';



CREATE OR REPLACE FUNCTION "public"."check_and_send_reminders"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- SECURITY NOTE: This function is deprecated and disabled for security reasons.
  -- The original implementation contained hardcoded service role keys which is a security risk.
  -- 
  -- All reminder processing should use the Edge Function 'process-due-reminders' instead,
  -- which properly accesses the service role key via environment variables:
  --   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  --
  -- The service role key should be set as an Edge Function secret in Supabase Dashboard:
  --   Dashboard → Edge Functions → Secrets → Add: SUPABASE_SERVICE_ROLE_KEY
  --
  -- This function is kept as a stub to prevent breaking any potential callers.
  -- Migration 20251101000000_remove_leaked_service_key_from_db.sql already disabled this function.
  
  RAISE NOTICE 'check_and_send_reminders() is deprecated. Use Edge Function process-due-reminders instead.';
  -- Function intentionally does nothing
END;
$$;


ALTER FUNCTION "public"."check_and_send_reminders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_tasks_since"("since_date" timestamp with time zone) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."count_tasks_since"("since_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_course_and_lectures_transaction"("p_user_id" "uuid", "p_course_name" "text", "p_course_description" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_recurrence_type" "text", "p_reminders" integer[]) RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_course_id uuid;
    new_lecture_id uuid;
    lecture_duration interval;
    current_lecture_start timestamptz;
    current_lecture_end timestamptz;
    reminder_time integer;
BEGIN
    -- 1. Create the Course
    INSERT INTO public.courses (user_id, course_name, about_course)
    VALUES (p_user_id, p_course_name, p_course_description)
    RETURNING id INTO new_course_id;

    lecture_duration := p_end_time - p_start_time;

    -- 2. Create the initial Lecture(s)
    IF p_recurrence_type = 'none' THEN
        -- Create a single lecture
        INSERT INTO public.lectures (user_id, course_id, lecture_name, start_time, end_time)
        VALUES (p_user_id, new_course_id, p_course_name, p_start_time, p_end_time)
        RETURNING id INTO new_lecture_id;

        -- Schedule reminders for the single lecture
        FOREACH reminder_time IN ARRAY p_reminders
        LOOP
            INSERT INTO public.reminders (user_id, lecture_id, reminder_time)
            VALUES (p_user_id, new_lecture_id, p_start_time - (reminder_time * interval '1 minute'));
        END LOOP;
    ELSE
        -- Create recurring lectures for the next 16 weeks (e.g., a semester)
        FOR i IN 0..15 LOOP
            IF p_recurrence_type = 'weekly' THEN
                current_lecture_start := p_start_time + (i * interval '1 week');
            ELSIF p_recurrence_type = 'bi-weekly' THEN
                current_lecture_start := p_start_time + (i * interval '2 weeks');
            END IF;
            
            current_lecture_end := current_lecture_start + lecture_duration;

            INSERT INTO public.lectures (user_id, course_id, lecture_name, start_time, end_time)
            VALUES (p_user_id, new_course_id, p_course_name, current_lecture_start, current_lecture_end)
            RETURNING id INTO new_lecture_id;

            -- Schedule reminders for each recurring lecture
            FOREACH reminder_time IN ARRAY p_reminders
            LOOP
                INSERT INTO public.reminders (user_id, lecture_id, reminder_time)
                VALUES (p_user_id, new_lecture_id, current_lecture_start - (reminder_time * interval '1 minute'));
            END LOOP;
        END LOOP;
    END IF;

    RETURN json_build_object('course_id', new_course_id);
END;
$$;


ALTER FUNCTION "public"."create_course_and_lectures_transaction"("p_user_id" "uuid", "p_course_name" "text", "p_course_description" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_recurrence_type" "text", "p_reminders" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_course_and_lectures_transaction"("p_user_id" "uuid", "p_course_name" "text", "p_course_code" "text", "p_course_description" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_recurrence_type" "text", "p_reminders" integer[]) RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_course_id uuid;
    new_lecture_id uuid;
    lecture_duration interval;
    current_lecture_start timestamptz;
    current_lecture_end timestamptz;
    reminder_time integer;
BEGIN
    -- 1. Create the Course
    INSERT INTO public.courses (user_id, course_name, course_code, about_course)
    VALUES (p_user_id, p_course_name, p_course_code, p_course_description)
    RETURNING id INTO new_course_id;

    lecture_duration := p_end_time - p_start_time;

    -- 2. Create the initial Lecture(s)
    IF p_recurrence_type = 'none' THEN
        -- Create a single lecture
        INSERT INTO public.lectures (user_id, course_id, lecture_name, start_time, end_time)
        VALUES (p_user_id, new_course_id, p_course_name, p_start_time, p_end_time)
        RETURNING id INTO new_lecture_id;

        -- Schedule reminders for the single lecture
        FOREACH reminder_time IN ARRAY p_reminders
        LOOP
            INSERT INTO public.reminders (user_id, lecture_id, reminder_time)
            VALUES (p_user_id, new_lecture_id, p_start_time - (reminder_time * interval '1 minute'));
        END LOOP;
    ELSE
        -- Create recurring lectures for the next 16 weeks (e.g., a semester)
        FOR i IN 0..15 LOOP
            IF p_recurrence_type = 'weekly' THEN
                current_lecture_start := p_start_time + (i * interval '1 week');
            ELSIF p_recurrence_type = 'bi-weekly' THEN
                current_lecture_start := p_start_time + (i * interval '2 weeks');
            END IF;
            
            current_lecture_end := current_lecture_start + lecture_duration;

            INSERT INTO public.lectures (user_id, course_id, lecture_name, start_time, end_time)
            VALUES (p_user_id, new_course_id, p_course_name, current_lecture_start, current_lecture_end)
            RETURNING id INTO new_lecture_id;

            -- Schedule reminders for each recurring lecture
            FOREACH reminder_time IN ARRAY p_reminders
            LOOP
                INSERT INTO public.reminders (user_id, lecture_id, reminder_time)
                VALUES (p_user_id, new_lecture_id, current_lecture_start - (reminder_time * interval '1 minute'));
            END LOOP;
        END LOOP;
    END IF;

    RETURN json_build_object('course_id', new_course_id);
END;
$$;


ALTER FUNCTION "public"."create_course_and_lectures_transaction"("p_user_id" "uuid", "p_course_name" "text", "p_course_code" "text", "p_course_description" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_recurrence_type" "text", "p_reminders" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accessible_item_ids"("p_user_id" "uuid", "p_table_name" "text", "p_free_limit" integer) RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  user_tier TEXT;
BEGIN
  -- Get the user's subscription tier.
  SELECT subscription_tier INTO user_tier
  FROM public.users
  WHERE users.id = p_user_id;

  -- Return all items for 'oddity' users, or limited items for 'free' users.
  IF user_tier = 'oddity' THEN
    RETURN QUERY EXECUTE format(
      'SELECT item.id FROM %I AS item WHERE item.user_id = $1 AND item.deleted_at IS NULL ORDER BY item.created_at DESC',
      p_table_name
    ) USING p_user_id;
  ELSE
    RETURN QUERY EXECUTE format(
      'SELECT item.id FROM %I AS item WHERE item.user_id = $1 AND item.deleted_at IS NULL ORDER BY item.created_at DESC LIMIT $2',
      p_table_name
    ) USING p_user_id, p_free_limit;
  END IF;
END;
$_$;


ALTER FUNCTION "public"."get_accessible_item_ids"("p_user_id" "uuid", "p_table_name" "text", "p_free_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_home_screen_data_for_user"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_home_screen_data_for_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- First, insert the user into the public.users table as before.
  INSERT INTO public.users (id, email, first_name, last_name, subscription_tier, onboarding_completed, marketing_opt_in, date_of_birth)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'free',
    false,
    false, -- Assuming marketing_opt_in defaults to false
    NULL   -- Assuming date_of_birth is not collected at sign-up
  );

  -- Next, insert default notification preferences.
  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id);

  -- Asynchronously trigger the welcome email Edge Function.
  -- This uses pg_net to make a non-blocking HTTP request.
  PERFORM net.http_post(
    url:= secrets.get('SUPABASE_URL' ) || '/functions/v1/send-welcome-email',
    headers:= '{"Content-Type": "application/json", "Authorization": "Bearer ' || secrets.get('SUPABASE_SERVICE_ROLE_KEY') || '"}'::jsonb,
    body:= jsonb_build_object(
      'userEmail', new.email,
      'userFirstName', COALESCE(new.raw_user_meta_data->>'first_name', 'there'),
      'userId', new.id
    )
  );

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Creates a user, sets default preferences, and triggers a welcome email.';



CREATE OR REPLACE FUNCTION "public"."schedule_daily_cleanup"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  -- Perform an HTTP request to our Edge Function
  SELECT net.http_post(
    -- The URL of the Edge Function to call
    url:= secrets.get('SUPABASE_URL') || '/functions/v1/cleanup-old-reminders',
    -- The headers for the request
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer DailyCleanupJobSecret@249&%'
     ),
    -- The body of the request (can be empty for this job)
    body:=jsonb_build_object('message', 'daily cleanup job')
  );
END;$$;


ALTER FUNCTION "public"."schedule_daily_cleanup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_streak"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_id_input UUID := NEW.user_id; -- Get the user ID from the NEW record
    last_activity_date DATE;
    streak_row public.streaks;
BEGIN
    -- Find the user's streak record
    SELECT * INTO streak_row FROM public.streaks WHERE user_id = user_id_input;
    
    -- If the user has no streak record yet, create one.
    IF streak_row IS NULL THEN
        INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_activity_date)
        VALUES (user_id_input, 1, 1, CURRENT_DATE);
        RETURN NEW;
    END IF;
    
    -- Get the date of the last activity
    last_activity_date := streak_row.last_activity_date;
    
    -- Case 1: User was active yesterday. Increment the streak.
    IF last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN
        UPDATE public.streaks
        SET current_streak = streak_row.current_streak + 1,
            longest_streak = GREATEST(streak_row.longest_streak, streak_row.current_streak + 1),
            last_activity_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE user_id = user_id_input;
    
    -- Case 2: User was already active today. Do nothing.
    ELSIF last_activity_date = CURRENT_DATE THEN
        -- Do nothing, streak is already up-to-date for today.
        RETURN NEW;
    
    -- Case 3: User missed a day. Reset the streak to 1.
    ELSE
        UPDATE public.streaks
        SET current_streak = 1,
            last_activity_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE user_id = user_id_input;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_streak"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_streak"("user_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  last_activity DATE;
  current_streak_count INTEGER;
BEGIN
  -- Get current streak info
  SELECT last_activity_date, current_streak 
  INTO last_activity, current_streak_count
  FROM public.streaks 
  WHERE user_id = user_uuid;
  
  -- If no activity recorded yet
  IF last_activity IS NULL THEN
    UPDATE public.streaks 
    SET current_streak = 1, 
        longest_streak = GREATEST(longest_streak, 1),
        last_activity_date = today_date,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    RETURN;
  END IF;
  
  -- If activity is today, do nothing
  IF last_activity = today_date THEN
    RETURN;
  END IF;
  
  -- If activity was yesterday, increment streak
  IF last_activity = today_date - INTERVAL '1 day' THEN
    UPDATE public.streaks 
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = today_date,
        updated_at = NOW()
    WHERE user_id = user_uuid;
  ELSE
    -- Streak broken, reset to 1
    UPDATE public.streaks 
    SET current_streak = 1,
        longest_streak = GREATEST(longest_streak, 1),
        last_activity_date = today_date,
        updated_at = NOW()
    WHERE user_id = user_uuid;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_user_streak"("user_uuid" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "admin_notes" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "submission_method" "text",
    "submission_link" "text",
    "due_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."assignments" IS 'Stores user-created assignments.';



COMMENT ON COLUMN "public"."assignments"."deleted_at" IS 'Timestamp for soft deletion. NULL means active, non-NULL means soft-deleted.';



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_name" "text" NOT NULL,
    "course_code" "text",
    "about_course" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."courses"."course_name" IS 'The name or title of the course.';



COMMENT ON COLUMN "public"."courses"."course_code" IS 'The official code for the course (e.g., CS101), optional.';



COMMENT ON COLUMN "public"."courses"."about_course" IS 'A brief description or notes about the course, optional.';



CREATE TABLE IF NOT EXISTS "public"."lectures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "lecture_date" timestamp with time zone NOT NULL,
    "is_recurring" boolean DEFAULT false NOT NULL,
    "recurring_pattern" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_time" timestamp with time zone,
    "description" "text",
    "start_time" timestamp with time zone,
    "lecture_name" "text",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."lectures" OWNER TO "postgres";


COMMENT ON TABLE "public"."lectures" IS 'Stores scheduled lecture sessions for courses.';



COMMENT ON COLUMN "public"."lectures"."start_time" IS 'The specific start date and time of the lecture.';



COMMENT ON COLUMN "public"."lectures"."lecture_name" IS 'The name of the lecture, e.g., "Introduction to Psychology Lecture".';



COMMENT ON COLUMN "public"."lectures"."deleted_at" IS 'Timestamp for soft deletion. NULL means active, non-NULL means soft-deleted.';



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "reminders_enabled" boolean DEFAULT true NOT NULL,
    "srs_reminders_enabled" boolean DEFAULT true NOT NULL,
    "assignment_reminders_enabled" boolean DEFAULT true NOT NULL,
    "lecture_reminders_enabled" boolean DEFAULT true NOT NULL,
    "morning_summary_enabled" boolean DEFAULT true NOT NULL,
    "evening_capture_enabled" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_preferences" IS 'Stores user-specific settings for all notification types. Single source of truth for notification preferences.';



COMMENT ON COLUMN "public"."notification_preferences"."reminders_enabled" IS 'Master switch for all reminder notifications.';



COMMENT ON COLUMN "public"."notification_preferences"."srs_reminders_enabled" IS 'Controls Spaced Repetition System reminder notifications.';



COMMENT ON COLUMN "public"."notification_preferences"."assignment_reminders_enabled" IS 'Controls assignment reminder notifications.';



COMMENT ON COLUMN "public"."notification_preferences"."lecture_reminders_enabled" IS 'Controls lecture reminder notifications.';



COMMENT ON COLUMN "public"."notification_preferences"."morning_summary_enabled" IS 'Controls daily morning summary notifications.';



COMMENT ON COLUMN "public"."notification_preferences"."evening_capture_enabled" IS 'Controls evening assignment capture notifications.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "full_name" "text",
    "avatar_url" "text",
    "push_token" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid",
    "day_number" integer NOT NULL,
    "completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "lecture_id" "uuid",
    "assignment_id" "uuid",
    "reminder_time" timestamp with time zone,
    "reminder_type" "text" DEFAULT 'study_session'::"text",
    "title" "text",
    "body" "text",
    "processed_at" timestamp with time zone,
    CONSTRAINT "reminders_reminder_type_check" CHECK (("reminder_type" = ANY (ARRAY['study_session'::"text", 'lecture'::"text", 'assignment'::"text", 'spaced_repetition'::"text"])))
);


ALTER TABLE "public"."reminders" OWNER TO "postgres";


COMMENT ON TABLE "public"."reminders" IS 'Reminders for various tasks. Standardized on reminder_time column.';



COMMENT ON COLUMN "public"."reminders"."reminder_type" IS 'Type of reminder: study_session, lecture, assignment, or spaced_repetition';



COMMENT ON COLUMN "public"."reminders"."title" IS 'Title of the push notification to be sent';



COMMENT ON COLUMN "public"."reminders"."body" IS 'Body text of the push notification to be sent';



COMMENT ON COLUMN "public"."reminders"."processed_at" IS 'Timestamp of when the reminder was processed by the job queue.';



CREATE TABLE IF NOT EXISTS "public"."srs_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "intervals" integer[] NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tier_restriction" "text",
    CONSTRAINT "srs_schedules_tier_restriction_check" CHECK (("tier_restriction" = ANY (ARRAY['free'::"text", 'oddity'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."srs_schedules" OWNER TO "postgres";


COMMENT ON TABLE "public"."srs_schedules" IS 'Stores different schedules for the Spaced Repetition System.';



COMMENT ON COLUMN "public"."srs_schedules"."intervals" IS 'Array of integers representing the reminder interval in days.';



COMMENT ON COLUMN "public"."srs_schedules"."is_default" IS 'Indicates which schedule should be used by default for new study sessions.';



COMMENT ON COLUMN "public"."srs_schedules"."tier_restriction" IS 'Subscription tier restriction: free, oddity, or both';



CREATE TABLE IF NOT EXISTS "public"."streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_activity_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "topic" "text" NOT NULL,
    "description" "text",
    "session_date" timestamp with time zone NOT NULL,
    "has_spaced_repetition" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."study_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."study_sessions" IS 'Stores user-created study sessions for specific topics.';



COMMENT ON COLUMN "public"."study_sessions"."deleted_at" IS 'Timestamp for soft deletion. NULL means active, non-NULL means soft-deleted.';



CREATE TABLE IF NOT EXISTS "public"."tasks_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "type" "text" NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "color_label" "text" DEFAULT 'blue'::"text",
    "repeat_pattern" "text",
    "repeat_end_date" timestamp with time zone,
    "completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tasks_events_type_check" CHECK (("type" = ANY (ARRAY['assignment'::"text", 'exam'::"text", 'lecture'::"text", 'program'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."tasks_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "push_token" "text" NOT NULL,
    "platform" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "subscription_expires_at" timestamp with time zone,
    "subscription_tier" "text" DEFAULT 'free'::"text",
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "first_name" "text",
    "username" "text",
    "last_name" "text",
    "university" "text",
    "program" "text",
    "country" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "account_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "deleted_at" timestamp with time zone,
    "deletion_scheduled_at" timestamp with time zone,
    "suspension_end_date" timestamp with time zone,
    "last_data_export_at" timestamp with time zone,
    "date_of_birth" "date",
    "marketing_opt_in" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_account_status_check" CHECK (("account_status" = ANY (ARRAY['active'::"text", 'deleted'::"text", 'suspended'::"text"]))),
    CONSTRAINT "users_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'oddity'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'User profile data. Notification preferences moved to notification_preferences table.';



COMMENT ON COLUMN "public"."users"."subscription_expires_at" IS 'When the subscription expires (NULL for free tier)';



COMMENT ON COLUMN "public"."users"."subscription_tier" IS 'Subscription tier: free or oddity';



COMMENT ON COLUMN "public"."users"."onboarding_completed" IS 'Tracks whether the user has completed the onboarding flow';



COMMENT ON COLUMN "public"."users"."country" IS 'The user''s country, selected during onboarding.';



COMMENT ON COLUMN "public"."users"."role" IS 'The role of the user (e.g., user, admin).';



COMMENT ON COLUMN "public"."users"."account_status" IS 'Account status: active, deleted (soft delete), suspended';



COMMENT ON COLUMN "public"."users"."deleted_at" IS 'When the account was soft deleted (NULL for active accounts)';



COMMENT ON COLUMN "public"."users"."deletion_scheduled_at" IS 'When the account deletion was initiated (for 7-day retention)';



COMMENT ON COLUMN "public"."users"."suspension_end_date" IS 'When the account suspension ends (NULL for indefinite or active accounts)';



COMMENT ON COLUMN "public"."users"."last_data_export_at" IS 'Timestamp of the last data export request. Used for rate limiting (once per week).';



COMMENT ON COLUMN "public"."users"."date_of_birth" IS 'User date of birth for age verification and parental consent compliance. Stored as plain DATE for age calculation queries.';



COMMENT ON COLUMN "public"."users"."marketing_opt_in" IS 'User consent to receive marketing communications. Defaults to false (explicit opt-in required).';



-- Conditionally add primary key and unique constraints
DO $$
BEGIN
    -- Primary keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_actions_pkey') THEN
        ALTER TABLE ONLY "public"."admin_actions" ADD CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_pkey') THEN
        ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_pkey') THEN
        ALTER TABLE ONLY "public"."courses" ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lectures_pkey') THEN
        ALTER TABLE ONLY "public"."lectures" ADD CONSTRAINT "lectures_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_pkey') THEN
        ALTER TABLE ONLY "public"."notification_preferences" ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_pkey') THEN
        ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_pkey') THEN
        ALTER TABLE ONLY "public"."reminders" ADD CONSTRAINT "reminders_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'srs_schedules_name_key') THEN
        ALTER TABLE ONLY "public"."srs_schedules" ADD CONSTRAINT "srs_schedules_name_key" UNIQUE ("name");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'srs_schedules_pkey') THEN
        ALTER TABLE ONLY "public"."srs_schedules" ADD CONSTRAINT "srs_schedules_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'streaks_pkey') THEN
        ALTER TABLE ONLY "public"."streaks" ADD CONSTRAINT "streaks_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'study_sessions_pkey') THEN
        ALTER TABLE ONLY "public"."study_sessions" ADD CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_events_pkey') THEN
        ALTER TABLE ONLY "public"."tasks_events" ADD CONSTRAINT "tasks_events_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_devices_pkey') THEN
        ALTER TABLE ONLY "public"."user_devices" ADD CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_devices_user_id_platform_key') THEN
        ALTER TABLE ONLY "public"."user_devices" ADD CONSTRAINT "user_devices_user_id_platform_key" UNIQUE ("user_id", "platform");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey') THEN
        ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN
        ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_username_key" UNIQUE ("username");
    END IF;
END $$;



CREATE INDEX IF NOT EXISTS "idx_admin_actions_action" ON "public"."admin_actions" USING "btree" ("action");



CREATE INDEX IF NOT EXISTS "idx_admin_actions_admin_id" ON "public"."admin_actions" USING "btree" ("admin_id");



CREATE INDEX IF NOT EXISTS "idx_admin_actions_created_at" ON "public"."admin_actions" USING "btree" ("created_at");



CREATE INDEX IF NOT EXISTS "idx_admin_actions_target_user_id" ON "public"."admin_actions" USING "btree" ("target_user_id");



CREATE INDEX IF NOT EXISTS "idx_assignments_deleted_at" ON "public"."assignments" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



COMMENT ON INDEX "public"."idx_assignments_deleted_at" IS 'Partial index for efficiently querying soft-deleted assignments.';



CREATE INDEX IF NOT EXISTS "idx_assignments_user_created" ON "public"."assignments" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_assignments_user_due_date" ON "public"."assignments" USING "btree" ("user_id", "due_date");



COMMENT ON INDEX "public"."idx_assignments_user_due_date" IS 'Improves performance of fetching assignments for a specific user within a date range. Optimizes queries filtering by user_id and due_date.';



CREATE INDEX IF NOT EXISTS "idx_courses_user_created" ON "public"."courses" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_lectures_deleted_at" ON "public"."lectures" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



COMMENT ON INDEX "public"."idx_lectures_deleted_at" IS 'Partial index for efficiently querying soft-deleted lectures.';



CREATE INDEX IF NOT EXISTS "idx_lectures_user_created" ON "public"."lectures" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_lectures_user_start_time" ON "public"."lectures" USING "btree" ("user_id", "start_time");



COMMENT ON INDEX "public"."idx_lectures_user_start_time" IS 'Improves performance of fetching lectures for a specific user within a date range. Optimizes queries filtering by user_id and start_time.';



CREATE INDEX IF NOT EXISTS "idx_reminders_assignment_id" ON "public"."reminders" USING "btree" ("assignment_id");



CREATE INDEX IF NOT EXISTS "idx_reminders_completed_created_at" ON "public"."reminders" USING "btree" ("completed", "created_at") WHERE ("completed" = true);



COMMENT ON INDEX "public"."idx_reminders_completed_created_at" IS 'Partial composite index for efficient cleanup of old completed reminders. Optimizes queries like DELETE FROM reminders WHERE completed = true AND created_at < cutoff_date. Only indexes completed reminders to avoid performance impact on active reminder queries.';



CREATE INDEX IF NOT EXISTS "idx_reminders_lecture_id" ON "public"."reminders" USING "btree" ("lecture_id");



CREATE INDEX IF NOT EXISTS "idx_reminders_reminder_time" ON "public"."reminders" USING "btree" ("reminder_time");



CREATE INDEX IF NOT EXISTS "idx_reminders_user_id" ON "public"."reminders" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_streaks_user_id" ON "public"."streaks" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_study_sessions_deleted_at" ON "public"."study_sessions" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



COMMENT ON INDEX "public"."idx_study_sessions_deleted_at" IS 'Partial index for efficiently querying soft-deleted study sessions.';



CREATE INDEX IF NOT EXISTS "idx_study_sessions_user_created" ON "public"."study_sessions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_study_sessions_user_session_date" ON "public"."study_sessions" USING "btree" ("user_id", "session_date");



COMMENT ON INDEX "public"."idx_study_sessions_user_session_date" IS 'Improves performance of fetching study sessions for a specific user within a date range. Optimizes queries filtering by user_id and session_date.';



CREATE INDEX IF NOT EXISTS "idx_tasks_events_date" ON "public"."tasks_events" USING "btree" ("due_date");



CREATE INDEX IF NOT EXISTS "idx_tasks_events_user_id" ON "public"."tasks_events" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_users_account_status" ON "public"."users" USING "btree" ("account_status");



CREATE INDEX IF NOT EXISTS "idx_users_date_of_birth" ON "public"."users" USING "btree" ("date_of_birth");



CREATE INDEX IF NOT EXISTS "idx_users_deleted_at" ON "public"."users" USING "btree" ("deleted_at");



CREATE INDEX IF NOT EXISTS "idx_users_deletion_scheduled_at" ON "public"."users" USING "btree" ("deletion_scheduled_at");



CREATE INDEX IF NOT EXISTS "idx_users_marketing_opt_in" ON "public"."users" USING "btree" ("marketing_opt_in");



CREATE INDEX IF NOT EXISTS "idx_users_subscription_expires" ON "public"."users" USING "btree" ("subscription_expires_at");



CREATE INDEX IF NOT EXISTS "idx_users_subscription_tier" ON "public"."users" USING "btree" ("subscription_tier");



CREATE INDEX IF NOT EXISTS "idx_users_suspension_end_date" ON "public"."users" USING "btree" ("suspension_end_date");



-- Conditionally add foreign key constraints
-- SECURITY: Ensure users table has primary key before creating foreign keys
DO $$
BEGIN
    -- CRITICAL: Ensure users table has primary key BEFORE creating any foreign keys
    -- This must be done unconditionally to guarantee the constraint exists
    -- Use DO block exception handling to ignore if already exists
    BEGIN
        ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
    EXCEPTION
        WHEN duplicate_object THEN NULL; -- Primary key already exists, continue
    END;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_actions_admin_id_fkey') THEN
        ALTER TABLE ONLY "public"."admin_actions" ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_actions_target_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."admin_actions" ADD CONSTRAINT "admin_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_course_id_fkey') THEN
        ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."assignments" ADD CONSTRAINT "assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."courses" ADD CONSTRAINT "courses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lectures_course_id_fkey') THEN
        ALTER TABLE ONLY "public"."lectures" ADD CONSTRAINT "lectures_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lectures_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."lectures" ADD CONSTRAINT "lectures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey') THEN
        ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_assignment_id_fkey') THEN
        ALTER TABLE ONLY "public"."reminders" ADD CONSTRAINT "reminders_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_lecture_id_fkey') THEN
        ALTER TABLE ONLY "public"."reminders" ADD CONSTRAINT "reminders_lecture_id_fkey" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_session_id_fkey') THEN
        ALTER TABLE ONLY "public"."reminders" ADD CONSTRAINT "reminders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'streaks_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."streaks" ADD CONSTRAINT "streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'study_sessions_course_id_fkey') THEN
        ALTER TABLE ONLY "public"."study_sessions" ADD CONSTRAINT "study_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'study_sessions_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_events_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."tasks_events" ADD CONSTRAINT "tasks_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_devices_user_id_fkey') THEN
        ALTER TABLE ONLY "public"."user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_fkey') THEN
        ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");
    END IF;
END $$;



DROP POLICY IF EXISTS "Admins can insert admin actions" ON "public"."admin_actions";
CREATE POLICY "Admins can insert admin actions" ON "public"."admin_actions" FOR INSERT WITH CHECK ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



DROP POLICY IF EXISTS "Admins can view all admin actions" ON "public"."admin_actions";
CREATE POLICY "Admins can view all admin actions" ON "public"."admin_actions" FOR SELECT USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



DROP POLICY IF EXISTS "Authenticated users can read SRS schedules" ON "public"."srs_schedules";
CREATE POLICY "Authenticated users can read SRS schedules" ON "public"."srs_schedules" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Users can delete their own accessible courses" ON "public"."courses";
CREATE POLICY "Users can delete their own accessible courses" ON "public"."courses" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("id" IN ( SELECT "get_accessible_item_ids"."id"
   FROM "public"."get_accessible_item_ids"("auth"."uid"(), 'courses'::"text", 2) "get_accessible_item_ids"("id")))));



DROP POLICY IF EXISTS "Users can delete their own active assignments" ON "public"."assignments";
CREATE POLICY "Users can delete their own active assignments" ON "public"."assignments" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



DROP POLICY IF EXISTS "Users can delete their own active lectures" ON "public"."lectures";
CREATE POLICY "Users can delete their own active lectures" ON "public"."lectures" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



DROP POLICY IF EXISTS "Users can delete their own active study sessions" ON "public"."study_sessions";
CREATE POLICY "Users can delete their own active study sessions" ON "public"."study_sessions" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."users";
CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



DROP POLICY IF EXISTS "Users can insert their own assignments" ON "public"."assignments";
CREATE POLICY "Users can insert their own assignments" ON "public"."assignments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."can_create_task"("auth"."uid"())));



DROP POLICY IF EXISTS "Users can insert their own courses" ON "public"."courses";
CREATE POLICY "Users can insert their own courses" ON "public"."courses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can insert their own lectures" ON "public"."lectures";
CREATE POLICY "Users can insert their own lectures" ON "public"."lectures" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."can_create_task"("auth"."uid"())));



DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON "public"."notification_preferences";
CREATE POLICY "Users can insert their own notification preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can insert their own streaks" ON "public"."streaks";
CREATE POLICY "Users can insert their own streaks" ON "public"."streaks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can insert their own study sessions" ON "public"."study_sessions";
CREATE POLICY "Users can insert their own study sessions" ON "public"."study_sessions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."can_create_task"("auth"."uid"())));



DROP POLICY IF EXISTS "Users can manage own reminders" ON "public"."reminders";
CREATE POLICY "Users can manage own reminders" ON "public"."reminders" USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can manage own streaks" ON "public"."streaks";
CREATE POLICY "Users can manage own streaks" ON "public"."streaks" USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can manage own tasks" ON "public"."tasks_events";
CREATE POLICY "Users can manage own tasks" ON "public"."tasks_events" USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can update their own accessible courses" ON "public"."courses";
CREATE POLICY "Users can update their own accessible courses" ON "public"."courses" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("id" IN ( SELECT "get_accessible_item_ids"."id"
   FROM "public"."get_accessible_item_ids"("auth"."uid"(), 'courses'::"text", 2) "get_accessible_item_ids"("id")))));



DROP POLICY IF EXISTS "Users can update their own active assignments" ON "public"."assignments";
CREATE POLICY "Users can update their own active assignments" ON "public"."assignments" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



DROP POLICY IF EXISTS "Users can update their own active lectures" ON "public"."lectures";
CREATE POLICY "Users can update their own active lectures" ON "public"."lectures" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



DROP POLICY IF EXISTS "Users can update their own active study sessions" ON "public"."study_sessions";
CREATE POLICY "Users can update their own active study sessions" ON "public"."study_sessions" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



DROP POLICY IF EXISTS "Users can update their own lectures" ON "public"."lectures";
CREATE POLICY "Users can update their own lectures" ON "public"."lectures" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can update their own notification preferences" ON "public"."notification_preferences";
CREATE POLICY "Users can update their own notification preferences" ON "public"."notification_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can update their own profile." ON "public"."profiles";
CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



DROP POLICY IF EXISTS "Users can update their own streaks" ON "public"."streaks";
CREATE POLICY "Users can update their own streaks" ON "public"."streaks" FOR UPDATE USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can view courses based on their role" ON "public"."courses";
CREATE POLICY "Users can view courses based on their role" ON "public"."courses" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text")));



DROP POLICY IF EXISTS "Users can view own profile" ON "public"."users";
CREATE POLICY "Users can view own profile" ON "public"."users" USING (("auth"."uid"() = "id"));



DROP POLICY IF EXISTS "Users can view their own accessible assignments" ON "public"."assignments";
CREATE POLICY "Users can view their own accessible assignments" ON "public"."assignments" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("id" IN ( SELECT "get_accessible_item_ids"."id"
   FROM "public"."get_accessible_item_ids"("auth"."uid"(), 'assignments'::"text", 15) "get_accessible_item_ids"("id")))));



DROP POLICY IF EXISTS "Users can view their own accessible courses" ON "public"."courses";
CREATE POLICY "Users can view their own accessible courses" ON "public"."courses" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("id" IN ( SELECT "get_accessible_item_ids"."id"
   FROM "public"."get_accessible_item_ids"("auth"."uid"(), 'courses'::"text", 2) "get_accessible_item_ids"("id")))));



DROP POLICY IF EXISTS "Users can view their own active assignments" ON "public"."assignments";
CREATE POLICY "Users can view their own active assignments" ON "public"."assignments" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



DROP POLICY IF EXISTS "Users can view their own active lectures" ON "public"."lectures";
CREATE POLICY "Users can view their own active lectures" ON "public"."lectures" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



DROP POLICY IF EXISTS "Users can view their own active study sessions" ON "public"."study_sessions";
CREATE POLICY "Users can view their own active study sessions" ON "public"."study_sessions" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("deleted_at" IS NULL)));



DROP POLICY IF EXISTS "Users can view their own notification preferences" ON "public"."notification_preferences";
CREATE POLICY "Users can view their own notification preferences" ON "public"."notification_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can view their own profile." ON "public"."profiles";
CREATE POLICY "Users can view their own profile." ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



DROP POLICY IF EXISTS "Users can view their own streaks" ON "public"."streaks";
CREATE POLICY "Users can view their own streaks" ON "public"."streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lectures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."srs_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."study_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_srs_reminders"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_srs_reminders"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_srs_reminders"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_task"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_task"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_task"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_send_reminders"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_send_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_send_reminders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."count_tasks_since"("since_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."count_tasks_since"("since_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_tasks_since"("since_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_course_and_lectures_transaction"("p_user_id" "uuid", "p_course_name" "text", "p_course_description" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_recurrence_type" "text", "p_reminders" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_course_and_lectures_transaction"("p_user_id" "uuid", "p_course_name" "text", "p_course_description" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_recurrence_type" "text", "p_reminders" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_course_and_lectures_transaction"("p_user_id" "uuid", "p_course_name" "text", "p_course_description" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_recurrence_type" "text", "p_reminders" integer[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_course_and_lectures_transaction"("p_user_id" "uuid", "p_course_name" "text", "p_course_code" "text", "p_course_description" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_recurrence_type" "text", "p_reminders" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_course_and_lectures_transaction"("p_user_id" "uuid", "p_course_name" "text", "p_course_code" "text", "p_course_description" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_recurrence_type" "text", "p_reminders" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_course_and_lectures_transaction"("p_user_id" "uuid", "p_course_name" "text", "p_course_code" "text", "p_course_description" "text", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_recurrence_type" "text", "p_reminders" integer[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accessible_item_ids"("p_user_id" "uuid", "p_table_name" "text", "p_free_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_accessible_item_ids"("p_user_id" "uuid", "p_table_name" "text", "p_free_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accessible_item_ids"("p_user_id" "uuid", "p_table_name" "text", "p_free_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_home_screen_data_for_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_home_screen_data_for_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_home_screen_data_for_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."schedule_daily_cleanup"() TO "anon";
GRANT ALL ON FUNCTION "public"."schedule_daily_cleanup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_daily_cleanup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streak"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streak"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streak"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streak"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streak"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streak"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."admin_actions" TO "anon";
GRANT ALL ON TABLE "public"."admin_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_actions" TO "service_role";



GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."lectures" TO "anon";
GRANT ALL ON TABLE "public"."lectures" TO "authenticated";
GRANT ALL ON TABLE "public"."lectures" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reminders" TO "anon";
GRANT ALL ON TABLE "public"."reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."reminders" TO "service_role";



GRANT ALL ON TABLE "public"."srs_schedules" TO "anon";
GRANT ALL ON TABLE "public"."srs_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."srs_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."streaks" TO "anon";
GRANT ALL ON TABLE "public"."streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."streaks" TO "service_role";



GRANT ALL ON TABLE "public"."study_sessions" TO "anon";
GRANT ALL ON TABLE "public"."study_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."study_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."tasks_events" TO "anon";
GRANT ALL ON TABLE "public"."tasks_events" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks_events" TO "service_role";



GRANT ALL ON TABLE "public"."user_devices" TO "anon";
GRANT ALL ON TABLE "public"."user_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."user_devices" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
