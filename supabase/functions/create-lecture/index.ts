import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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

    if (!user) throw new Error('Unauthorized');

    const { course_id, lecture_date, is_recurring, recurring_pattern } = await req.json();

    if (!course_id || !lecture_date) {
      return new Response(
        JSON.stringify({ error: 'Course ID and lecture date are required.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // TODO: Add logic for weekly task limit (30 tasks total)
    const { data: newLecture, error } = await supabaseClient
      .from('lectures')
      .insert({
        user_id: user.id,
        course_id,
        lecture_date,
        is_recurring,
        recurring_pattern,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify(newLecture),
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
