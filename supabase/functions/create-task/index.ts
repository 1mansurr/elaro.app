import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { initSentry, captureException } from '../_shared/sentry.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  initSentry();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- MVP LIMIT LOGIC FOR TASKS ---
    const TASK_LIMIT = 14;
    const oneWeekAgo = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString();
    const { count: weeklyTasks, error: countError } = await supabaseClient
      .from('tasks_events') // Assuming this is your tasks table
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneWeekAgo);

    if (countError) {
      throw new Error(`Failed to check task limit: ${countError.message}`);
    }

    if ((weeklyTasks ?? 0) >= TASK_LIMIT) {
      return new Response(JSON.stringify({ error: `Weekly task limit of ${TASK_LIMIT} exceeded.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }
    // --- END OF MVP LIMIT LOGIC ---

    // Now, insert the new task
    const taskData = await req.json();
    const { data: newTask, error: insertError } = await supabaseClient
      .from('tasks_events')
      .insert({ ...taskData, user_id: user.id })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify(newTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (error) {
    captureException(error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 