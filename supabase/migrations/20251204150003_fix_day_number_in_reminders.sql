-- Fix: Add day_number to reminders in create_course_and_lectures_transaction function
-- The day_number column is NOT NULL but was missing from INSERT statements
-- day_number represents the number of days before the event (calculated from minutes)
CREATE OR REPLACE FUNCTION "public"."create_course_and_lectures_transaction"(
    "p_user_id" "uuid",
    "p_course_name" "text",
    "p_course_code" "text",
    "p_course_description" "text",
    "p_start_time" timestamp with time zone,
    "p_end_time" timestamp with time zone,
    "p_recurrence_type" "text",
    "p_venue" "text",
    "p_reminders" integer[]
) RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_course_id uuid;
    new_lecture_id uuid;
    lecture_duration interval;
    current_lecture_start timestamptz;
    current_lecture_end timestamptz;
    reminder_time integer;
    reminder_day_number integer;
BEGIN
    -- 1. Create the Course
    INSERT INTO public.courses (user_id, course_name, course_code, about_course)
    VALUES (p_user_id, p_course_name, p_course_code, p_course_description)
    RETURNING id INTO new_course_id;

    lecture_duration := p_end_time - p_start_time;

    -- 2. Create the initial Lecture(s)
    IF p_recurrence_type = 'none' THEN
        -- Create a single lecture
        INSERT INTO public.lectures (user_id, course_id, lecture_name, start_time, end_time, venue, lecture_date)
        VALUES (p_user_id, new_course_id, p_course_name, p_start_time, p_end_time, p_venue, p_start_time)
        RETURNING id INTO new_lecture_id;

        -- Schedule reminders for the single lecture
        FOREACH reminder_time IN ARRAY p_reminders
        LOOP
            -- Calculate day_number: ceil(minutes / 1440) to convert minutes to days (rounded up)
            reminder_day_number := CEIL(reminder_time::numeric / 1440.0)::integer;
            
            -- FIX: Include day_number and reminder_type
            INSERT INTO public.reminders (user_id, lecture_id, reminder_time, day_number, reminder_type)
            VALUES (
                p_user_id, 
                new_lecture_id, 
                p_start_time - (reminder_time * interval '1 minute'),
                reminder_day_number,
                'lecture'
            );
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

            INSERT INTO public.lectures (user_id, course_id, lecture_name, start_time, end_time, venue, lecture_date)
            VALUES (p_user_id, new_course_id, p_course_name, current_lecture_start, current_lecture_end, p_venue, current_lecture_start)
            RETURNING id INTO new_lecture_id;

            -- Schedule reminders for each recurring lecture
            FOREACH reminder_time IN ARRAY p_reminders
            LOOP
                -- Calculate day_number: ceil(minutes / 1440) to convert minutes to days (rounded up)
                reminder_day_number := CEIL(reminder_time::numeric / 1440.0)::integer;
                
                -- FIX: Include day_number and reminder_type
                INSERT INTO public.reminders (user_id, lecture_id, reminder_time, day_number, reminder_type)
                VALUES (
                    p_user_id, 
                    new_lecture_id, 
                    current_lecture_start - (reminder_time * interval '1 minute'),
                    reminder_day_number,
                    'lecture'
                );
            END LOOP;
        END LOOP;
    END IF;

    RETURN json_build_object('course_id', new_course_id);
END;
$$;

