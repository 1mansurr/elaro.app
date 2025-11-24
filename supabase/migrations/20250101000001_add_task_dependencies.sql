-- Task Dependencies System
-- This migration implements a comprehensive task dependency system

-- Create task dependencies table
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  depends_on_task_id UUID NOT NULL,
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('blocking', 'suggested', 'parallel')),
  auto_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure task and dependency exist and belong to same user
  CONSTRAINT fk_task_dependencies_task 
    FOREIGN KEY (task_id) REFERENCES public.assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_dependencies_depends_on 
    FOREIGN KEY (depends_on_task_id) REFERENCES public.assignments(id) ON DELETE CASCADE,
  
  -- Prevent self-dependency
  CONSTRAINT check_no_self_dependency 
    CHECK (task_id != depends_on_task_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_type ON public.task_dependencies(dependency_type);

-- Add comments
COMMENT ON TABLE public.task_dependencies IS 'Defines dependencies between tasks - blocking, suggested, or parallel relationships';
COMMENT ON COLUMN public.task_dependencies.dependency_type IS 'Type of dependency: blocking (must complete first), suggested (recommended order), parallel (can be done together)';
COMMENT ON COLUMN public.task_dependencies.auto_complete IS 'Whether to automatically complete dependent task when prerequisite is completed';

-- Enable RLS
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own task dependencies" ON public.task_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments a1 
      WHERE a1.id = task_dependencies.task_id AND a1.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create dependencies for their own tasks" ON public.task_dependencies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a1 
      WHERE a1.id = task_id AND a1.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.assignments a2 
      WHERE a2.id = depends_on_task_id AND a2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own task dependencies" ON public.task_dependencies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.assignments a1 
      WHERE a1.id = task_dependencies.task_id AND a1.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own task dependencies" ON public.task_dependencies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.assignments a1 
      WHERE a1.id = task_dependencies.task_id AND a1.user_id = auth.uid()
    )
  );

-- Create direction dependencies table for lectures and study sessions
CREATE TABLE IF NOT EXISTS public.lecture_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL,
  depends_on_id UUID NOT NULL,
  depends_on_type TEXT NOT NULL CHECK (depends_on_type IN ('assignment', 'lecture', 'study_session')),
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('blocking', 'suggested', 'parallel')),
  auto_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_lecture_dependencies_lecture 
    FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE CASCADE
);

-- Create indexes for lecture dependencies
CREATE INDEX IF NOT EXISTS idx_lecture_dependencies_lecture_id ON public.lecture_dependencies(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_dependencies_depends_on ON public.lecture_dependencies(depends_on_id, depends_on_type);

-- Enable RLS for lecture dependencies
ALTER TABLE public.lecture_dependencies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lecture dependencies
CREATE POLICY "Users can view their own lecture dependencies" ON public.lecture_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lectures l 
      WHERE l.id = lecture_dependencies.lecture_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create dependencies for their own lectures" ON public.lecture_dependencies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lectures l 
      WHERE l.id = lecture_id AND l.user_id = auth.uid()
    )
  );

-- Create study session dependencies table
CREATE TABLE IF NOT EXISTS public.study_session_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_session_id UUID NOT NULL,
  depends_on_id UUID NOT NULL,
  depends_on_type TEXT NOT NULL CHECK (depends_on_type IN ('assignment', 'lecture', 'study_session')),
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('blocking', 'suggested', 'parallel')),
  auto_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_study_session_dependencies_session 
    FOREIGN KEY (study_session_id) REFERENCES public.study_sessions(id) ON DELETE CASCADE
);

-- Create indexes for study session dependencies
CREATE INDEX IF NOT EXISTS idx_study_session_dependencies_session_id ON public.study_session_dependencies(study_session_id);
CREATE INDEX IF NOT EXISTS idx_study_session_dependencies_depends_on ON public.study_session_dependencies(depends_on_id, depends_on_type);

-- Enable RLS for study session dependencies
ALTER TABLE public.study_session_dependencies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for study session dependencies
CREATE POLICY "Users can view their own study session dependencies" ON public.study_session_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.study_sessions s 
      WHERE s.id = study_session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create dependencies for their own study sessions" ON public.study_session_dependencies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_sessions s 
      WHERE s.id = study_session_id AND s.user_id = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_dependencies_updated_at
  BEFORE UPDATE ON public.task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lecture_dependencies_updated_at
  BEFORE UPDATE ON public.lecture_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_session_dependencies_updated_at
  BEFORE UPDATE ON public.study_session_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
