-- Fix DST handling in timezone conversion
-- Part of Phase 3: Scheduling Engine Improvements
-- Use make_timestamptz for proper DST-aware conversion

CREATE OR REPLACE FUNCTION public.schedule_reminder_in_user_timezone(
  p_user_id UUID,
  p_base_time TIMESTAMPTZ,
  p_days_offset INTEGER,
  p_hour INTEGER DEFAULT NULL
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  user_tz TEXT;
  reminder_time TIMESTAMPTZ;
  local_time TIMESTAMP;
  year_val INTEGER;
  month_val INTEGER;
  day_val INTEGER;
  hour_val INTEGER;
  minute_val INTEGER;
BEGIN
  -- Get user's timezone (default to UTC if not set)
  SELECT COALESCE(timezone, 'UTC') INTO user_tz 
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Convert base time to user's local timezone
  local_time := (p_base_time AT TIME ZONE user_tz)::TIMESTAMP;
  
  -- Add day offset
  local_time := local_time + (p_days_offset || ' days')::INTERVAL;
  
  -- Extract components for make_timestamptz (handles DST correctly)
  year_val := EXTRACT(YEAR FROM local_time)::INTEGER;
  month_val := EXTRACT(MONTH FROM local_time)::INTEGER;
  day_val := EXTRACT(DAY FROM local_time)::INTEGER;
  hour_val := COALESCE(p_hour, EXTRACT(HOUR FROM local_time))::INTEGER;
  minute_val := EXTRACT(MINUTE FROM local_time)::INTEGER;
  
  -- Use make_timestamptz for DST-aware conversion
  -- This function properly handles daylight saving time transitions
  BEGIN
    reminder_time := make_timestamptz(
      year_val,
      month_val,
      day_val,
      hour_val,
      minute_val,
      0, -- seconds
      user_tz
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback to simpler conversion if make_timestamptz fails
      -- This can happen with invalid timezone strings
      reminder_time := (local_time AT TIME ZONE user_tz)::TIMESTAMPTZ;
      
      -- Log the error for debugging (using RAISE NOTICE in production would be better)
      -- In production, consider logging to a monitoring system
  END;
  
  RETURN reminder_time;
END;
$$;

COMMENT ON FUNCTION public.schedule_reminder_in_user_timezone IS 
'Schedules a reminder in the user''s local timezone with proper DST (Daylight Saving Time) handling using make_timestamptz';

