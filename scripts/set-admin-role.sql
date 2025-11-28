-- Set user as top-level admin
-- Run this in Supabase Dashboard → SQL Editor

UPDATE users 
SET role = 'admin' 
WHERE email = 'saymmmohammed265@gmail.com';

-- Verify the update
SELECT id, email, role 
FROM users 
WHERE email = 'saymmmohammed265@gmail.com';

