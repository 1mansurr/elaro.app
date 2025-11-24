-- Fix permissions on deprecated check_and_send_reminders function
-- Remove overly permissive GRANT ALL and use minimal permissions
-- Function is deprecated stub, so EXECUTE permission is sufficient

-- ============================================================================
-- REVOKE OVERLY PERMISSIVE GRANTS
-- ============================================================================

-- Revoke ALL permissions from service_role
REVOKE ALL ON FUNCTION "public"."check_and_send_reminders"() FROM "service_role";

-- ============================================================================
-- GRANT MINIMAL PERMISSIONS (If function still needs to be callable)
-- ============================================================================

-- Grant only EXECUTE permission (minimal required)
-- Since function is deprecated stub that does nothing, EXECUTE is sufficient
GRANT EXECUTE ON FUNCTION "public"."check_and_send_reminders"() TO "service_role";

-- ============================================================================
-- UPDATE FUNCTION COMMENT
-- ============================================================================

COMMENT ON FUNCTION "public"."check_and_send_reminders"() IS 
'DEPRECATED: This function is disabled for security reasons. Use the process-due-reminders Edge Function instead, which properly uses environment variables for secrets. GRANT EXECUTE only (no ALL permissions - security best practice).';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Function permissions cleanup completed';
  RAISE NOTICE 'Removed GRANT ALL, added GRANT EXECUTE only';
  RAISE NOTICE 'This follows security best practice of minimal permissions';
END $$;

