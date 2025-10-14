-- ELARO FEATURE UPDATE: DECOUPLE TRIAL START FROM SIGN-UP
-- This migration modifies the handle_new_user trigger to no longer start a trial automatically.
-- The trial will be initiated by the mobile app on the user's first login instead.

-- Update the handle_new_user function to create a basic user without trial data
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- This new version of the function creates a user in the 'free' tier
  -- without starting a trial. The trial will be initiated by the mobile app
  -- on the user's first login.
  INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name, 
    subscription_tier, 
    onboarding_completed
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'free', -- Default subscription tier
    false   -- Explicitly set onboarding to false
  );
  
  RETURN new;
END;
$function$;

-- Add comment to document the change
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a new user in free tier without starting trial. Trial initiation moved to mobile app login flow.';
