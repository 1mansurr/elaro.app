// This is a Supabase Edge Function designed to be run on a schedule (cron job).
// To schedule this function to run once daily, use the following command with the Supabase CLI:
// supabase functions deploy cleanup-deleted-items --schedule "0 0 * * *"
//
// This function will:
// 1. Fetch all users.
// 2. For each user, check their subscription tier.
// 3. Permanently delete soft-deleted items older than the defined retention period.
//    - Free users: 48 hours
//    - Premium users: 120 hours

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RETENTION_PERIOD_FREE_HOURS = 48;
const RETENTION_PERIOD_PREMIUM_HOURS = 120;
const TABLES_TO_CLEAN = ['courses', 'assignments', 'lectures', 'study_sessions'];

serve(async (req) => {
  try {
    // Use the Service Role Key for admin-level access to all user data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch all users with their subscription tier
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, subscription_tier');

    if (usersError) throw usersError;

    console.log(`Found ${users.length} users to process.`);

    // 2. Process each user individually
    for (const user of users) {
      const isPremium = user.subscription_tier !== 'free';
      const retentionHours = isPremium ? RETENTION_PERIOD_PREMIUM_HOURS : RETENTION_PERIOD_FREE_HOURS;
      
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - retentionHours);
      const cutoffTimestamp = cutoffDate.toISOString();

      console.log(`Processing user ${user.id} (Premium: ${isPremium}). Deleting items older than ${cutoffTimestamp}`);

      // 3. For each user, iterate through tables and delete old items
      for (const table of TABLES_TO_CLEAN) {
        const { error: deleteError } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null) // Ensure we only touch soft-deleted items
          .lt('deleted_at', cutoffTimestamp); // The core retention logic

        if (deleteError) {
          console.error(`Error cleaning table ${table} for user ${user.id}:`, deleteError.message);
          // Continue to next table/user even if one fails
        }
      }
    }

    return new Response(JSON.stringify({ message: 'Cleanup process completed successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Critical error in cleanup function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
