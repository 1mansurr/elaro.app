// deno-lint-ignore-file no-explicit-any
// This file is intended to run in the Deno runtime as a Supabase Edge Function.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { initSentry, captureException } from '../_shared/sentry.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';

const CRON_SECRET = Deno.env.get('CRON_SECRET');
const DAYS_TO_KEEP = 30; // We will delete reminders older than 30 days

serve(async (req: Request): Promise<Response> => {
  initSentry();
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  // 1. Check for the secret cron header
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    // 2. Create an admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 3. Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);

    // 4. Perform the deletion
    // We are deleting any reminder that is older than our cutoff date.
    // You could also add a `status` check, e.g., .eq('status', 'completed')
    const { count, error } = await supabaseAdmin
      .from('reminders')
      .delete({ count: 'exact' }) // Use { count: 'exact' } to get the number of deleted rows
      .eq('status', 'completed') // Only delete completed reminders
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to delete old reminders: ${error.message}`);
    }

    const message = `Successfully deleted ${count ?? 0} reminders older than ${DAYS_TO_KEEP} days.`;
    console.log(message);
    return new Response(JSON.stringify({ message }), {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error: unknown) {
    captureException(error);
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error in cleanup function:', errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});
