-- Enhanced Reminder System: Timezone, Quiet Hours, Priority, History
-- This migration adds comprehensive reminder management features

-- 1. Add quiet hours and notification timing preferences
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT NULL,
ADD COLUMN IF NOT EXISTS preferred_morning_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS preferred_evening_time TIME DEFAULT '20:00:00',
ADD COLUMN IF NOT EXISTS weekend_notifications_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.notification_preferences.quiet_hours_start IS 'Do not disturb start time (user local time, 24h format)';
COMMENT ON COLUMN public.notification_preferences.quiet_hours_end IS 'Do not disturb end time (user local time, 24h format)';
COMMENT ON COLUMN public.notification_preferences.preferred_morning_time IS 'Preferred time for morning notifications';
COMMENT ON COLUMN public.notification_preferences.preferred_evening_time IS 'Preferred time for evening notifications';

-- 2. Add priority system and tracking to reminders
ALTER TABLE public.reminders
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS action_taken TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.reminders.priority IS 'Reminder priority: low, medium, high, or urgent';
COMMENT ON COLUMN public.reminders.sent_at IS 'When the reminder was actually sent to the user';
COMMENT ON COLUMN public.reminders.opened_at IS 'When the user opened/viewed the reminder';
COMMENT ON COLUMN public.reminders.dismissed_at IS 'When the user dismissed the reminder';
COMMENT ON COLUMN public.reminders.action_taken IS 'Action taken: completed_task, snoozed, dismissed, or ignored';

-- 3. Create reminder analytics table for tracking effectiveness
CREATE TABLE IF NOT EXISTS public.reminder_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  sent_time TIMESTAMPTZ,
  opened BOOLEAN DEFAULT FALSE,
  time_to_action INTEGER, -- seconds from sent to action
  action_taken TEXT, -- 'completed', 'snoozed', 'dismissed', 'ignored'
  effectiveness_score DECIMAL(3,2), -- 0-1 score based on response
  hour_of_day INTEGER,
  day_of_week INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_analytics_user ON public.reminder_analytics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_analytics_type ON public.reminder_analytics(reminder_type, created_at DESC);

COMMENT ON TABLE public.reminder_analytics IS 'Tracks reminder effectiveness and user engagement patterns';

-- 4. Enable RLS on reminder_analytics
ALTER TABLE public.reminder_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminder analytics"
  ON public.reminder_analytics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminder analytics"
  ON public.reminder_analytics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Function to schedule reminder in user's timezone
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
BEGIN
  -- Get user's timezone (default to UTC if not set)
  SELECT COALESCE(timezone, 'UTC') INTO user_tz 
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Convert base time to user's local timezone
  local_time := p_base_time AT TIME ZONE user_tz;
  
  -- Add day offset
  local_time := local_time + (p_days_offset || ' days')::INTERVAL;
  
  -- Set specific hour if provided
  IF p_hour IS NOT NULL THEN
    local_time := date_trunc('day', local_time) + (p_hour || ' hours')::INTERVAL;
  END IF;
  
  -- Convert back to UTC for storage
  reminder_time := local_time AT TIME ZONE user_tz;
  
  RETURN reminder_time;
END;
$$;

COMMENT ON FUNCTION public.schedule_reminder_in_user_timezone IS 'Schedules a reminder in the user''s local timezone';

-- 6. Function to check if time is in quiet hours
CREATE OR REPLACE FUNCTION public.is_in_quiet_hours(
  p_user_id UUID,
  p_check_time TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  quiet_start TIME;
  quiet_end TIME;
  user_tz TEXT;
  local_time TIME;
  is_weekend BOOLEAN;
  weekend_enabled BOOLEAN;
BEGIN
  -- Get user's quiet hours settings and timezone
  SELECT 
    np.quiet_hours_start,
    np.quiet_hours_end,
    np.weekend_notifications_enabled,
    COALESCE(u.timezone, 'UTC')
  INTO quiet_start, quiet_end, weekend_enabled, user_tz
  FROM public.notification_preferences np
  JOIN public.users u ON u.id = np.user_id
  WHERE np.user_id = p_user_id;
  
  -- If no quiet hours set, return false
  IF quiet_start IS NULL OR quiet_end IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Convert check time to user's local time
  local_time := (p_check_time AT TIME ZONE user_tz)::TIME;
  
  -- Check if it's a weekend and weekend notifications are disabled
  is_weekend := EXTRACT(DOW FROM p_check_time AT TIME ZONE user_tz) IN (0, 6);
  IF is_weekend AND NOT weekend_enabled THEN
    RETURN TRUE;
  END IF;
  
  -- Check if time is within quiet hours
  -- Handle wraparound (e.g., 22:00 to 08:00)
  IF quiet_start < quiet_end THEN
    RETURN local_time >= quiet_start AND local_time < quiet_end;
  ELSE
    RETURN local_time >= quiet_start OR local_time < quiet_end;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.is_in_quiet_hours IS 'Checks if a given time falls within user''s quiet hours';

-- 7. Function to check for reminder conflicts
CREATE OR REPLACE FUNCTION public.check_reminder_conflicts(
  p_user_id UUID,
  p_reminder_time TIMESTAMPTZ,
  p_buffer_minutes INTEGER DEFAULT 15
) RETURNS TABLE(
  conflicting_reminder_id UUID,
  conflict_time TIMESTAMPTZ,
  conflict_title TEXT
)
LANGUAGE sql
AS $$
  SELECT 
    id,
    reminder_time,
    title
  FROM public.reminders
  WHERE user_id = p_user_id
    AND completed = FALSE
    AND reminder_time BETWEEN 
      (p_reminder_time - (p_buffer_minutes || ' minutes')::INTERVAL)
      AND 
      (p_reminder_time + (p_buffer_minutes || ' minutes')::INTERVAL)
  ORDER BY reminder_time;
$$;

COMMENT ON FUNCTION public.check_reminder_conflicts IS 'Finds reminders that would conflict with a proposed reminder time';

-- 8. Function to get optimal reminder time based on user patterns
CREATE OR REPLACE FUNCTION public.get_optimal_reminder_hour(
  p_user_id UUID,
  p_reminder_type TEXT DEFAULT 'study_session'
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  optimal_hour INTEGER;
BEGIN
  -- Find the hour with highest engagement for this reminder type
  SELECT 
    hour_of_day
  INTO optimal_hour
  FROM public.reminder_analytics
  WHERE user_id = p_user_id
    AND reminder_type = p_reminder_type
    AND action_taken IN ('completed', 'opened')
  GROUP BY hour_of_day
  ORDER BY COUNT(*) DESC, AVG(effectiveness_score) DESC
  LIMIT 1;
  
  -- Default to 10 AM if no data
  RETURN COALESCE(optimal_hour, 10);
END;
$$;

COMMENT ON FUNCTION public.get_optimal_reminder_hour IS 'Returns the most effective hour for reminders based on user engagement history';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Reminder enhancements (timezone, quiet hours, priority, analytics) added successfully';
END $$;

