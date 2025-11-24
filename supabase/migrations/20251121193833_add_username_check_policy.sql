-- Add RLS policy to allow authenticated users to check username availability
-- This policy allows reading the username field from the users table
-- for the purpose of checking if a username is available
-- 
-- Note: This is a read-only policy that allows authenticated users to query
-- the users table to check if a username exists, which is necessary for
-- the username availability check functionality.

CREATE POLICY "Users can check username availability" ON "public"."users"
FOR SELECT
TO authenticated
USING (true);

-- Add RLS policy to allow users to update their own profile
-- This policy allows users to update their own user record, which is necessary
-- for functions like start-user-trial that need to update subscription information

CREATE POLICY "Users can update their own profile" ON "public"."users"
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

