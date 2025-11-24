-- Migration: Username Validation Constraints
-- Description: Adds case-insensitive uniqueness constraint, format validation,
--               and length constraints for usernames

-- ============================================================================
-- 1. Create function to check case-insensitive username uniqueness
-- ============================================================================

CREATE OR REPLACE FUNCTION check_username_case_insensitive_unique()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Check if another user (excluding current user) has the same username (case-insensitive)
  SELECT COUNT(*) INTO existing_count
  FROM public.users
  WHERE LOWER(username) = LOWER(NEW.username)
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND deleted_at IS NULL; -- Only check active users

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'USERNAME_DUPLICATE: Username already exists (case-insensitive)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_username_case_insensitive_unique() IS 
  'Trigger function to enforce case-insensitive username uniqueness';

-- ============================================================================
-- 2. Create trigger to enforce case-insensitive uniqueness
-- ============================================================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS enforce_username_case_insensitive_unique ON public.users;

-- Create trigger
CREATE TRIGGER enforce_username_case_insensitive_unique
  BEFORE INSERT OR UPDATE OF username ON public.users
  FOR EACH ROW
  WHEN (NEW.username IS NOT NULL)
  EXECUTE FUNCTION check_username_case_insensitive_unique();

COMMENT ON TRIGGER enforce_username_case_insensitive_unique ON public.users IS 
  'Enforces case-insensitive username uniqueness on insert and update';

-- ============================================================================
-- 3. Add check constraints for username format
-- ============================================================================

-- Drop existing constraints if they exist
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS username_length_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS username_format_check;

-- Add length constraint (4-20 characters)
ALTER TABLE public.users
  ADD CONSTRAINT username_length_check
  CHECK (
    username IS NULL OR 
    (LENGTH(username) >= 4 AND LENGTH(username) <= 20)
  );

COMMENT ON CONSTRAINT username_length_check ON public.users IS 
  'Ensures username is between 4 and 20 characters';

-- Add format constraint (no start/end/consecutive dots/underscores)
ALTER TABLE public.users
  ADD CONSTRAINT username_format_check
  CHECK (
    username IS NULL OR
    (
      -- Cannot start with dot or underscore
      username !~ '^[._]' AND
      -- Cannot end with dot or underscore
      username !~ '[._]$' AND
      -- Cannot have consecutive dots or underscores
      username !~ '[._]{2,}'
    )
  );

COMMENT ON CONSTRAINT username_format_check ON public.users IS 
  'Ensures username format: no start/end dots/underscores, no consecutive dots/underscores';

-- ============================================================================
-- 4. Create RPC function for case-insensitive username availability check
-- ============================================================================

CREATE OR REPLACE FUNCTION check_username_available(p_username TEXT, p_exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Check if another user (excluding specified user) has the same username (case-insensitive)
  SELECT COUNT(*) INTO existing_count
  FROM public.users
  WHERE LOWER(username) = LOWER(p_username)
    AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
    AND deleted_at IS NULL; -- Only check active users

  RETURN existing_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_username_available(TEXT, UUID) IS 
  'RPC function to check if a username is available (case-insensitive, excludes specified user)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_username_available(TEXT, UUID) TO authenticated;

-- ============================================================================
-- 5. Create index for case-insensitive username lookups (performance optimization)
-- ============================================================================

-- Drop index if it exists
DROP INDEX IF EXISTS idx_users_username_lower;

-- Create index on lowercase username for faster case-insensitive lookups
CREATE INDEX idx_users_username_lower 
  ON public.users (LOWER(username))
  WHERE deleted_at IS NULL; -- Only index active users

COMMENT ON INDEX idx_users_username_lower IS 
  'Index for case-insensitive username lookups (active users only)';

-- ============================================================================
-- 6. Validate existing username "Mansur" (if it exists)
-- ============================================================================

-- Check if "Mansur" exists and validate it against new rules
DO $$
DECLARE
  existing_username TEXT;
BEGIN
  SELECT username INTO existing_username
  FROM public.users
  WHERE LOWER(username) = 'mansur'
    AND deleted_at IS NULL
  LIMIT 1;

  IF existing_username IS NOT NULL THEN
    -- Validate length
    IF LENGTH(existing_username) < 4 OR LENGTH(existing_username) > 20 THEN
      RAISE WARNING 'Existing username "Mansur" violates length constraint (4-20 characters)';
    END IF;

    -- Validate format
    IF existing_username ~ '^[._]' OR existing_username ~ '[._]$' OR existing_username ~ '[._]{2,}' THEN
      RAISE WARNING 'Existing username "Mansur" violates format constraint';
    END IF;

    -- If valid, log success
    RAISE NOTICE 'Existing username "Mansur" is valid according to new rules';
  END IF;
END $$;

