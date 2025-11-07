-- Remove unsafe function that embeds service role key in database
-- This function has hardcoded secrets and should be replaced by the Edge Function
-- The Edge Function 'process-due-reminders' already handles this correctly using env vars

-- Drop the unsafe function
DROP FUNCTION IF EXISTS public.check_and_send_reminders();

-- Create a safe stub function to avoid breaking any potential callers
-- This logs a deprecation notice instead of executing unsafe code
CREATE OR REPLACE FUNCTION public.check_and_send_reminders()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE NOTICE 'check_and_send_reminders() is deprecated and disabled for security reasons. Use Edge Function process-due-reminders instead.';
  -- Function intentionally does nothing - all reminder processing should go through Edge Functions
END;
$$;

-- Update function comment
COMMENT ON FUNCTION public.check_and_send_reminders() IS 'DEPRECATED: This function is disabled for security reasons. Use the process-due-reminders Edge Function instead, which properly uses environment variables for secrets.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Security fix: Removed hardcoded service role key from check_and_send_reminders() function';
  RAISE NOTICE 'Reminder processing should use Edge Function: process-due-reminders';
END $$;

