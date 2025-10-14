-- Step 1: Add the 'role' column to the 'users' table.
-- We default all users to the 'user' role.
ALTER TABLE public.users
ADD COLUMN role TEXT DEFAULT 'user' NOT NULL;

COMMENT ON COLUMN public.users.role IS 'The role of the user (e.g., user, admin).';


-- Step 2: Update the RLS policy on the `courses` table to demonstrate RBAC.
-- We will allow users with the 'admin' role to bypass the ownership check for SELECT operations.

-- First, drop the existing SELECT policy.
DROP POLICY IF EXISTS "Users can view their own courses" ON public.courses;

-- Create the new, role-aware SELECT policy.
CREATE POLICY "Users can view courses based on their role"
ON public.courses
FOR SELECT
USING (
  -- Regular users can only see their own courses.
  auth.uid() = user_id
  OR
  -- Users with the 'admin' role can see ALL courses.
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Note: The INSERT, UPDATE, and DELETE policies should remain unchanged for now,
-- as we typically don't want admins to be able to modify other users' data directly
-- without a proper audit trail, which would be handled in a dedicated admin panel.
