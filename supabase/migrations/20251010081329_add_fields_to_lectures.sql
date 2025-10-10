-- Add columns to the lectures table to support start time and lecture name
ALTER TABLE public.lectures
ADD COLUMN start_time TIMESTAMPTZ,
ADD COLUMN lecture_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.lectures.start_time IS 'The specific start date and time of the lecture.';
COMMENT ON COLUMN public.lectures.lecture_name IS 'The name of the lecture, e.g., "Introduction to Psychology Lecture".';
