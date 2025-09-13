-- Create the "study_sessions" table
CREATE TABLE public.study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  notes TEXT,
  session_date TIMESTAMPTZ NOT NULL,
  has_spaced_repetition BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.study_sessions IS 'Stores user-created study sessions for specific topics.';

-- Enable Row Level Security
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own study sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id);
