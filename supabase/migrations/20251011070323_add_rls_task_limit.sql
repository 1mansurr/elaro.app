-- Step 1: Create the helper function to check if a user can create a new task.

CREATE OR REPLACE FUNCTION public.can_create_task(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_tier TEXT;
  task_count INT;
  task_limit INT := 5; -- The weekly limit for free users
BEGIN
  -- Get the user's subscription tier.
  SELECT u.subscription_tier INTO subscription_tier
  FROM public.users u
  WHERE u.id = p_user_id;

  -- Premium users can always create tasks.
  IF subscription_tier != 'free' THEN
    RETURN TRUE;
  END IF;

  -- For free users, count the tasks created in the last 7 days.
  SELECT COUNT(*) INTO task_count
  FROM (
    SELECT created_at FROM public.assignments WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT created_at FROM public.lectures WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT created_at FROM public.study_sessions WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '7 days'
  ) AS recent_tasks;

  -- Return true if the user is under the limit.
  RETURN task_count < task_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the authenticated role.
GRANT EXECUTE ON FUNCTION public.can_create_task(UUID) TO authenticated;


-- Step 2: Update the INSERT policies for all task tables to use the new function.

-- For assignments
DROP POLICY IF EXISTS "Users can insert their own assignments" ON public.assignments;
CREATE POLICY "Users can insert their own assignments"
ON public.assignments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND public.can_create_task(auth.uid())
);

-- For lectures
DROP POLICY IF EXISTS "Users can insert their own lectures" ON public.lectures;
CREATE POLICY "Users can insert their own lectures"
ON public.lectures
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND public.can_create_task(auth.uid())
);

-- For study_sessions
DROP POLICY IF EXISTS "Users can insert their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can insert their own study sessions"
ON public.study_sessions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND public.can_create_task(auth.uid())
);

COMMENT ON FUNCTION public.can_create_task(UUID) IS 'Checks if a user is allowed to create a new task based on their subscription tier and recent activity.';
