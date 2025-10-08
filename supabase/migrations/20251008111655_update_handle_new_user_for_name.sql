-- Update the handle_new_user function to pull the first_name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Insert into the public.users table, now including the 'name'
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'first_name');

  -- The rest of the function (inserting into subscriptions) remains the same.
  insert into public.subscriptions (user_id, subscription_tier, subscription_status, subscription_expires_at)
  values (new.id, 'oddity', 'trialing', now() + interval '7 days');
  
  return new;
end;
$function$;
