-- Add lecture support to reminders table
-- This allows reminders to be associated with lectures in addition to study sessions

-- Add lecture_id column to reminders table
ALTER TABLE public.reminders 
ADD COLUMN lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE;

-- Add assignment_id column for future assignment reminders
ALTER TABLE public.reminders 
ADD COLUMN assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE;

-- Add reminder_time column (minutes before the event)
ALTER TABLE public.reminders 
ADD COLUMN reminder_time TIMESTAMPTZ;

-- Add reminder_type column to distinguish between different types of reminders
ALTER TABLE public.reminders 
ADD COLUMN reminder_type TEXT DEFAULT 'study_session' CHECK (reminder_type IN ('study_session', 'lecture', 'assignment'));

-- Update existing reminders to have the correct type
UPDATE public.reminders 
SET reminder_type = 'study_session' 
WHERE session_id IS NOT NULL;

-- Create index for lecture_id lookups
CREATE INDEX idx_reminders_lecture_id ON public.reminders(lecture_id);

-- Create index for assignment_id lookups  
CREATE INDEX idx_reminders_assignment_id ON public.reminders(assignment_id);

-- Create index for reminder_time lookups
CREATE INDEX idx_reminders_reminder_time ON public.reminders(reminder_time);

-- Add comment to document the changes
COMMENT ON TABLE public.reminders IS 'Stores reminders for study sessions, lectures, and assignments. Each reminder can be associated with one type of event.';
