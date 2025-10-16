-- Add account management fields to users table
-- This migration adds support for soft delete with 7-day retention and account suspension

-- Step 1: Add account status and soft delete fields
ALTER TABLE public.users 
ADD COLUMN account_status TEXT DEFAULT 'active' NOT NULL,
ADD COLUMN deleted_at TIMESTAMPTZ,
ADD COLUMN deletion_scheduled_at TIMESTAMPTZ,
ADD COLUMN suspension_end_date TIMESTAMPTZ;

-- Step 2: Add constraint for valid account statuses
ALTER TABLE public.users 
ADD CONSTRAINT users_account_status_check 
CHECK (account_status IN ('active', 'deleted', 'suspended'));

-- Step 3: Add indexes for efficient queries
CREATE INDEX idx_users_account_status ON public.users(account_status);
CREATE INDEX idx_users_deleted_at ON public.users(deleted_at);
CREATE INDEX idx_users_deletion_scheduled_at ON public.users(deletion_scheduled_at);
CREATE INDEX idx_users_suspension_end_date ON public.users(suspension_end_date);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.users.account_status IS 'Account status: active, deleted (soft delete), suspended';
COMMENT ON COLUMN public.users.deleted_at IS 'When the account was soft deleted (NULL for active accounts)';
COMMENT ON COLUMN public.users.deletion_scheduled_at IS 'When the account deletion was initiated (for 7-day retention)';
COMMENT ON COLUMN public.users.suspension_end_date IS 'When the account suspension ends (NULL for indefinite or active accounts)';

-- Step 5: Create admin_actions table for audit logging
CREATE TABLE public.admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES public.users(id) NOT NULL,
  target_user_id UUID REFERENCES public.users(id) NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  admin_notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Add RLS policies for admin_actions table
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admin actions"
ON public.admin_actions
FOR SELECT
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can insert admin actions"
ON public.admin_actions
FOR INSERT
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Step 7: Add indexes for admin_actions table
CREATE INDEX idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target_user_id ON public.admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_action ON public.admin_actions(action);
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions(created_at);
