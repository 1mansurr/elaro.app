-- Create the table to store different Spaced Repetition schedules.
CREATE TABLE public.srs_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  intervals INTEGER[] NOT NULL, -- An array of integers representing days
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for the new table
ALTER TABLE public.srs_schedules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read the schedules.
CREATE POLICY "Authenticated users can read SRS schedules"
ON public.srs_schedules
FOR SELECT
TO authenticated
USING (true);

-- Add comprehensive comments
COMMENT ON TABLE public.srs_schedules IS 'Stores different schedules for the Spaced Repetition System.';
COMMENT ON COLUMN public.srs_schedules.intervals IS 'Array of integers representing the reminder interval in days.';
COMMENT ON COLUMN public.srs_schedules.is_default IS 'Indicates which schedule should be used by default for new study sessions.';

-- Insert our default schedule into the new table.
INSERT INTO public.srs_schedules (name, intervals, is_default)
VALUES ('Default', ARRAY[1, 7, 14, 30, 60], TRUE);
