import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const WEEKLY_TASK_LIMIT = 5; // Renamed for clarity

export async function checkTaskLimit(supabaseClient: SupabaseClient, userId: string ) {
  // NOTE: We are NOT including 'courses' in this limit.
  const tablesToCount = ['study_sessions', 'lectures', 'assignments'];
  let weeklyCount = 0;

  // Calculate the date 7 days ago for a rolling window
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoISO = oneWeekAgo.toISOString();

  for (const table of tablesToCount) {
    const { count, error } = await supabaseClient
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneWeekAgoISO); // <-- ADDED: Only count tasks created in the last 7 days

    if (error) {
      console.error(`Error counting ${table}:`, error);
      return new Response(JSON.stringify({ error: `Could not verify task limits.` }), { status: 500 });
    }
    weeklyCount += count || 0;
  }

  if (weeklyCount >= WEEKLY_TASK_LIMIT) {
    return new Response(JSON.stringify({ 
      error: `You have reached the weekly limit of ${WEEKLY_TASK_LIMIT} new activities.` 
    }), { status: 403 });
  }

  // If limit is not reached, return null (no error)
  return null;
}