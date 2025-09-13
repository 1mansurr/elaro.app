import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Helper function to get an authenticated Supabase client
const getSupabaseClient = (req: Request): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! }
      }
    }
  );
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = getSupabaseClient(req);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { course_id, topic, notes, session_date, has_spaced_repetition } = await req.json();

    if (!course_id || !topic || !session_date) {
      return new Response(
        JSON.stringify({ error: 'Course, topic, and date are required.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // TODO: Add logic for weekly task limit (30 tasks total)
    const { data: newSession, error: sessionError } = await supabaseClient
      .from('study_sessions')
      .insert({
        user_id: user.id,
        course_id,
        topic,
        notes,
        session_date,
        has_spaced_repetition,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // If spaced repetition is enabled, invoke the schedule-reminders function
    if (has_spaced_repetition) {
      const { error: reminderError } = await supabaseClient.functions.invoke('schedule-reminders', {
        body: {
          session_id: newSession.id,
          session_date: newSession.session_date,
        },
      });

      if (reminderError) {
        // Log the error but don't fail the whole request, as the session was still created
        console.error('Failed to schedule reminders:', reminderError.message);
      }
    }

    return new Response(
      JSON.stringify(newSession),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
