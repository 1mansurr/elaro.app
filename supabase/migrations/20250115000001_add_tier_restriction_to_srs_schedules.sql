-- ELARO DATABASE UPDATE: ADD TIER RESTRICTION TO SRS SCHEDULES
-- This migration adds a tier_restriction column to the srs_schedules table
-- to support different spaced repetition schedules for different subscription tiers

-- Add the new tier_restriction column
ALTER TABLE public.srs_schedules 
ADD COLUMN IF NOT EXISTS tier_restriction TEXT CHECK (tier_restriction IN ('free', 'oddity', 'both'));

-- Update the column comment
COMMENT ON COLUMN public.srs_schedules.tier_restriction IS 'Subscription tier restriction: free, oddity, or both';

-- Remove the current default schedule since we're replacing it with tier-specific ones
DELETE FROM public.srs_schedules WHERE is_default = true;

-- Insert Free tier schedule (3 intervals: 1, 3, 7 days)
INSERT INTO public.srs_schedules (name, intervals, is_default, tier_restriction)
VALUES ('Free Tier', ARRAY[1, 3, 7], false, 'free');

-- Insert Oddity tier schedule (8 intervals: 1, 3, 7, 14, 30, 60, 120, 180 days)
INSERT INTO public.srs_schedules (name, intervals, is_default, tier_restriction)
VALUES ('Oddity Tier', ARRAY[1, 3, 7, 14, 30, 60, 120, 180], true, 'oddity');

-- Verify the inserts
SELECT name, intervals, is_default, tier_restriction 
FROM public.srs_schedules 
ORDER BY tier_restriction;
