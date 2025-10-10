-- FILE: supabase/migrations/20251009191448_add_country_to_users.sql
-- ACTION: Create this new migration file.

-- Add a column to store the user's country
ALTER TABLE public.users
ADD COLUMN country TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN public.users.country IS 'The user''s country, selected during onboarding.';
