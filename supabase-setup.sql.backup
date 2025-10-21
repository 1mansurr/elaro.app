-- ELARO v1 Supabase Database Setup Script
-- Copy and paste this entire script into your Supabase SQL Editor

-- 1. Create Users Table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  is_subscribed_to_oddity BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Study Sessions Table
CREATE TABLE public.study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  topic TEXT NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  color_label TEXT DEFAULT 'green',
  spaced_repetition_enabled BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Tasks and Events Table
CREATE TABLE public.tasks_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('assignment', 'exam', 'lecture', 'program', 'other')),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  color_label TEXT DEFAULT 'blue',
  repeat_pattern TEXT, -- for lectures: 'daily', 'weekly', 'custom'
  repeat_end_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Spaced Repetition Reminders Table
CREATE TABLE public.reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
  day_number INTEGER NOT NULL, -- 0, 1, 3, 7, 14, 30, 60, 120, 180
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Streaks Tracking Table
-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
-- TODO: Streaks policies were here. Re-add if/when streaks are reintroduced.

-- 7. Create RLS Policies

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Study sessions policies
CREATE POLICY "Users can manage own sessions" ON public.study_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Tasks and events policies
CREATE POLICY "Users can manage own tasks" ON public.tasks_events
  FOR ALL USING (auth.uid() = user_id);

-- Reminders policies
CREATE POLICY "Users can manage own reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id);

-- Streaks policies
-- TODO: Streaks policies were here. Re-add if/when streaks are reintroduced.

-- 8. Create Functions for Automatic User Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create Trigger for New User Registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Create Function to Update Streaks
-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

-- 11. Create Indexes for Performance
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_date ON public.study_sessions(scheduled_date);
CREATE INDEX idx_tasks_events_user_id ON public.tasks_events(user_id);
CREATE INDEX idx_tasks_events_date ON public.tasks_events(due_date);
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_date ON public.reminders(reminder_date);
-- TODO: Streaks table and related logic were here. Re-add if/when streaks are reintroduced.

-- 12. Insert Sample Data (Optional - for testing)
-- Uncomment the lines below if you want sample data for testing

/*
-- Sample user (you'll need to sign up first to get a real auth.users entry)
-- INSERT INTO public.users (id, email, is_subscribed_to_oddity) 
-- VALUES ('your-user-id-here', 'test@example.com', false);

-- Sample study session
-- INSERT INTO public.study_sessions (user_id, course, topic, scheduled_date, spaced_repetition_enabled)
-- VALUES ('your-user-id-here', 'Mathematics', 'Calculus Basics', NOW() + INTERVAL '1 day', true);

-- Sample task
-- INSERT INTO public.tasks_events (user_id, title, type, due_date)
-- VALUES ('your-user-id-here', 'Submit Math Assignment', 'assignment', NOW() + INTERVAL '3 days');
*/

-- Setup Complete!
-- Your ELARO database is now ready to use.
-- Make sure to update your .env file with your Supabase credentials.

