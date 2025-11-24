-- Enhanced Template System
-- This migration enhances the existing template system with categories, sharing, and versioning

-- Add new columns to existing task_templates table
ALTER TABLE public.task_templates 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'personal' CHECK (category IN ('academic', 'work', 'personal', 'study', 'project', 'maintenance')),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_template_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT NULL CHECK (rating >= 0 AND rating <= 5),
ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NULL;

-- Create template sharing table
CREATE TABLE IF NOT EXISTS public.template_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'use', 'edit')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique sharing relationships
  UNIQUE(template_id, shared_with_user_id)
);

-- Create template categories table
CREATE TABLE IF NOT EXISTS public.template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#007AFF',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template ratings table
CREATE TABLE IF NOT EXISTS public.template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one rating per user per template
  UNIQUE(template_id, user_id)
);

-- Create template usage tracking table
CREATE TABLE IF NOT EXISTS public.template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('assignment', 'lecture', 'study_session')),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_templates_category ON public.task_templates(category);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_public ON public.task_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_task_templates_usage_count ON public.task_templates(usage_count);
CREATE INDEX IF NOT EXISTS idx_task_templates_rating ON public.task_templates(rating);
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by ON public.task_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_task_templates_tags ON public.task_templates USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_template_shares_template_id ON public.template_shares(template_id);
CREATE INDEX IF NOT EXISTS idx_template_shares_shared_with ON public.template_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_template_ratings_template_id ON public.template_ratings(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON public.template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON public.template_usage(user_id);

-- Add comments
COMMENT ON COLUMN public.task_templates.category IS 'Template category for organization';
COMMENT ON COLUMN public.task_templates.tags IS 'Array of tags for searching and filtering';
COMMENT ON COLUMN public.task_templates.is_public IS 'Whether template is visible to other users';
COMMENT ON COLUMN public.task_templates.version IS 'Template version number';
COMMENT ON COLUMN public.task_templates.parent_template_id IS 'Reference to parent template for inheritance';
COMMENT ON COLUMN public.task_templates.usage_count IS 'Number of times this template has been used';
COMMENT ON COLUMN public.task_templates.rating IS 'Average rating of this template';
COMMENT ON COLUMN public.task_templates.created_by IS 'User who originally created this template';

COMMENT ON TABLE public.template_shares IS 'Tracks template sharing between users';
COMMENT ON TABLE public.template_categories IS 'Predefined template categories';
COMMENT ON TABLE public.template_ratings IS 'User ratings and reviews for templates';
COMMENT ON TABLE public.template_usage IS 'Tracks when and how templates are used';

-- Enable RLS on new tables
ALTER TABLE public.template_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for template_shares
CREATE POLICY "Users can view templates shared with them" ON public.template_shares
  FOR SELECT USING (auth.uid() = shared_with_user_id);

CREATE POLICY "Users can view templates they shared" ON public.template_shares
  FOR SELECT USING (auth.uid() = shared_by_user_id);

CREATE POLICY "Users can share their own templates" ON public.template_shares
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by_user_id AND
    EXISTS (
      SELECT 1 FROM public.task_templates 
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own template shares" ON public.template_shares
  FOR UPDATE USING (auth.uid() = shared_by_user_id);

CREATE POLICY "Users can delete their own template shares" ON public.template_shares
  FOR DELETE USING (auth.uid() = shared_by_user_id);

-- Create RLS policies for template_categories
CREATE POLICY "Everyone can view template categories" ON public.template_categories
  FOR SELECT USING (TRUE);

CREATE POLICY "Only system can manage template categories" ON public.template_categories
  FOR ALL USING (is_system = TRUE);

-- Create RLS policies for template_ratings
CREATE POLICY "Users can view all template ratings" ON public.template_ratings
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can create their own ratings" ON public.template_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" ON public.template_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" ON public.template_ratings
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for template_usage
CREATE POLICY "Users can view their own template usage" ON public.template_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own template usage records" ON public.template_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update existing task_templates RLS policies to include new columns
DROP POLICY IF EXISTS "Users can view their own templates" ON public.task_templates;
CREATE POLICY "Users can view their own templates" ON public.task_templates
  FOR SELECT USING (
    auth.uid() = user_id OR 
    is_public = TRUE OR
    EXISTS (
      SELECT 1 FROM public.template_shares 
      WHERE template_id = task_templates.id AND shared_with_user_id = auth.uid()
    )
  );

-- Create function to update template usage count
CREATE OR REPLACE FUNCTION update_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usage count for the template
  UPDATE public.task_templates 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = NEW.template_id;
  
  -- Update average rating
  UPDATE public.task_templates 
  SET rating = (
    SELECT AVG(rating::DECIMAL) 
    FROM public.template_ratings 
    WHERE template_id = NEW.template_id
  )
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update usage count
CREATE TRIGGER update_template_usage_count_trigger
  AFTER INSERT ON public.template_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_template_usage_count();

-- Create trigger to update rating when ratings change
CREATE TRIGGER update_template_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.template_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_template_usage_count();

-- Insert default template categories
INSERT INTO public.template_categories (name, description, icon, color, is_system) VALUES
  ('academic', 'Academic assignments and coursework', 'book', '#4CAF50', TRUE),
  ('work', 'Work-related tasks and projects', 'briefcase', '#2196F3', TRUE),
  ('personal', 'Personal tasks and activities', 'person', '#FF9800', TRUE),
  ('study', 'Study sessions and learning activities', 'school', '#9C27B0', TRUE),
  ('project', 'Project management and planning', 'folder', '#607D8B', TRUE),
  ('maintenance', 'Maintenance and routine tasks', 'build', '#795548', TRUE);

-- Create function to create template from task
CREATE OR REPLACE FUNCTION create_template_from_task(
  p_task_id UUID,
  p_task_type TEXT,
  p_template_name TEXT,
  p_description TEXT DEFAULT '',
  p_category TEXT DEFAULT 'personal',
  p_tags TEXT[] DEFAULT '{}',
  p_is_public BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  new_template_id UUID;
  task_data JSONB;
BEGIN
  -- Get task data based on type
  CASE p_task_type
    WHEN 'assignment' THEN
      SELECT to_jsonb(a.*) INTO task_data
      FROM public.assignments a
      WHERE a.id = p_task_id AND a.user_id = auth.uid();
      
    WHEN 'lecture' THEN
      SELECT to_jsonb(l.*) INTO task_data
      FROM public.lectures l
      WHERE l.id = p_task_id AND l.user_id = auth.uid();
      
    WHEN 'study_session' THEN
      SELECT to_jsonb(s.*) INTO task_data
      FROM public.study_sessions s
      WHERE s.id = p_task_id AND s.user_id = auth.uid();
      
    ELSE
      RAISE EXCEPTION 'Invalid task type: %', p_task_type;
  END CASE;
  
  IF task_data IS NULL THEN
    RAISE EXCEPTION 'Task not found or access denied';
  END IF;
  
  -- Create template
  INSERT INTO public.task_templates (
    user_id,
    template_name,
    task_type,
    template_data,
    description,
    category,
    tags,
    is_public,
    created_by
  ) VALUES (
    auth.uid(),
    p_template_name,
    p_task_type,
    task_data,
    p_description,
    p_category,
    p_tags,
    p_is_public,
    auth.uid()
  ) RETURNING id INTO new_template_id;
  
  RETURN new_template_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to create task from template
CREATE OR REPLACE FUNCTION create_task_from_template(
  p_template_id UUID,
  p_customizations JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  template_record RECORD;
  new_task_id UUID;
  task_data JSONB;
BEGIN
  -- Get template data
  SELECT * INTO template_record
  FROM public.task_templates
  WHERE id = p_template_id AND (
    user_id = auth.uid() OR 
    is_public = TRUE OR
    EXISTS (
      SELECT 1 FROM public.template_shares 
      WHERE template_id = p_template_id AND shared_with_user_id = auth.uid()
    )
  );
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or access denied';
  END IF;
  
  -- Merge template data with customizations
  task_data := template_record.template_data || p_customizations;
  
  -- Remove fields that shouldn't be copied
  task_data := task_data - 'id' - 'user_id' - 'created_at' - 'updated_at' - 'deleted_at';
  
  -- Create task based on type
  CASE template_record.task_type
    WHEN 'assignment' THEN
      INSERT INTO public.assignments (
        user_id,
        course_id,
        title,
        description,
        due_date,
        priority
      ) VALUES (
        auth.uid(),
        (task_data->>'course_id')::UUID,
        task_data->>'title',
        task_data->>'description',
        (task_data->>'due_date')::TIMESTAMPTZ,
        COALESCE(task_data->>'priority', 'medium')
      ) RETURNING id INTO new_task_id;
      
    WHEN 'lecture' THEN
      INSERT INTO public.lectures (
        user_id,
        course_id,
        title,
        description,
        start_time,
        end_time,
        location
      ) VALUES (
        auth.uid(),
        (task_data->>'course_id')::UUID,
        task_data->>'title',
        task_data->>'description',
        (task_data->>'start_time')::TIMESTAMPTZ,
        (task_data->>'end_time')::TIMESTAMPTZ,
        task_data->>'location'
      ) RETURNING id INTO new_task_id;
      
    WHEN 'study_session' THEN
      INSERT INTO public.study_sessions (
        user_id,
        topic,
        description,
        session_date,
        duration_minutes
      ) VALUES (
        auth.uid(),
        task_data->>'topic',
        task_data->>'description',
        (task_data->>'session_date')::TIMESTAMPTZ,
        COALESCE((task_data->>'duration_minutes')::INTEGER, 60)
      ) RETURNING id INTO new_task_id;
  END CASE;
  
  -- Record template usage
  INSERT INTO public.template_usage (
    template_id,
    user_id,
    task_id,
    task_type
  ) VALUES (
    p_template_id,
    auth.uid(),
    new_task_id,
    template_record.task_type
  );
  
  RETURN new_task_id;
END;
$$ LANGUAGE plpgsql;
