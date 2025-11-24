-- ============================================================================
-- SECURITY FIX: Remove overly broad GRANT permissions
-- ============================================================================
-- This migration removes GRANT ALL permissions that are too permissive
-- and replaces them with specific, minimal permissions that respect RLS

-- ============================================================================
-- REVOKE ALL from anon and authenticated
-- ============================================================================

-- Assignments
REVOKE ALL ON TABLE "public"."assignments" FROM "anon";
REVOKE ALL ON TABLE "public"."assignments" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."assignments" TO "authenticated";
-- Note: anon gets no permissions (RLS will block anyway, but this is explicit)

-- Courses
REVOKE ALL ON TABLE "public"."courses" FROM "anon";
REVOKE ALL ON TABLE "public"."courses" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."courses" TO "authenticated";

-- Lectures
REVOKE ALL ON TABLE "public"."lectures" FROM "anon";
REVOKE ALL ON TABLE "public"."lectures" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."lectures" TO "authenticated";

-- Study Sessions
REVOKE ALL ON TABLE "public"."study_sessions" FROM "anon";
REVOKE ALL ON TABLE "public"."study_sessions" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."study_sessions" TO "authenticated";

-- Profiles
REVOKE ALL ON TABLE "public"."profiles" FROM "anon";
REVOKE ALL ON TABLE "public"."profiles" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."profiles" TO "authenticated";

-- Users
REVOKE ALL ON TABLE "public"."users" FROM "anon";
REVOKE ALL ON TABLE "public"."users" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."users" TO "authenticated";
-- Users cannot delete themselves via direct table access (must use edge function)

-- Notification Preferences
REVOKE ALL ON TABLE "public"."notification_preferences" FROM "anon";
REVOKE ALL ON TABLE "public"."notification_preferences" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."notification_preferences" TO "authenticated";

-- Reminders
REVOKE ALL ON TABLE "public"."reminders" FROM "anon";
REVOKE ALL ON TABLE "public"."reminders" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."reminders" TO "authenticated";

-- Streaks
REVOKE ALL ON TABLE "public"."streaks" FROM "anon";
REVOKE ALL ON TABLE "public"."streaks" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."streaks" TO "authenticated";

-- SRS Schedules
REVOKE ALL ON TABLE "public"."srs_schedules" FROM "anon";
REVOKE ALL ON TABLE "public"."srs_schedules" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."srs_schedules" TO "authenticated";

-- Tasks Events
REVOKE ALL ON TABLE "public"."tasks_events" FROM "anon";
REVOKE ALL ON TABLE "public"."tasks_events" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."tasks_events" TO "authenticated";

-- User Devices
REVOKE ALL ON TABLE "public"."user_devices" FROM "anon";
REVOKE ALL ON TABLE "public"."user_devices" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."user_devices" TO "authenticated";

-- Admin Actions (only admins via RLS)
REVOKE ALL ON TABLE "public"."admin_actions" FROM "anon";
REVOKE ALL ON TABLE "public"."admin_actions" FROM "authenticated";
GRANT SELECT, INSERT ON TABLE "public"."admin_actions" TO "authenticated";
-- RLS policies will enforce admin-only access

-- ============================================================================
-- REVOKE ALL from Functions (keep only what's needed)
-- ============================================================================

-- Revoke all from anon on all functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
    LOOP
        BEGIN
            EXECUTE 'REVOKE ALL ON FUNCTION public.' || quote_ident(r.routine_name) || ' FROM anon';
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors if function doesn't exist or permission doesn't exist
            NULL;
        END;
    END LOOP;
END $$;

-- Grant EXECUTE on safe functions to authenticated
-- Only grant what's absolutely necessary
GRANT EXECUTE ON FUNCTION "public"."can_create_task"("p_user_id" "uuid") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."can_create_srs_reminders"("p_user_id" "uuid") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_accessible_item_ids"("p_user_id" "uuid", "p_table_name" "text", "p_free_limit" integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_home_screen_data_for_user"("p_user_id" "uuid") TO "authenticated";

-- ============================================================================
-- Update Sequences (for auto-increment IDs)
-- ============================================================================

-- Grant USAGE on sequences to authenticated (needed for INSERT with auto-increment)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        BEGIN
            EXECUTE 'GRANT USAGE ON SEQUENCE public.' || quote_ident(r.sequence_name) || ' TO authenticated';
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors if sequence doesn't exist
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- Log completion
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Security fix: GRANT permissions have been restricted';
    RAISE NOTICE 'anon role now has no direct table access (as intended)';
    RAISE NOTICE 'authenticated role has minimal required permissions';
    RAISE NOTICE 'RLS policies will enforce actual access control';
END $$;

