-- Migration: Implement streak update logic
-- This migration adds the streak update function and trigger for study session completion

-- Create the streaks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    longest_streak INTEGER DEFAULT 0 NOT NULL,
    last_activity_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on streaks table
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for streaks
CREATE POLICY "Users can view their own streaks" ON public.streaks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks" ON public.streaks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks" ON public.streaks
    FOR UPDATE USING (auth.uid() = user_id);

-- This function handles the logic for updating a user's streak.
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
    user_id_input UUID := NEW.user_id; -- Get the user ID from the NEW record
    last_activity_date DATE;
    streak_row public.streaks;
BEGIN
    -- Find the user's streak record
    SELECT * INTO streak_row FROM public.streaks WHERE user_id = user_id_input;
    
    -- If the user has no streak record yet, create one.
    IF streak_row IS NULL THEN
        INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_activity_date)
        VALUES (user_id_input, 1, 1, CURRENT_DATE);
        RETURN NEW;
    END IF;
    
    -- Get the date of the last activity
    last_activity_date := streak_row.last_activity_date;
    
    -- Case 1: User was active yesterday. Increment the streak.
    IF last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN
        UPDATE public.streaks
        SET current_streak = streak_row.current_streak + 1,
            longest_streak = GREATEST(streak_row.longest_streak, streak_row.current_streak + 1),
            last_activity_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE user_id = user_id_input;
    
    -- Case 2: User was already active today. Do nothing.
    ELSIF last_activity_date = CURRENT_DATE THEN
        -- Do nothing, streak is already up-to-date for today.
        RETURN NEW;
    
    -- Case 3: User missed a day. Reset the streak to 1.
    ELSE
        UPDATE public.streaks
        SET current_streak = 1,
            last_activity_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE user_id = user_id_input;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger calls the update_user_streak function when a study session is marked as complete.
CREATE TRIGGER on_study_session_complete
    AFTER UPDATE ON public.study_sessions
    FOR EACH ROW
    WHEN (NEW.completed = true AND OLD.completed = false)
    EXECUTE PROCEDURE public.update_user_streak();

-- Add comment to document the trigger
COMMENT ON TRIGGER on_study_session_complete ON public.study_sessions IS 
    'Automatically updates user streak when a study session is marked as complete'; 