-- Create the "lectures" table
CREATE TABLE public.lectures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  lecture_date TIMESTAMPTZ NOT NULL,
  is_recurring BOOLEAN DEFAULT false NOT NULL,
  recurring_pattern TEXT, -- e.g., 'weekly', 'daily'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.lectures IS 'Stores scheduled lecture sessions for courses.';

-- Enable Row Level Security
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own lectures" ON public.lectures FOR ALL USING (auth.uid() = user_id);
