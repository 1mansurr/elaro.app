# Notification Preferences Migration

## Overview
Updated the `handle_new_user` SQL trigger function to automatically create default notification preferences for every new user upon signup. This ensures data consistency and prevents "no row found" errors when users first visit the settings page.

## Migration File
**File:** `supabase/migrations/20251016200924_add_notification_preferences_to_new_user_trigger.sql`

## What Changed

### Before
The `handle_new_user` function only created a record in the `public.users` table when a new user signed up. This meant that:
- No record existed in `notification_preferences` table for new users
- The app could encounter "no row found" errors when accessing notification settings
- Frontend logic had to handle the case where preferences might not exist

### After
The updated `handle_new_user` function now:
1. Creates a record in `public.users` table (existing behavior)
2. **NEW:** Creates a record in `public.notification_preferences` table with default values
3. Ensures every new user has notification preferences from the moment they sign up

## Benefits

1. **Data Consistency**: Every user is guaranteed to have notification preferences
2. **Better User Experience**: No errors when users first visit settings
3. **Simplified Frontend Logic**: Can assume preferences always exist for logged-in users
4. **System Resilience**: More predictable and robust behavior

## SQL Function Details

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Create a record in public.users
  INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name, 
    subscription_tier, 
    onboarding_completed
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'free', -- Default subscription tier
    false   -- Explicitly set onboarding to false
  );
  
  -- Create a record in public.notification_preferences
  -- This ensures every new user has default notification settings.
  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$function$;
```

## Deployment

To apply this migration:

### Local Development
```bash
supabase db reset
# or
supabase migration up
```

### Production
```bash
supabase db push
```

## Testing

After deploying the migration:

1. **Create a new test user** and verify:
   - Record created in `public.users` table
   - Record created in `public.notification_preferences` table
   - Default notification settings are applied

2. **Check existing users**:
   - Existing users may not have notification preferences
   - Consider creating a data migration to backfill preferences for existing users if needed

3. **Test the Settings screen**:
   - Navigate to Settings as a new user
   - Verify notification settings load without errors
   - Verify default values are displayed correctly

## Notes

- The migration uses `CREATE OR REPLACE FUNCTION` to update the existing trigger function
- The function is marked as `SECURITY DEFINER` to run with elevated privileges
- Default notification preferences are created automatically based on the table's default constraints
- No breaking changes to existing functionality

## Related Files

- `src/features/user-profile/screens/SettingsScreen.tsx` - Settings screen that uses notification preferences
- `src/features/notifications/components/NotificationSettings.tsx` - Notification settings component

