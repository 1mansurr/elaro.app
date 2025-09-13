-- FILE: supabase/migrations/20250115150000_create_assignments_table.sql
CREATE TABLE public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  submission_method TEXT, -- e.g., 'Online' or 'In-person'
  submission_link TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.assignments IS 'Stores user-created assignments.';

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own assignments" ON public.assignments FOR ALL USING (auth.uid() = user_id);
