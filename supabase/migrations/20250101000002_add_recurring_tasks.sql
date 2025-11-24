-- Recurring Tasks System
-- This migration implements a comprehensive recurring task system with flexible patterns

-- Create recurring patterns table
CREATE TABLE IF NOT EXISTS public.recurring_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  interval_value INTEGER NOT NULL DEFAULT 1, -- Every X days/weeks/months
  days_of_week INTEGER[] DEFAULT NULL, -- For weekly patterns [0-6] (Sunday-Saturday)
  day_of_month INTEGER DEFAULT NULL, -- For monthly patterns [1-31]
  end_date TIMESTAMPTZ DEFAULT NULL, -- Optional end date
  max_occurrences INTEGER DEFAULT NULL, -- Optional max occurrences
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recurring tasks table
CREATE TABLE IF NOT EXISTS public.recurring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pattern_id UUID NOT NULL REFERENCES public.recurring_patterns(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('assignment', 'lecture', 'study_session')),
  template_data JSONB NOT NULL, -- Template data for creating individual tasks
  is_active BOOLEAN DEFAULT TRUE,
  next_generation_date TIMESTAMPTZ NOT NULL,
  last_generated_at TIMESTAMPTZ DEFAULT NULL,
  total_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create generated tasks tracking table
CREATE TABLE IF NOT EXISTS public.generated_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_task_id UUID NOT NULL REFERENCES public.recurring_tasks(id) ON DELETE CASCADE,
  task_id UUID NOT NULL, -- References the actual task in assignments/lectures/study_sessions
  task_type TEXT NOT NULL CHECK (task_type IN ('assignment', 'lecture', 'study_session')),
  generation_date TIMESTAMPTZ NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user_id ON public.recurring_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_pattern_id ON public.recurring_tasks(pattern_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_next_generation ON public.recurring_tasks(next_generation_date);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_active ON public.recurring_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_recurring_id ON public.generated_tasks(recurring_task_id);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_scheduled_date ON public.generated_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_completed ON public.generated_tasks(is_completed);

-- Add comments
COMMENT ON TABLE public.recurring_patterns IS 'Defines recurring patterns for task generation';
COMMENT ON TABLE public.recurring_tasks IS 'Links users to recurring patterns with task templates';
COMMENT ON TABLE public.generated_tasks IS 'Tracks individual tasks generated from recurring patterns';

COMMENT ON COLUMN public.recurring_patterns.frequency IS 'How often the pattern repeats: daily, weekly, monthly, or custom';
COMMENT ON COLUMN public.recurring_patterns.interval_value IS 'Every X days/weeks/months (e.g., every 2 weeks)';
COMMENT ON COLUMN public.recurring_patterns.days_of_week IS 'Array of days [0-6] for weekly patterns (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN public.recurring_patterns.day_of_month IS 'Day of month [1-31] for monthly patterns';

COMMENT ON COLUMN public.recurring_tasks.template_data IS 'JSON template data used to create individual tasks';
COMMENT ON COLUMN public.recurring_tasks.next_generation_date IS 'When the next task should be generated';
COMMENT ON COLUMN public.recurring_tasks.total_generated IS 'Total number of tasks generated from this recurring task';

-- Enable RLS
ALTER TABLE public.recurring_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recurring_patterns (public patterns can be viewed by all users)
CREATE POLICY "Users can view public recurring patterns" ON public.recurring_patterns
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can create recurring patterns" ON public.recurring_patterns
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can update their own recurring patterns" ON public.recurring_patterns
  FOR UPDATE USING (TRUE);

CREATE POLICY "Users can delete their own recurring patterns" ON public.recurring_patterns
  FOR DELETE USING (TRUE);

-- Create RLS policies for recurring_tasks
CREATE POLICY "Users can view their own recurring tasks" ON public.recurring_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring tasks" ON public.recurring_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring tasks" ON public.recurring_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring tasks" ON public.recurring_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for generated_tasks
CREATE POLICY "Users can view their own generated tasks" ON public.generated_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recurring_tasks rt 
      WHERE rt.id = generated_tasks.recurring_task_id AND rt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own generated tasks" ON public.generated_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recurring_tasks rt 
      WHERE rt.id = generated_tasks.recurring_task_id AND rt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own generated tasks" ON public.generated_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.recurring_tasks rt 
      WHERE rt.id = generated_tasks.recurring_task_id AND rt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own generated tasks" ON public.generated_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.recurring_tasks rt 
      WHERE rt.id = generated_tasks.recurring_task_id AND rt.user_id = auth.uid()
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

CREATE TRIGGER update_recurring_patterns_updated_at
  BEFORE UPDATE ON public.recurring_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_tasks_updated_at
  BEFORE UPDATE ON public.recurring_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate next generation date
CREATE OR REPLACE FUNCTION calculate_next_generation_date(
  p_pattern_id UUID,
  p_current_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  pattern_record RECORD;
  next_date TIMESTAMPTZ;
BEGIN
  -- Get pattern details
  SELECT * INTO pattern_record
  FROM public.recurring_patterns
  WHERE id = p_pattern_id;
  
  IF NOT FOUND THEN
    RETURN p_current_date;
  END IF;
  
  next_date := p_current_date;
  
  CASE pattern_record.frequency
    WHEN 'daily' THEN
      next_date := next_date + (pattern_record.interval_value || ' days')::INTERVAL;
      
    WHEN 'weekly' THEN
      -- For weekly patterns, find the next occurrence based on days_of_week
      IF pattern_record.days_of_week IS NOT NULL AND array_length(pattern_record.days_of_week, 1) > 0 THEN
        -- Find next day of week
        FOR i IN 1..7 LOOP
          next_date := next_date + '1 day'::INTERVAL;
          IF EXTRACT(DOW FROM next_date) = ANY(pattern_record.days_of_week) THEN
            EXIT;
          END IF;
        END LOOP;
      ELSE
        next_date := next_date + (pattern_record.interval_value || ' weeks')::INTERVAL;
      END IF;
      
    WHEN 'monthly' THEN
      IF pattern_record.day_of_month IS NOT NULL THEN
        -- Find next occurrence of the day in the month
        next_date := next_date + '1 month'::INTERVAL;
        next_date := date_trunc('month', next_date) + (pattern_record.day_of_month - 1) || ' days'::INTERVAL;
      ELSE
        next_date := next_date + (pattern_record.interval_value || ' months')::INTERVAL;
      END IF;
      
    WHEN 'custom' THEN
      -- For custom patterns, just add the interval_value as days
      next_date := next_date + (pattern_record.interval_value || ' days')::INTERVAL;
      
    ELSE
      next_date := next_date + '1 day'::INTERVAL;
  END CASE;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate tasks from recurring patterns
CREATE OR REPLACE FUNCTION generate_tasks_from_pattern(
  p_recurring_task_id UUID
) RETURNS INTEGER AS $$
DECLARE
  recurring_record RECORD;
  pattern_record RECORD;
  next_date TIMESTAMPTZ;
  generated_count INTEGER := 0;
  task_data JSONB;
  new_task_id UUID;
BEGIN
  -- Get recurring task details
  SELECT * INTO recurring_record
  FROM public.recurring_tasks
  WHERE id = p_recurring_task_id AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get pattern details
  SELECT * INTO pattern_record
  FROM public.recurring_patterns
  WHERE id = recurring_record.pattern_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Check if we should generate tasks
  IF recurring_record.next_generation_date > NOW() THEN
    RETURN 0;
  END IF;
  
  -- Check end date and max occurrences
  IF pattern_record.end_date IS NOT NULL AND NOW() > pattern_record.end_date THEN
    -- Deactivate the recurring task
    UPDATE public.recurring_tasks SET is_active = FALSE WHERE id = p_recurring_task_id;
    RETURN 0;
  END IF;
  
  IF pattern_record.max_occurrences IS NOT NULL AND recurring_record.total_generated >= pattern_record.max_occurrences THEN
    -- Deactivate the recurring task
    UPDATE public.recurring_tasks SET is_active = FALSE WHERE id = p_recurring_task_id;
    RETURN 0;
  END IF;
  
  -- Calculate next generation date
  next_date := calculate_next_generation_date(pattern_record.id, recurring_record.next_generation_date);
  
  -- Generate the task based on type
  task_data := recurring_record.template_data;
  task_data := jsonb_set(task_data, '{scheduled_date}', to_jsonb(next_date::text));
  
  -- Insert into appropriate table based on task type
  CASE recurring_record.task_type
    WHEN 'assignment' THEN
      INSERT INTO public.assignments (
        user_id,
        course_id,
        title,
        description,
        due_date,
        priority,
        created_at
      ) VALUES (
        recurring_record.user_id,
        (task_data->>'course_id')::UUID,
        task_data->>'title',
        task_data->>'description',
        next_date,
        COALESCE(task_data->>'priority', 'medium'),
        NOW()
      ) RETURNING id INTO new_task_id;
      
    WHEN 'lecture' THEN
      INSERT INTO public.lectures (
        user_id,
        course_id,
        title,
        description,
        start_time,
        end_time,
        location,
        created_at
      ) VALUES (
        recurring_record.user_id,
        (task_data->>'course_id')::UUID,
        task_data->>'title',
        task_data->>'description',
        next_date,
        next_date + '1 hour'::INTERVAL,
        task_data->>'location',
        NOW()
      ) RETURNING id INTO new_task_id;
      
    WHEN 'study_session' THEN
      INSERT INTO public.study_sessions (
        user_id,
        topic,
        description,
        session_date,
        duration_minutes,
        created_at
      ) VALUES (
        recurring_record.user_id,
        task_data->>'topic',
        task_data->>'description',
        next_date,
        COALESCE((task_data->>'duration_minutes')::INTEGER, 60),
        NOW()
      ) RETURNING id INTO new_task_id;
  END CASE;
  
  -- Record the generated task
  INSERT INTO public.generated_tasks (
    recurring_task_id,
    task_id,
    task_type,
    generation_date,
    scheduled_date
  ) VALUES (
    p_recurring_task_id,
    new_task_id,
    recurring_record.task_type,
    NOW(),
    next_date
  );
  
  -- Update recurring task
  UPDATE public.recurring_tasks
  SET 
    next_generation_date = next_date,
    last_generated_at = NOW(),
    total_generated = total_generated + 1
  WHERE id = p_recurring_task_id;
  
  generated_count := 1;
  
  RETURN generated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to process all due recurring tasks
CREATE OR REPLACE FUNCTION process_due_recurring_tasks()
RETURNS INTEGER AS $$
DECLARE
  recurring_record RECORD;
  total_generated INTEGER := 0;
BEGIN
  -- Get all recurring tasks that are due for generation
  FOR recurring_record IN 
    SELECT id FROM public.recurring_tasks
    WHERE is_active = TRUE 
    AND next_generation_date <= NOW()
    ORDER BY next_generation_date ASC
  LOOP
    total_generated := total_generated + generate_tasks_from_pattern(recurring_record.id);
  END LOOP;
  
  RETURN total_generated;
END;
$$ LANGUAGE plpgsql;
