-- Step 1: Rename the existing 'name' column to 'first_name'.
ALTER TABLE public.users
RENAME COLUMN name TO first_name;

-- Step 2: Add the new 'last_name' column.
ALTER TABLE public.users
ADD COLUMN last_name TEXT;

-- Step 3: Update the handle_new_user function to populate both new columns.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Insert into the public.users table, now populating first_name and last_name.
  insert into public.users (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );

  -- The subscription logic remains unchanged.
  insert into public.subscriptions (user_id, subscription_tier, subscription_status, subscription_expires_at)
  values (new.id, 'oddity', 'trialing', now() + interval '7 days');
  
  return new;
end;
$function$;
