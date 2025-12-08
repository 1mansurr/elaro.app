-- Add venue column to lectures table
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS venue TEXT;

-- Add comment for documentation
COMMENT ON COLUMN lectures.venue IS 'Location or venue for the lecture (e.g., Room 404, Main Building)';

