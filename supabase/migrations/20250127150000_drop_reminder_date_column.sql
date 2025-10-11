-- Drop the redundant reminder_date column and its associated index
-- This completes the cleanup of the inconsistent reminders table schema

-- Step 1: Drop the old index that is associated with the redundant column.
-- We use "IF EXISTS" to make the script safe to re-run.
DROP INDEX IF EXISTS public.idx_reminders_date;

-- Step 2: Drop the redundant column from the reminders table.
ALTER TABLE public.reminders
DROP COLUMN IF EXISTS reminder_date;

-- Update the table comment to reflect the standardized schema
COMMENT ON TABLE public.reminders IS 'Reminders for various tasks. Standardized on reminder_time column.';
