-- This migration serves as an official record that Multi-Factor Authentication (MFA)
-- is an enabled and required architectural component for this project.
-- The actual feature is enabled in the Supabase Dashboard under Authentication > Providers > Email.

-- This migration documents that MFA (aal2) is enabled for this project.
-- Note: Users of the ELARO app have MFA enabled as an architectural requirement.

-- No other schema changes are needed from this script, as Supabase's internal auth.*
-- schema automatically handles MFA tables (like auth.factors) when the feature is used.
