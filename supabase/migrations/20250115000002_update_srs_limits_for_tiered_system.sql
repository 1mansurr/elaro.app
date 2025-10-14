-- ELARO DATABASE UPDATE: UPDATE SRS LIMITS FOR TIERED SYSTEM
-- This migration updates the can_create_srs_reminders function to support
-- different SRS limits for different subscription tiers

-- Update the can_create_srs_reminders function
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
  -- Free users: 15 SRS reminders per month (allows 5 study sessions with 3 reminders each)
  -- Oddity users: 112 SRS reminders per month (allows 14 study sessions with 8 reminders each)
  IF subscription_tier = 'free' THEN
    srs_limit := 15; -- 15 SRS reminders per month for free users
  ELSIF subscription_tier = 'oddity' THEN
    srs_limit := 112; -- 112 SRS reminders per month for oddity users
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_create_srs_reminders(UUID) TO authenticated;

-- Update the function comment
COMMENT ON FUNCTION public.can_create_srs_reminders(UUID) IS 'Checks if a user is allowed to create SRS reminders based on their subscription tier and monthly activity limits. Free: 15/month, Oddity: 112/month';
