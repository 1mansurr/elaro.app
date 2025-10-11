-- This migration serves as an official record that Multi-Factor Authentication (MFA)
-- is an enabled and required architectural component for this project.
-- The actual feature is enabled in the Supabase Dashboard under Authentication > Providers > Email.

-- This comment makes the architectural decision visible directly in the database schema.
COMMENT ON TABLE auth.users IS 'Users of the ELARO app. MFA (aal2) is enabled for this project.';

-- No other schema changes are needed from this script, as Supabase's internal auth.*
-- schema automatically handles MFA tables (like auth.factors) when the feature is used.
