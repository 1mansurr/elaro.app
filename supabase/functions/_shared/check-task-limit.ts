// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getTaskLimits } from './permissions.ts';

const TASK_TABLES = ['study_sessions', 'lectures', 'assignments'] as const;

/**
 * Checks whether a user has exceeded their monthly task limit.
 * - Window: rolling 30 days
 * - Limit: determined by subscription tier (free: 35, oddity: 80, admin: unlimited)
 * - Counts combined total across assignments + lectures + study_sessions
 *
 * Returns null if the user is within their limit, or a 403/500 Response if not.
 */
export async function checkTaskLimit(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
) {
  // Fetch subscription tier to determine the correct limit
  const { data: userData, error: userError } = await supabaseClient
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    console.error('Error fetching user for task limit check:', userError);
    return new Response(
      JSON.stringify({ error: 'Could not verify user subscription.' }),
      { status: 500 },
    );
  }

  const limits = getTaskLimits(userData.subscription_tier);

  // Admin tier: unlimited
  if (limits.tasks_per_month === -1) return null;

  // Rolling 30-day window
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const oneMonthAgoISO = oneMonthAgo.toISOString();

  let monthlyCount = 0;

  for (const table of TASK_TABLES) {
    const { count, error } = await supabaseClient
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneMonthAgoISO);

    if (error) {
      console.error(`Error counting ${table}:`, error);
      return new Response(
        JSON.stringify({ error: 'Could not verify task limits.' }),
        { status: 500 },
      );
    }
    monthlyCount += count || 0;
  }

  if (monthlyCount >= limits.tasks_per_month) {
    return new Response(
      JSON.stringify({
        error: `You have reached your monthly limit of ${limits.tasks_per_month} tasks.`,
      }),
      { status: 403 },
    );
  }

  // Within limit
  return null;
}
