-- ELARO DATABASE UPDATE: IMPLEMENT MONTHLY SUBSCRIPTION LIMITS
-- This migration updates the SQL functions that enforce user limits.
-- It replaces the old weekly logic with new monthly logic and uses the correct, specific limits for each tier.

-- ==================================================
-- ==  FUNCTION 1: can_create_task (TASKS/EVENTS)  ==
-- ==================================================
-- This function now checks for monthly task limits based on subscription tier.

CREATE OR REPLACE FUNCTION public.can_create_task(p_user_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the authenticated role.
GRANT EXECUTE ON FUNCTION public.can_create_task(UUID) TO authenticated;

-- Update the function comment
COMMENT ON FUNCTION public.can_create_task(UUID) IS 'Checks if a user is allowed to create a new task based on their subscription tier and monthly activity limits.';


-- ==================================================
-- ==  FUNCTION 2: can_create_srs_reminders (SRS)  ==
-- ==================================================
-- This function now checks for monthly SRS reminder limits based on subscription tier.

CREATE OR REPLACE FUNCTION public.can_create_srs_reminders(p_user_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function is executable by authenticated users
GRANT EXECUTE ON FUNCTION public.can_create_srs_reminders(UUID) TO authenticated;

-- Add comment to document the function
COMMENT ON FUNCTION public.can_create_srs_reminders(UUID) IS 'Checks if a user is allowed to create SRS reminders based on their subscription tier and monthly activity limits.';


-- ==================================================
-- ==  UPDATE REMINDER TYPE CONSTRAINT             ==
-- ==================================================
-- Update the reminder_type constraint to include 'spaced_repetition'

-- First, drop the existing constraint
ALTER TABLE public.reminders 
DROP CONSTRAINT IF EXISTS reminders_reminder_type_check;

-- Add the new constraint that includes 'spaced_repetition'
ALTER TABLE public.reminders 
ADD CONSTRAINT reminders_reminder_type_check 
CHECK (reminder_type IN ('study_session', 'lecture', 'assignment', 'spaced_repetition'));

-- Update the column comment to reflect the change
COMMENT ON COLUMN public.reminders.reminder_type IS 'Type of reminder: study_session, lecture, assignment, or spaced_repetition';
