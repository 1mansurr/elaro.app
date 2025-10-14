-- Fix the handle_new_user function to work with the current database schema
-- This function previously tried to insert into a non-existent 'subscriptions' table.
-- This corrected version inserts the user record with the subscription data directly
-- into the 'users' table, matching the current database schema.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insert into the public.users table with subscription data directly
  INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name, 
    subscription_tier, 
    subscription_expires_at
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'oddity', -- Subscription Tier
    now() + interval '7 days' -- Expiration Date
  );
  
  RETURN new;
END;
$function$;
