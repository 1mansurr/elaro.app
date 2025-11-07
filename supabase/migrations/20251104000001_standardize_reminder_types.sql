-- Convert all 'srs_review' type reminders to 'spaced_repetition'
-- Part of SRS System Fix - Issue #3: Standardize Reminder Types

UPDATE reminders
SET reminder_type = 'spaced_repetition'
WHERE reminder_type = 'srs_review';

-- Add comment
COMMENT ON COLUMN reminders.reminder_type IS 
'Type of reminder: spaced_repetition (SRS), assignment, lecture, etc. Legacy srs_review type has been migrated to spaced_repetition.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Reminder type standardization completed: All srs_review reminders converted to spaced_repetition';
END $$;

