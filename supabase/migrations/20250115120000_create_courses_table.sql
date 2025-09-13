-- Create the "courses" table
CREATE TABLE public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_name TEXT NOT NULL,
  course_code TEXT,
  about_course TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Add comments to the columns
COMMENT ON COLUMN public.courses.course_name IS 'The name or title of the course.';
COMMENT ON COLUMN public.courses.course_code IS 'The official code for the course (e.g., CS101), optional.';
COMMENT ON COLUMN public.courses.about_course IS 'A brief description or notes about the course, optional.';
COMMENT ON COLUMN public.courses.deleted_at IS 'Timestamp when the course was soft deleted. NULL means active, timestamp means deleted.';

-- Enable Row Level Security
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own courses" ON public.courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own courses" ON public.courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own courses" ON public.courses FOR DELETE USING (auth.uid() = user_id);
