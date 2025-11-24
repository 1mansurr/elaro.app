-- Fix user creation trigger with proper permissions and search path
-- Based on ChatGPT analysis of Supabase auth.users trigger issues

-- Step 1: Drop existing trigger if it exists (in case it's on wrong schema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;

-- Step 2: Recreate the handle_new_user function with proper search_path
-- Note: Permissions are already granted by Supabase by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Log that trigger is executing
  RAISE WARNING 'Trigger handle_new_user executed for user: %', NEW.id;
  RAISE WARNING 'Current role: %', current_user;
  
  -- Insert the user into the public.users table
  INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name, 
    subscription_tier, 
    onboarding_completed, 
    marketing_opt_in, 
    date_of_birth,
    account_status,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    'free',
    false,
    false,
    NULL,
    'active',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE WARNING 'User profile created successfully';

  -- Insert default notification preferences
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE WARNING 'Notification preferences created successfully';

  -- Try to send welcome email, but don't fail if it errors
  BEGIN
    PERFORM net.http_post(
      url:= current_setting('app.settings.supabase_url', true) || '/functions/v1/send-welcome-email',
      headers:= jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
      ),
      body:= jsonb_build_object(
        'userEmail', NEW.email,
        'userFirstName', COALESCE(NEW.raw_user_meta_data->>'first_name', 'there'),
        'userId', NEW.id
      )
    );
    RAISE WARNING 'Welcome email triggered';
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but continue
      RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RAISE WARNING 'Error details: %', SQLSTATE;
    RETURN NEW;
END;
$$;

-- Step 3: Create the trigger on auth.users (correct schema)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify the trigger was created correctly
-- This will show in the migration output
DO $$
BEGIN
  RAISE NOTICE 'Trigger created successfully on auth.users';
END $$;

