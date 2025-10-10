import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { initSentry, captureException } from '../_shared/sentry.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

// Function to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}


serve(async (req: Request) => {
  initSentry();
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Create a Supabase client with the Auth context of the user that called the function.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    // Get the user from the auth header
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: corsHeaders,
        status: 401,
      });
    }

    // --- MVP LIMIT LOGIC FOR REMINDERS ---
    const REMINDER_LIMIT = 5;
    const oneWeekAgo = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString();
    const { count: weeklyReminders, error: countError } = await supabaseClient
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneWeekAgo);

    if (countError) {
      throw new Error(`Failed to check reminder limit: ${countError.message}`);
    }

    // The function creates 5 reminders at a time for a session.
    const remindersToBeCreated = 5;
    if ((weeklyReminders ?? 0) + remindersToBeCreated > REMINDER_LIMIT) {
      return new Response(JSON.stringify({ error: `Weekly reminder limit of ${REMINDER_LIMIT} exceeded.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }
    // --- END OF MVP LIMIT LOGIC ---

    // --- APPLY THE RATE LIMIT CHECK ---
    try {
      await checkRateLimit(supabaseClient, user.id, 'schedule-reminders');
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 429, // Too Many Requests
          headers: corsHeaders,
        });
      }
      // For other unexpected errors, you might want to log them or handle differently
      console.error('An unexpected error occurred during rate limit check:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id is required' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Fetch the study session to get its details
    const { data: session, error: sessionError } = await supabaseClient
      .from('study_sessions')
      .select('start_date, topic')
      .eq('id', session_id)
      .eq('user_id', user.id) // Ensure the user owns this session
      .single();
    if (sessionError || !session) {
      throw new Error(
        sessionError?.message || 'Study session not found or access denied.',
      );
    }

    // 2. Define the spaced repetition intervals (in days)
    const intervals = [1, 7, 14, 30, 60];
    const sessionStartDate = new Date(session.start_date);

    // 3. Create the reminder objects
    const remindersToInsert = intervals.map(days => {
      const reminderDate = addDays(sessionStartDate, days);
      return {
        user_id: user.id,
        study_session_id: session_id,
        reminder_date: reminderDate.toISOString(),
        // Example title, you can customize this
        title: `Review: ${session.topic}`,
        status: 'scheduled', // Assuming you have a status column
      };
    });

    // 4. Bulk insert the reminders into the database
    const { error: insertError } = await supabaseClient
      .from('reminders')
      .insert(remindersToInsert);
    if (insertError) {
      throw new Error(`Failed to insert reminders: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ message: 'Reminders scheduled successfully' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    captureException(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});
