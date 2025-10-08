-- Add 'university' and 'program' columns to the public.users table
ALTER TABLE public.users
ADD COLUMN university TEXT,
ADD COLUMN program TEXT;
