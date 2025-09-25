-- Create a new migration file with this content.

ALTER TABLE public.study_sessions
RENAME COLUMN notes TO description;
