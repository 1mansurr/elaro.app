-- Create a new migration file to add the end_time column to the lectures table.

ALTER TABLE public.lectures
ADD COLUMN end_time TIMESTAMPTZ;

-- Add a policy to allow users to update their own lectures.
CREATE POLICY "Users can update their own lectures"
ON public.lectures
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
