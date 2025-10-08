-- Add 'name' and 'username' columns to the public.users table
ALTER TABLE public.users
ADD COLUMN name TEXT,
ADD COLUMN username TEXT;

-- Add a unique constraint to the username column to prevent duplicates.
-- This constraint is crucial for the username system to work correctly.
ALTER TABLE public.users
ADD CONSTRAINT users_username_key UNIQUE (username);
