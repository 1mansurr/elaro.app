-- Create Supabase Storage bucket for log aggregation
-- Note: This requires RLS policies and bucket configuration via Supabase Dashboard
-- Run this SQL to set up the bucket structure

-- Create storage bucket for logs (if not exists)
-- Note: Bucket creation must be done via Supabase Dashboard or Storage API
-- This SQL file documents the bucket configuration

-- Bucket Configuration:
-- - Name: 'logs'
-- - Public: false (private bucket)
-- - File size limit: 10MB
-- - Allowed MIME types: application/x-ndjson, application/json

-- Storage Policies (set via Supabase Dashboard):
-- 1. Service role can upload/download/delete
-- 2. Authenticated users cannot access (logs are system-only)

-- Folder Structure:
-- logs/
--   errors/      (30-day retention)
--     YYYY/
--       MM/
--         DD/
--           HH.jsonl
--   general/     (7-day retention)
--     YYYY/
--       MM/
--         DD/
--           HH.jsonl

-- This migration file is documentation-only
-- Actual bucket creation must be done via Supabase Dashboard:
-- Storage → Create Bucket → Name: 'logs', Private: true

SELECT 'Log storage bucket must be created via Supabase Dashboard. See comments above.' as note;

