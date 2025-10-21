-- Create trigger to automatically create user profile when auth user is created
-- This trigger calls the handle_new_user() function which:
-- 1. Creates a user profile in public.users
-- 2. Creates default notification preferences
-- 3. Triggers the welcome email

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment to the trigger
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically creates user profile and preferences when a new user signs up';

