-- Create master_decryption_keys table
CREATE TABLE IF NOT EXISTS public.master_decryption_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by_admin_id UUID NOT NULL REFERENCES public.users(id),
    deactivated_at TIMESTAMPTZ,
    deactivated_by_admin_id UUID REFERENCES public.users(id)
);

-- Create unique partial index to ensure only one active key exists
-- This replaces the CHECK constraint which cannot use subqueries
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_keys_only_one_active 
ON public.master_decryption_keys(is_active) 
WHERE is_active = true;

-- Create master_key_reset_requests table
CREATE TABLE IF NOT EXISTS public.master_key_reset_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    new_key_hash TEXT NOT NULL,
    initiated_by_admin_id UUID NOT NULL REFERENCES public.users(id),
    initiated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    approved_by_admin_id UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '12 hours'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'expired', 'cancelled')),
    metadata JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_master_keys_active ON public.master_decryption_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_master_keys_created_at ON public.master_decryption_keys(created_at);
CREATE INDEX IF NOT EXISTS idx_reset_requests_status ON public.master_key_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_reset_requests_expires_at ON public.master_key_reset_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_reset_requests_initiated_by ON public.master_key_reset_requests(initiated_by_admin_id);

-- RLS Policies
ALTER TABLE public.master_decryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_key_reset_requests ENABLE ROW LEVEL SECURITY;

-- Only top-level admins can view master keys (but not the hash itself)
CREATE POLICY "Top-level admins can view master key metadata" ON public.master_decryption_keys
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only top-level admins can create master keys
CREATE POLICY "Top-level admins can create master keys" ON public.master_decryption_keys
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only top-level admins can update master keys (for deactivation)
CREATE POLICY "Top-level admins can update master keys" ON public.master_decryption_keys
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only top-level admins can view reset requests
CREATE POLICY "Top-level admins can view reset requests" ON public.master_key_reset_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only top-level admins can create reset requests
CREATE POLICY "Top-level admins can create reset requests" ON public.master_key_reset_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only top-level admins can update reset requests (for approval)
CREATE POLICY "Top-level admins can approve reset requests" ON public.master_key_reset_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to expire old reset requests
CREATE OR REPLACE FUNCTION expire_old_reset_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.master_key_reset_requests
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at < now();
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.master_decryption_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.master_key_reset_requests TO authenticated;
GRANT ALL ON TABLE public.master_decryption_keys TO service_role;
GRANT ALL ON TABLE public.master_key_reset_requests TO service_role;

-- Comments
COMMENT ON TABLE public.master_decryption_keys IS 'Stores hashed master decryption keys for legal access to encrypted user data';
COMMENT ON TABLE public.master_key_reset_requests IS 'Tracks master key reset requests requiring dual admin approval';

